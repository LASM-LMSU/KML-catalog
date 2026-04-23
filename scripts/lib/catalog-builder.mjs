import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { XMLParser } from "fast-xml-parser";

const XML = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

const EARTH_RADIUS_METERS = 6_378_137;
const IGNORED_DIRS = new Set([".git", ".github", "dist", "node_modules", "public"]);

/**
 * @typedef {[number, number]} Coordinate
 * @typedef {[number, number, number, number]} BBox
 */

/**
 * @param {string} value
 */
function normalizePath(value) {
  return value.split(sep).join("/");
}

/**
 * @param {string} value
 */
function toDateLabel(value) {
  if (!/^\d{6}$/.test(value)) {
    throw new Error(`Invalid YYMMDD value: ${value}`);
  }

  const yy = Number(value.slice(0, 2));
  const mm = value.slice(2, 4);
  const dd = value.slice(4, 6);
  const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;

  return `${fullYear}-${mm}-${dd}`;
}

/**
 * @param {string} value
 */
function toTimeLabel(value) {
  if (!/^\d{6}$/.test(value)) {
    throw new Error(`Invalid HHMMSS value: ${value}`);
  }

  return `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}`;
}

/**
 * @param {string} baseName
 */
export function parseCatalogFilename(baseName) {
  const match = baseName.match(
    /^(?<catalogPrefix>[A-Z]+)_(?<platformCode>\d+)_(?<trackCode>\d+)_(?<collectionCode>\d+)_(?<sceneCode>\d+)_(?<passCode>\d+)_(?<relatedSceneCode>\d+)_(?<overlayCode>\d+)_(?<revision>\d+)_(?<sensor>SAR-[A-Z0-9]+)_(?<date>\d{6})_(?<time>\d{6})(?<quicklook>_ql)?$/,
  );

  if (!match?.groups) {
    throw new Error(`Unsupported file name format: ${baseName}`);
  }

  const acquiredOn = toDateLabel(match.groups.date);
  const acquiredAt = toTimeLabel(match.groups.time);

  return {
    catalogPrefix: match.groups.catalogPrefix,
    platformCode: match.groups.platformCode,
    trackCode: match.groups.trackCode,
    collectionCode: match.groups.collectionCode,
    sceneCode: match.groups.sceneCode,
    passCode: match.groups.passCode,
    relatedSceneCode: match.groups.relatedSceneCode,
    overlayCode: match.groups.overlayCode,
    revision: match.groups.revision,
    sensor: match.groups.sensor,
    acquiredOn,
    acquiredAt,
    acquiredAtSort: `${acquiredOn}T${acquiredAt}`,
    variant: match.groups.quicklook ? "quicklook" : "standard",
  };
}

/**
 * @param {string} relativePath
 */
export function parseBatchDate(relativePath) {
  const match = relativePath.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * @param {string} coordinatesText
 * @returns {Coordinate[]}
 */
export function parseLatLonQuad(coordinatesText) {
  const coordinates = coordinatesText
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").slice(0, 2).map(Number));

  if (coordinates.length < 4 || coordinates.some((pair) => pair.length !== 2 || Number.isNaN(pair[0]) || Number.isNaN(pair[1]))) {
    throw new Error(`Invalid gx:LatLonQuad coordinates: ${coordinatesText}`);
  }

  const ring = /** @type {Coordinate[]} */ (coordinates);
  const [firstLon, firstLat] = ring[0];
  const [lastLon, lastLat] = ring[ring.length - 1];

  if (firstLon !== lastLon || firstLat !== lastLat) {
    ring.push([firstLon, firstLat]);
  }

  return ring;
}

/**
 * @param {Coordinate[]} ring
 * @returns {BBox}
 */
export function getBBox(ring) {
  const vertices = ring.slice(0, -1);
  const longitudes = vertices.map(([lon]) => lon);
  const latitudes = vertices.map(([, lat]) => lat);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

/**
 * @param {Coordinate[]} ring
 * @returns {Coordinate}
 */
export function getCentroid(ring) {
  const vertices = ring.slice(0, -1);
  const { lon, lat } = vertices.reduce(
    (acc, [pointLon, pointLat]) => ({
      lon: acc.lon + pointLon,
      lat: acc.lat + pointLat,
    }),
    { lon: 0, lat: 0 },
  );

  return [
    Number((lon / vertices.length).toFixed(6)),
    Number((lat / vertices.length).toFixed(6)),
  ];
}

/**
 * Chamberlain-Duquette spherical polygon area approximation.
 * @param {Coordinate[]} ring
 */
export function getAreaKm2(ring) {
  let sum = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lon1, lat1] = ring[index];
    const [lon2, lat2] = ring[index + 1];

    let delta = ((lon2 - lon1) * Math.PI) / 180;
    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    }
    if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }

    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    sum += delta * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  return Number(Math.abs((sum * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2 / 1_000_000).toFixed(2));
}

/**
 * @param {string} xmlContent
 */
export function parseKmlContent(xmlContent) {
  const parsed = XML.parse(xmlContent);
  const overlay = parsed?.kml?.Document?.GroundOverlay;

  if (!overlay) {
    throw new Error("GroundOverlay is missing in KML document");
  }

  const coordinatesText = overlay["gx:LatLonQuad"]?.coordinates;
  if (!coordinatesText) {
    throw new Error("gx:LatLonQuad/coordinates is missing in KML document");
  }

  const ring = parseLatLonQuad(coordinatesText);

  return {
    overlayName: overlay.name ?? null,
    iconHref: overlay.Icon?.href ?? null,
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
    bbox: getBBox(ring),
    centroid: getCentroid(ring),
    areaKm2: getAreaKm2(ring),
  };
}

