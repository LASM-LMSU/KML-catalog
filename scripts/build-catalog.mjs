import { resolve } from "node:path";
import { assertRepositoryState, discoverKmlFiles, writeCatalogArtifacts } from "./lib/catalog-builder.mjs";

const rootDir = resolve(process.cwd());

assertRepositoryState(rootDir);

const files = discoverKmlFiles(rootDir);
const catalog = writeCatalogArtifacts(rootDir, files);

console.log(
  [
    `catalog entries: ${catalog.total}`,
    `latest acquisition: ${catalog.stats.latestAcquiredOn ?? "n/a"}`,
    `tracks: ${Object.keys(catalog.stats.trackCounts).length}`,
    `output: public/data/catalog.json`,
  ].join(" | "),
);
