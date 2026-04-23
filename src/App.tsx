import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { Filters } from "./components/Filters";
import { CatalogMap } from "./components/CatalogMap";
import { RecordList } from "./components/RecordList";
import { DetailsPanel } from "./components/DetailsPanel";
import { Timeline } from "./components/Timeline";
import { CalendarIcon, CloseIcon, DownloadIcon, FilterIcon, FocusIcon, InfoIcon, LayersIcon, SearchIcon } from "./components/Icons";
import { loadCatalog } from "./lib/catalog";
import { filterRecords, isDefaultFilters } from "./lib/filtering";
import { formatDate, formatGeneratedAt } from "./lib/format";
import type { BBox, CatalogData, CatalogFilters, CatalogRecord, CatalogTimePeriod } from "./types";

const DEFAULT_FILTERS: CatalogFilters = {
  query: "",
  sensor: "all",
  variant: "all",
  trackCode: "all",
  batchDate: "all",
  dateFrom: "",
  dateTo: "",
  timePeriods: [],
  sort: "newest",
  visibleOnly: false,
};

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function getActiveFilterCount(filters: CatalogFilters) {
  let count = 0;

  if (filters.query.trim()) {
    count += 1;
  }
  if (filters.sensor !== "all") {
    count += 1;
  }
  if (filters.variant !== "all") {
    count += 1;
  }
  if (filters.trackCode !== "all") {
    count += 1;
  }
  if (filters.batchDate !== "all") {
    count += 1;
  }
  if (filters.dateFrom) {
    count += 1;
  }
  if (filters.dateTo) {
    count += 1;
  }
  if (filters.timePeriods.length) {
    count += 1;
  }
  if (filters.sort !== "newest") {
    count += 1;
  }
  if (filters.visibleOnly) {
    count += 1;
  }

  return count;
}

function downloadRecordFiles(records: CatalogRecord[]) {
  records.forEach((record) => {
    const link = document.createElement("a");
    link.href = `./${encodeURI(record.sitePath)}`;
    link.download = record.sitePath.split("/").pop() ?? `${record.id}.kml`;
    document.body.append(link);
    link.click();
    link.remove();
  });
}

