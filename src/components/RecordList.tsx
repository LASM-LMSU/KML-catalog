import { EyeIcon, EyeOffIcon, LayersIcon } from "./Icons";
import type { CatalogRecord } from "../types";
import { formatArea, formatDate } from "../lib/format";

type RecordListProps = {
  records: CatalogRecord[];
  hiddenIds: ReadonlySet<string>;
  selectedId: string | null;
  hoveredId: string | null;
  visibleCount: number;
  onHideAllMatched: () => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onShowAllCatalog: () => void;
  onShowAllMatched: () => void;
  onToggleHidden: (id: string) => void;
};

export function RecordList({
  records,
  hiddenIds,
  selectedId,
  hoveredId,
  visibleCount,
  onHideAllMatched,
  onSelect,
  onHover,
  onShowAllCatalog,
  onShowAllMatched,
  onToggleHidden,
}: RecordListProps) {
  if (!records.length) {
    return (
      <section className="list-panel drawer-panel empty-state">
        <p className="eyebrow">Результаты</p>
        <h2>Ничего не найдено</h2>
        <p>Снимите часть фильтров или подвиньте карту, если включен отбор по видимой области.</p>
      </section>
    );
  }

  return (
    <section className="list-panel drawer-panel">
      <div className="list-header">
        <div>
          <p className="eyebrow">Результаты</p>
          <h2>{records.length} записей</h2>
          <p className="drawer-copy-compact">
            {visibleCount} отображаются на карте, {records.length - visibleCount} скрыты вручную.
          </p>
        </div>
      </div>

      <div className="list-bulk-actions">
        <button
          className="button button-ghost button-compact"
          type="button"
          onClick={onShowAllMatched}
        >
          <EyeIcon className="button-icon" />
          Показать выборку
        </button>
        <button
          className="button button-muted button-compact"
          type="button"
          onClick={onHideAllMatched}
        >
          <EyeOffIcon className="button-icon" />
          Скрыть выборку
        </button>
        <button
          className="button button-muted button-compact"
          type="button"
          onClick={onShowAllCatalog}
        >
          <LayersIcon className="button-icon" />
          Сбросить скрытие
        </button>
      </div>

      <div className="record-table-head">
        <span>ID сцены</span>
        <span>Сенсор</span>
        <span>Съемка</span>
        <span>Площадь / партия</span>
        <span>Видимость</span>
      </div>

      <div className="record-table-scroll">
        <div className="record-list record-list-compact">
          {records.map((record) => {
            const isSelected = record.id === selectedId;
            const isHovered = record.id === hoveredId;
            const isHidden = hiddenIds.has(record.id);
            const sensorLabel = `${record.sensor} · ${record.variant === "quicklook" ? "QL" : "STD"} · ${record.trackCode}`;
            const acquiredLabel = `${formatDate(record.acquiredOn)} · ${record.acquiredAt}`;
            const areaLabel = `${formatArea(record.areaKm2)} км² · ${record.batchDate ?? "без даты"}`;

            return (
              <div
                key={record.id}
                className={`record-row${isSelected ? " is-selected" : ""}${isHovered ? " is-hovered" : ""}${isHidden ? " is-hidden" : ""}`}
                onMouseEnter={() => onHover(record.id)}
                onMouseLeave={() => onHover(null)}
              >
                <button
                  className="record-row-main"
                  type="button"
                  onClick={() => onSelect(record.id)}
                >
                  <span
                    className="record-row-id"
                    title={record.id}
                  >
                    {record.id}
                  </span>
                  <span
                    className="record-row-cell record-row-meta"
                    title={sensorLabel}
                  >
                    {sensorLabel}
                  </span>
                  <span
                    className="record-row-cell"
                    title={acquiredLabel}
                  >
                    {acquiredLabel}
                  </span>
                  <span
                    className="record-row-cell"
                    title={areaLabel}
                  >
                    {areaLabel}
                  </span>
                </button>

                <div className="record-row-actions">
                  <button
                    className={`inline-toggle${isHidden ? " is-off" : ""}`}
                    type="button"
                    onClick={() => onToggleHidden(record.id)}
                    aria-label={isHidden ? `Показать ${record.id}` : `Скрыть ${record.id}`}
                    title={isHidden ? "Показать на карте" : "Скрыть с карты"}
                  >
                    {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
