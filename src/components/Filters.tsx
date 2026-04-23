import type { CatalogFilters } from "../types";

type FilterOptions = {
  sensors: string[];
  variants: string[];
  tracks: string[];
  batches: { value: string; label: string }[];
};

type FiltersProps = {
  filters: CatalogFilters;
  options: FilterOptions;
  onChange: (next: CatalogFilters) => void;
  onReset: () => void;
  onFitToSelection: () => void;
  canReset: boolean;
};

function setFilter<T extends keyof CatalogFilters>(filters: CatalogFilters, key: T, value: CatalogFilters[T]) {
  return { ...filters, [key]: value };
}

export function Filters({ filters, options, onChange, onReset, onFitToSelection, canReset }: FiltersProps) {
  return (
    <section className="panel filters-panel">
      <div className="filters-header">
        <div>
          <p className="eyebrow">Поиск и фасеты</p>
          <h2>Фильтрация</h2>
        </div>
        <div className="filters-actions">
          <button
            className="button button-ghost"
            type="button"
            onClick={onFitToSelection}
          >
            Подогнать карту
          </button>
          <button
            className="button button-muted"
            type="button"
            onClick={onReset}
            disabled={!canReset}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <label className="field field-search">
          <span>Быстрый поиск</span>
          <input
            type="search"
            placeholder="ID, сенсор, трек, дата, номер наложения"
            value={filters.query}
            onChange={(event) => onChange(setFilter(filters, "query", event.target.value))}
          />
        </label>

        <label className="field">
          <span>Сенсор</span>
          <select
            value={filters.sensor}
            onChange={(event) => onChange(setFilter(filters, "sensor", event.target.value))}
          >
            <option value="all">Все</option>
            {options.sensors.map((sensor) => (
              <option
                key={sensor}
                value={sensor}
              >
                {sensor}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Вариант</span>
          <select
            value={filters.variant}
            onChange={(event) => onChange(setFilter(filters, "variant", event.target.value))}
          >
            <option value="all">Все</option>
            {options.variants.map((variant) => (
              <option
                key={variant}
                value={variant}
              >
                {variant === "quicklook" ? "quicklook" : "standard"}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Трек</span>
          <select
            value={filters.trackCode}
            onChange={(event) => onChange(setFilter(filters, "trackCode", event.target.value))}
          >
            <option value="all">Все</option>
            {options.tracks.map((track) => (
              <option
                key={track}
                value={track}
              >
                {track}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Партия загрузки</span>
          <select
            value={filters.batchDate}
            onChange={(event) => onChange(setFilter(filters, "batchDate", event.target.value))}
          >
            <option value="all">Все</option>
            {options.batches.map((batch) => (
              <option
                key={batch.value}
                value={batch.value}
              >
                {batch.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Дата от</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onChange(setFilter(filters, "dateFrom", event.target.value))}
          />
        </label>

        <label className="field">
          <span>Дата до</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => onChange(setFilter(filters, "dateTo", event.target.value))}
          />
        </label>

        <label className="field">
          <span>Сортировка</span>
          <select
            value={filters.sort}
            onChange={(event) => onChange(setFilter(filters, "sort", event.target.value as CatalogFilters["sort"]))}
          >
            <option value="newest">Новые сначала</option>
            <option value="oldest">Старые сначала</option>
            <option value="largest">Самые большие покрытия</option>
            <option value="smallest">Самые маленькие покрытия</option>
          </select>
        </label>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={filters.visibleOnly}
          onChange={(event) => onChange(setFilter(filters, "visibleOnly", event.target.checked))}
        />
        <span>Показывать только объекты в текущем окне карты</span>
      </label>
    </section>
  );
}