/**
 * @param {string} rootDir
 * @param {string} currentDir
 * @param {string[]} files
 */
function collectKmlFiles(rootDir, currentDir, files) {
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      collectKmlFiles(rootDir, join(currentDir, entry.name), files);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".kml")) {
      files.push(relative(rootDir, join(currentDir, entry.name)));
    }
  }
}

/**
 * @param {string} rootDir
 */
export function discoverKmlFiles(rootDir) {
  /** @type {string[]} */
  const files = [];
  collectKmlFiles(rootDir, rootDir, files);
  return files.sort((left, right) => left.localeCompare(right));
}

/**
 * @param {number} value
 */
function round(value) {
  return Number(value.toFixed(2));
}

/**
 * @param {string[]} files
 * @param {string} rootDir
 */
export function buildCatalog(rootDir, files = discoverKmlFiles(rootDir)) {
  const records = files.map((relativePath) => {
    const absolutePath = resolve(rootDir, relativePath);
    const rawKml = readFileSync(absolutePath, "utf8");
    const baseName = basename(relativePath, ".kml");
    const fileMeta = parseCatalogFilename(baseName);
    const geometryMeta = parseKmlContent(rawKml);
    const sourceDirectory = dirname(relativePath) === "." ? "" : normalizePath(dirname(relativePath));
    const batchDate = parseBatchDate(relativePath);
    const sitePath = `catalog-source/${normalizePath(relativePath)}`;
    const previewPath = geometryMeta.iconHref && existsSync(resolve(dirname(absolutePath), geometryMeta.iconHref))
      ? normalizePath(relative(rootDir, resolve(dirname(absolutePath), geometryMeta.iconHref)))
      : null;

    return {
      id: baseName,
      title: geometryMeta.overlayName ?? `${fileMeta.sensor} / ${fileMeta.acquiredOn} ${fileMeta.acquiredAt}`,
      searchText: [
        baseName,
        fileMeta.sensor,
        fileMeta.variant,
        fileMeta.platformCode,
        fileMeta.trackCode,
        fileMeta.collectionCode,
        fileMeta.sceneCode,
        fileMeta.relatedSceneCode,
        fileMeta.overlayCode,
        fileMeta.acquiredOn,
        batchDate ?? "",
      ]
        .join(" ")
        .toLowerCase(),
      sourceDirectory,
      sourcePath: normalizePath(relativePath),
      sitePath,
      previewPath,
      batchDate,
      ...fileMeta,
      ...geometryMeta,
    };
  });

  records.sort((left, right) => {
    if (left.acquiredAtSort === right.acquiredAtSort) {
      return left.id.localeCompare(right.id);
    }

    return right.acquiredAtSort.localeCompare(left.acquiredAtSort);
  });

  const batchCounts = {};
  const sensorCounts = {};
  const trackCounts = {};
  const platformCounts = {};
  const variantCounts = {};
  let areaKm2Total = 0;

  for (const record of records) {
    const batchKey = record.batchDate ?? "unspecified";
    batchCounts[batchKey] = (batchCounts[batchKey] ?? 0) + 1;
    sensorCounts[record.sensor] = (sensorCounts[record.sensor] ?? 0) + 1;
    trackCounts[record.trackCode] = (trackCounts[record.trackCode] ?? 0) + 1;
    platformCounts[record.platformCode] = (platformCounts[record.platformCode] ?? 0) + 1;
    variantCounts[record.variant] = (variantCounts[record.variant] ?? 0) + 1;
    areaKm2Total += record.areaKm2;
  }

  const bounds = records.reduce(
    (acc, record) => [
      Math.min(acc[0], record.bbox[0]),
      Math.min(acc[1], record.bbox[1]),
      Math.max(acc[2], record.bbox[2]),
      Math.max(acc[3], record.bbox[3]),
    ],
    /** @type {BBox} */ ([Infinity, Infinity, -Infinity, -Infinity]),
  );

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    total: records.length,
    bounds,
    stats: {
      areaKm2Total: round(areaKm2Total),
      areaKm2Average: records.length ? round(areaKm2Total / records.length) : 0,
      earliestAcquiredOn: records[records.length - 1]?.acquiredOn ?? null,
      latestAcquiredOn: records[0]?.acquiredOn ?? null,
      batchCounts,
      sensorCounts,
      trackCounts,
      platformCounts,
      variantCounts,
    },
    records,
  };
}

/**
 * @param {string} rootDir
 * @param {string[]} files
 */
export function writeCatalogArtifacts(rootDir, files = discoverKmlFiles(rootDir)) {
  const publicDir = resolve(rootDir, "public");
  const dataDir = join(publicDir, "data");
  const sourceDir = join(publicDir, "catalog-source");

  rmSync(dataDir, { recursive: true, force: true });
  rmSync(sourceDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });

  for (const relativePath of files) {
    const sourcePath = resolve(rootDir, relativePath);
    const targetPath = resolve(sourceDir, relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }

  const catalog = buildCatalog(rootDir, files);
  writeFileSync(join(dataDir, "catalog.json"), JSON.stringify(catalog, null, 2));

  return catalog;
}

/**
 * @param {string} rootDir
 */
export function assertRepositoryState(rootDir) {
  if (!statSync(rootDir).isDirectory()) {
    throw new Error(`Repository root does not exist: ${rootDir}`);
  }
}