type ToolbarButtonProps = {
  active?: boolean;
  badge?: number | string;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function ToolbarButton({ active = false, badge, children, disabled = false, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      className={`toolbar-button${active ? " is-active" : ""}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <span className="toolbar-icon">{children}</span>
      <span className="toolbar-label">{label}</span>
      {badge !== undefined ? <span className="toolbar-badge">{badge}</span> : null}
    </button>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<"light" | "satellite">("light");
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<BBox | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"list" | "details">("list");

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
  const matchedRecords = catalog ? filterRecords(catalog.records, effectiveFilters, visibleBounds) : [];
  const timelineRecords = catalog
    ? filterRecords(catalog.records, { ...effectiveFilters, dateFrom: "", dateTo: "", timePeriods: [] }, visibleBounds)
    : [];
  const visibleRecords = matchedRecords.filter((record) => !hiddenIds.has(record.id));

  useEffect(() => {
    setBulkSelectedIds((current) => {
      if (!current.size) {
        return current;
      }

      const matchedIds = new Set(matchedRecords.map((record) => record.id));
      let changed = false;
      const next = new Set<string>();

      current.forEach((id) => {
        if (matchedIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [matchedRecords]);

  useEffect(() => {
    if (!matchedRecords.length) {
      if (selectedId) {
        setSelectedId(null);
      }
      return;
    }

    if (selectedId && (!matchedRecords.some((record) => record.id === selectedId) || hiddenIds.has(selectedId))) {
      setSelectedId(null);
    }
  }, [hiddenIds, matchedRecords, selectedId]);

  if (error) {
    return (
      <main className="app-shell">
        <section className="panel-chrome error-panel">
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
        <section className="panel-chrome loading-panel">
          <p className="eyebrow">Инициализация</p>
          <h1>Собираю индекс каталога</h1>
          <p>После генерации `catalog.json` интерфейс загрузит карту, фильтры и карточки покрытий.</p>
        </section>
      </main>
    );
  }

  const selectedRecord =
    visibleRecords.find((record) => record.id === selectedId) ??
    catalog.records.find((record) => record.id === selectedId) ??
    null;

  const sensors = unique(catalog.records.map((record) => record.sensor));
  const variants = unique(catalog.records.map((record) => record.variant));
  const tracks = unique(catalog.records.map((record) => record.trackCode));
  const batches = unique(catalog.records.map((record) => record.batchDate ?? "unspecified")).map((value) => ({
    value,
    label: value === "unspecified" ? "без даты" : value,
  }));
  const activeFilterCount = getActiveFilterCount(filters);
  const bulkSelectedRecords = matchedRecords.filter((record) => bulkSelectedIds.has(record.id));
  const bulkSelectedCount = bulkSelectedRecords.length;
  const allMatchedSelected = matchedRecords.length > 0 && bulkSelectedCount === matchedRecords.length;
  const hideMatched = () => {
    const ids = matchedRecords.map((record) => record.id);
    setHiddenIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });

    if (selectedId && ids.includes(selectedId)) {
      setSelectedId(null);
    }
  };
  const showMatched = () => {
    setHiddenIds((current) => {
      const next = new Set(current);
      matchedRecords.forEach((record) => next.delete(record.id));
      return next;
    });
  };
  const showAllCatalog = () => {
    setHiddenIds(new Set());
  };
  const applyTimelinePeriod = (period: CatalogTimePeriod) => {
    setFilters((current) => ({ ...current, dateFrom: "", dateTo: "", timePeriods: [period] }));
  };
  const addTimelinePeriod = (period: CatalogTimePeriod) => {
    setFilters((current) => {
      const exists = current.timePeriods.some((existing) => existing.start === period.start && existing.end === period.end);

      return {
        ...current,
        dateFrom: "",
        dateTo: "",
        timePeriods: exists ? current.timePeriods : [...current.timePeriods, period],
      };
    });
  };
  const removeTimelinePeriod = (index: number) => {
    setFilters((current) => ({
      ...current,
      timePeriods: current.timePeriods.filter((_, periodIndex) => periodIndex !== index),
    }));
  };
  const clearTimeFilters = () => {
    setFilters((current) => ({ ...current, dateFrom: "", dateTo: "", timePeriods: [] }));
  };
  const clearBulkSelection = () => {
    setBulkSelectedIds(new Set());
  };
  const toggleBulkSelected = (id: string) => {
    setBulkSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const toggleAllMatchedSelected = () => {
    if (allMatchedSelected) {
      setBulkSelectedIds(new Set());
      return;
    }

    setBulkSelectedIds(new Set(matchedRecords.map((record) => record.id)));
  };
  const hideBulkSelected = () => {
    if (!bulkSelectedCount) {
      return;
    }

    const ids = bulkSelectedRecords.map((record) => record.id);
    setHiddenIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });

    if (selectedId && ids.includes(selectedId)) {
      setSelectedId(null);
    }
  };
  const showBulkSelected = () => {
    if (!bulkSelectedCount) {
      return;
    }

    setHiddenIds((current) => {
      const next = new Set(current);
      bulkSelectedRecords.forEach((record) => next.delete(record.id));
      return next;
    });
  };
  const downloadBulkSelected = () => {
    if (!bulkSelectedCount) {
      return;
    }

    downloadRecordFiles(bulkSelectedRecords);
  };
  const selectFromList = (id: string) => {
    setHiddenIds((current) => {
      if (!current.has(id)) {
        return current;
      }

      const next = new Set(current);
      next.delete(id);
      return next;
    });

    setSelectedId(id);
  };
  const toggleRecordHidden = (id: string) => {
    setHiddenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    if (selectedId === id) {
      setSelectedId(null);
    }
  };
  const closeDrawers = () => {
    setFiltersOpen(false);
    setInspectorOpen(false);
  };
  const openList = () => {
    setInspectorTab("list");
    setInspectorOpen(true);
  };
  const openDetails = () => {
    if (!selectedRecord) {
      return;
    }
    setInspectorTab("details");
    setInspectorOpen(true);
  };

  return (
    <main className="app-shell app-shell-map">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <CatalogMap
        basemap={basemap}
        records={visibleRecords}
        selectedId={selectedId}
        hoveredId={hoveredId}
        onSelect={setSelectedId}
        onBoundsChange={setVisibleBounds}
        fitRequest={fitRequest}
      />

      <button
        className={`app-backdrop${filtersOpen || inspectorOpen ? " is-visible" : ""}`}
        type="button"
        aria-label="Закрыть открытые панели"
        onClick={closeDrawers}
      />

      <header className="hud panel-chrome">
        <div className="hud-brand">
          <div className="brand-badge">K</div>
          <div className="brand-copy">
            <strong>Каталог снимков ЛАКМ МГУ</strong>
            <span>Статический archive-first интерфейс поверх KML-охватов</span>
          </div>
        </div>

        <label className="hud-search">
          <SearchIcon className="search-icon" />
          <input
            type="search"
            placeholder="Поиск по ID, сенсору, треку, дате, overlay"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          />
        </label>

        <div className="hud-pills">
          <span className="hud-pill">
            <LayersIcon className="hud-pill-icon" />
            {visibleRecords.length} видимы · {matchedRecords.length} в выборке
          </span>
          <span className="hud-pill">
            <CalendarIcon className="hud-pill-icon" />
            {formatDate(catalog.stats.latestAcquiredOn)}
          </span>
          <span className="hud-pill hud-pill-wide">UTC {formatGeneratedAt(catalog.generatedAt)}</span>
        </div>
      </header>

      <nav className="map-toolbar panel-chrome">
        <div className="toolbar-segmented">
          <button
            className={`segmented-button${basemap === "light" ? " is-active" : ""}`}
            type="button"
            onClick={() => setBasemap("light")}
          >
            Карта
          </button>
          <button
            className={`segmented-button${basemap === "satellite" ? " is-active" : ""}`}
            type="button"
            onClick={() => setBasemap("satellite")}
          >
            Спутник
          </button>
        </div>

        <ToolbarButton
          active={filtersOpen}
          badge={activeFilterCount || undefined}
          label="Фильтры"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <FilterIcon />
        </ToolbarButton>
        <ToolbarButton
          active={inspectorOpen && inspectorTab === "list"}
          badge={matchedRecords.length}
          label="Список"
          onClick={openList}
        >
          <LayersIcon />
        </ToolbarButton>
        <ToolbarButton
          active={inspectorOpen && inspectorTab === "details"}
          label="Детали"
          onClick={openDetails}
          disabled={!selectedRecord}
        >
          <InfoIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Подогнать"
          onClick={() => setFitRequest((value) => value + 1)}
        >
          <FocusIcon />
        </ToolbarButton>
      </nav>

      {selectedRecord ? (
        <section className="selection-context panel-chrome">
          <div className="selection-copy">
            <p className="eyebrow">Выбрано на карте</p>
            <h2>{selectedRecord.id}</h2>
            <p>
              {selectedRecord.sensor} · {formatDate(selectedRecord.acquiredOn)} · трек {selectedRecord.trackCode}
            </p>
          </div>
          <div className="selection-actions">
            <button
              className="button button-ghost"
              type="button"
              onClick={openDetails}
            >
              <InfoIcon className="button-icon" />
              Детали
            </button>
            <a
              className="button button-muted"
              href={`./${encodeURI(selectedRecord.sitePath)}`}
              download
            >
              <DownloadIcon className="button-icon" />
              KML
            </a>
          </div>
        </section>
      ) : null}

      <Timeline
        activeRecords={matchedRecords}
        filters={filters}
        records={timelineRecords}
        onAddPeriod={addTimelinePeriod}
        onApplyPeriod={applyTimelinePeriod}
        onClearTime={clearTimeFilters}
        onRemovePeriod={removeTimelinePeriod}
      />

      <aside className={`drawer drawer-left${filtersOpen ? " is-open" : ""}`}>
        <div className="drawer-frame panel-chrome">
          <div className="drawer-header">
            <div>
              <p className="eyebrow">Левая панель</p>
              <h2>Фильтрация</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Закрыть фильтры"
            >
              <CloseIcon />
            </button>
          </div>
          <Filters
            filters={filters}
            options={{ sensors, variants, tracks, batches }}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            onFitToSelection={() => setFitRequest((value) => value + 1)}
            canReset={!isDefaultFilters(filters)}
          />
        </div>
      </aside>

      <aside className={`drawer drawer-right${inspectorOpen ? " is-open" : ""}`}>
        <div className="drawer-frame panel-chrome">
          <div className="drawer-header">
            <div className="drawer-tabs">
              <button
                className={`drawer-tab${inspectorTab === "list" ? " is-active" : ""}`}
                type="button"
                onClick={() => setInspectorTab("list")}
              >
                <LayersIcon className="drawer-tab-icon" />
                Сцены
              </button>
              <button
                className={`drawer-tab${inspectorTab === "details" ? " is-active" : ""}`}
                type="button"
                onClick={() => setInspectorTab("details")}
                disabled={!selectedRecord}
              >
                <InfoIcon className="drawer-tab-icon" />
                Детали
              </button>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setInspectorOpen(false)}
              aria-label="Закрыть правую панель"
            >
              <CloseIcon />
            </button>
          </div>

          {inspectorTab === "list" ? (
            <RecordList
              records={matchedRecords}
              bulkSelectedIds={bulkSelectedIds}
              bulkSelectedCount={bulkSelectedCount}
              hiddenIds={hiddenIds}
              allMatchedSelected={allMatchedSelected}
              selectedId={selectedId}
              hoveredId={hoveredId}
              visibleCount={visibleRecords.length}
              onBulkDownload={downloadBulkSelected}
              onBulkHide={hideBulkSelected}
              onBulkSelectionClear={clearBulkSelection}
              onBulkSelectionToggleAll={toggleAllMatchedSelected}
              onBulkShow={showBulkSelected}
              onHideAllMatched={hideMatched}
              onSelect={(id) => {
                selectFromList(id);
                setInspectorTab("details");
              }}
              onHover={setHoveredId}
              onShowAllCatalog={showAllCatalog}
              onShowAllMatched={showMatched}
              onToggleBulkSelected={toggleBulkSelected}
              onToggleHidden={toggleRecordHidden}
            />
          ) : (
            <DetailsPanel record={selectedRecord} />
          )}
        </div>
      </aside>
    </main>
  );
}
