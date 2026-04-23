export type BBox = [number, number, number, number];
export type Coordinate = [number, number];

export type CatalogRecord = {
  id: string;
  title: string;
  searchText: string;
  sourceDirectory: string;
  sourcePath: string;
  sitePath: string;
  previewPath: string | null;
  batchDate: string | null;
  catalogPrefix: string;
  platformCode: string;
  trackCode: string;
  collectionCode: string;
  sceneCode: string;
  passCode: string;
  relatedSceneCode: string;
  overlayCode: string;
  revision: string;
  sensor: string;
  acquiredOn: string;
  acquiredAt: string;
  acquiredAtSort: string;
  variant: "quicklook" | "standard";
  overlayName: string | null;
  iconHref: string | null;
  geometry: {
    type: "Polygon";
    coordinates: Coordinate[][];
  };
  bbox: BBox;
  centroid: Coordinate;
  areaKm2: number;
};

export type CatalogData = {
  schemaVersion: number;
  generatedAt: string;
  total: number;
  bounds: BBox;
  stats: {
    areaKm2Total: number;
    areaKm2Average: number;
    earliestAcquiredOn: string | null;
    latestAcquiredOn: string | null;
    batchCounts: Record<string, number>;
    sensorCounts: Record<string, number>;
    trackCounts: Record<string, number>;
    platformCounts: Record<string, number>;
    variantCounts: Record<string, number>;
  };
  records: CatalogRecord[];
};

export type CatalogTimePeriod = {
  start: string;
  end: string;
};

export type CatalogFilters = {
  query: string;
  sensor: string;
  variant: string;
  trackCode: string;
  batchDate: string;
  dateFrom: string;
  dateTo: string;
  timePeriods: CatalogTimePeriod[];
  sort: "newest" | "oldest" | "largest" | "smallest";
  visibleOnly: boolean;
};
