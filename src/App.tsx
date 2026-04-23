import { useDeferredValue, useEffect, useState } from "react";
import { Hero } from "./components/Hero";
import { Filters } from "./components/Filters";
import { CatalogMap } from "./components/CatalogMap";
import { RecordList } from "./components/RecordList";
import { DetailsPanel } from "./components/DetailsPanel";
import { loadCatalog } from "./lib/catalog";
import { filterRecords, isDefaultFilters } from "./lib/filtering";
import type { BBox, CatalogData, CatalogFilters } from "./types";

const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  sensor: "all",
  variant: "all",
  trackCode: "all",
  batchDate: "all",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
  visibleOnly: false,
};

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<BBox | null>(null);
  const [fitRequest, setFitRequest] = useState(0);

  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCatalog(data);
      })
      .catch((loadError: Error) => {
        if (cancelled) {
          return;
        }

        setError(loadError.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = { ...filters, query: deferredQuery };
  const filteredRecords = catalog ? filterRecords(catalog.records, effectiveFilters, visibleBounds) : [];

  useEffect(() => {
    if (!filteredRecords.length) {
      if (selectedId) {
        setSelectedId(null);
      }
      return;
    }

    if (!selectedId || !filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedId]);

  if (error) {
    return (
      <main className="app-shell">
        <section className="panel error-panel">
          <p className="eyebrow">Ошибка загрузки</p>
          <h1>Каталог не удалось инициализировать</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="app-shell">
        <section className="panel loading-panel">
          <p className="eyebrow">Инициализация</p>
          <h1>Собираю индекс каталога</h1>
          <p>После генерации `catalog.json` интерфейс загрузит карту, фильтры и карточки покрытий.</p>
        </section>
      </main>
    );
  }

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ??
    catalog.records.find((record) => record.id === selectedId) ??
    null;

  const sensors = unique(catalog.records.map((record) => record.sensor));
  const variants = unique(catalog.records.map((record) => record.variant));
  const tracks = unique(catalog.records.map((record) => record.trackCode));
  const batches = unique(catalog.records.map((record) => record.batchDate ?? "unspecified")).map((value) => ({
    value,
    label: value === "unspecified" ? "без даты" : value,
  }));

  return (
    <main className="app-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <Hero
        catalog={catalog}
        filteredRecords={filteredRecords}
      />

      <Filters
        filters={filters}
        options={{ sensors, variants, tracks, batches }}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onFitToSelection={() => setFitRequest((value) => value + 1)}
        canReset={!isDefaultFilters(filters)}
      />

      <section className="content-grid">
        <div className="content-main">
          <CatalogMap
            records={filteredRecords}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            onBoundsChange={setVisibleBounds}
            fitRequest={fitRequest}
          />
        </div>

        <div className="content-side">
          <DetailsPanel record={selectedRecord} />
          <RecordList
            records={filteredRecords}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
        </div>
      </section>
    </main>
  );
}

