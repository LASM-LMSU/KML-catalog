import test from "node:test";
import assert from "node:assert/strict";
import { getAreaKm2, parseCatalogFilename, parseKmlContent, parseLatLonQuad } from "../scripts/lib/catalog-builder.mjs";

test("parseCatalogFilename extracts quicklook metadata", () => {
  const parsed = parseCatalogFilename("KFKA_0069_0307_0001_04450_1_04450_33_01_SAR-2A_251224_190735_ql");

  assert.equal(parsed.sensor, "SAR-2A");
  assert.equal(parsed.variant, "quicklook");
  assert.equal(parsed.platformCode, "0069");
  assert.equal(parsed.trackCode, "0307");
  assert.equal(parsed.acquiredOn, "2025-12-24");
  assert.equal(parsed.acquiredAt, "19:07:35");
});

test("parseLatLonQuad closes the polygon ring", () => {
  const ring = parseLatLonQuad("159.880297,53.822453 160.157672,53.891352 159.857378,54.310709 159.577664,54.241121");

  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[4]);
});

test("parseKmlContent extracts overlay geometry and metadata", () => {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>KFKA</name>
    <GroundOverlay>
      <name>Sample overlay</name>
      <Icon>
        <href>sample_ql.jpg</href>
      </Icon>
      <gx:LatLonQuad>
        <coordinates>10,55 11,55 11,56 10,56</coordinates>
      </gx:LatLonQuad>
    </GroundOverlay>
  </Document>
</kml>`;

  const parsed = parseKmlContent(kml);

  assert.equal(parsed.overlayName, "Sample overlay");
  assert.equal(parsed.iconHref, "sample_ql.jpg");
  assert.equal(parsed.geometry.type, "Polygon");
  assert.equal(parsed.geometry.coordinates[0].length, 5);
  assert.deepEqual(parsed.bbox, [10, 55, 11, 56]);
});

test("getAreaKm2 returns a positive area for a compact quad", () => {
  const area = getAreaKm2([
    [10, 55],
    [11, 55],
    [11, 56],
    [10, 56],
    [10, 55],
  ]);

  assert.ok(area > 0);
});

