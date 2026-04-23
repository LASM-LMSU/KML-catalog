import type { BBox, CatalogFilters, CatalogRecord } from "../types";

export function intersectsBounds(bounds: BBox, visibleBounds: BBox) {
  return !(
    bounds[2] < visibleBounds[0] ||
    bounds[0] > visibleBounds[2] ||
    bounds[3] < visibleBounds[1] ||
    bounds[1] > visibleBounds[3]
  );
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function filterRecords(records: CatalogRecord[], filters: CatalogFilters, visibleBounds: BBox | null) {
  const query = normalizeQuery(filters.query);

  const filtered = records.filter((record) => {
    if (query && !record.searchText.includes(query)) {
      return false;
    }

    if (filters.sensor !== "all" && record.sensor !== filters.sensor) {
      return false;
    }

    if (filters.variant !== "all" && record.variant !== filters.variant) {
      return false;
    }

    if (filters.trackCode !== "all" && record.trackCode !== filters.trackCode) {
      return false;
    }

    if (filters.batchDate !== "all" && (record.batchDate ?? "unspecified") !== filters.batchDate) {
      return false;
    }

    if (filters.dateFrom && record.acquiredOn < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && record.acquiredOn > filters.dateTo) {
      return false;
    }

    if (filters.visibleOnly && visibleBounds && !intersectsBounds(record.bbox, visibleBounds)) {
      return false;
    }

    return true;
  });

  filtered.sort((left, right) => {
    switch (filters.sort) {
      case "oldest":
        return left.acquiredAtSort.localeCompare(right.acquiredAtSort);
      case "largest":
        return right.areaKm2 - left.areaKm2;
      case "smallest":
        return left.areaKm2 - right.areaKm2;
      case "newest":
      default:
        return right.acquiredAtSort.localeCompare(left.acquiredAtSort);
    }
  });

  return filtered;
}

export function isDefaultFilters(filters: CatalogFilters) {
  return (
    filters.query === "" &&
    filters.sensor === "all" &&
    filters.variant === "all" &&
    filters.trackCode === "all" &&
    filters.batchDate === "all" &&
    filters.dateFrom === "" &&
    filters.dateTo === "" &&
    filters.sort === "newest" &&
    filters.visibleOnly === false
  );
}

