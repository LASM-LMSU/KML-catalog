import type { CatalogRecord } from "../types";
import { formatArea, formatDate } from "../lib/format";

type RecordListProps = {
  records: CatalogRecord[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export function RecordList({ records, selectedId, hoveredId, onSelect, onHover }: RecordListProps) {
  if (!records.length) {
    return (
      <section className="panel list-panel empty-state">
        <p className="eyebrow">Результаты</p>
        <h2>Ничего не найдено</h2>
        <p>Снимите часть фильтров или подвиньте карту, если включен отбор по видимой области.</p>
      </section>
    );
  }

  return (
    <section className="panel list-panel">
      <div className="list-header">
        <div>
          <p className="eyebrow">Результаты</p>
          <h2>{records.length} записей</h2>
        </div>
      </div>

      <div className="record-list">
        {records.map((record) => {
          const isSelected = record.id === selectedId;
          const isHovered = record.id === hoveredId;

          return (
            <button
              key={record.id}
              className={`record-card${isSelected ? " is-selected" : ""}${isHovered ? " is-hovered" : ""}`}
              type="button"
              onClick={() => onSelect(record.id)}
              onMouseEnter={() => onHover(record.id)}
              onMouseLeave={() => onHover(null)}
            >
              <div className="record-card-top">
                <span className="chip chip-accent">{record.sensor}</span>
                <span className="chip">{record.variant === "quicklook" ? "quicklook" : "standard"}</span>
                <span className="chip">трек {record.trackCode}</span>
              </div>

              <h3>{record.id}</h3>

              <dl className="record-meta">
                <div>
                  <dt>Дата съемки</dt>
                  <dd>
                    {formatDate(record.acquiredOn)} · {record.acquiredAt}
                  </dd>
                </div>
                <div>
                  <dt>Площадь</dt>
                  <dd>{formatArea(record.areaKm2)} км²</dd>
                </div>
                <div>
                  <dt>Партия</dt>
                  <dd>{record.batchDate ?? "без даты"}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}

