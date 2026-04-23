import type { CatalogRecord } from "../types";
import { formatArea, formatCoordinate, formatDate } from "../lib/format";

type DetailsPanelProps = {
  record: CatalogRecord | null;
};

function infoRow(label: string, value: string) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function DetailsPanel({ record }: DetailsPanelProps) {
  if (!record) {
    return (
      <section className="panel details-panel">
        <p className="eyebrow">Карточка записи</p>
        <h2>Выберите покрытие</h2>
        <p>Кликните по полигону на карте или по записи в правой колонке, чтобы открыть детали и ссылку на исходный KML.</p>
      </section>
    );
  }

  return (
    <section className="panel details-panel">
      <div className="details-header">
        <div>
          <p className="eyebrow">Карточка записи</p>
          <h2>{record.id}</h2>
        </div>
        <a
          className="button button-accent"
          href={`./${encodeURI(record.sitePath)}`}
          download
        >
          Скачать KML
        </a>
      </div>

      <div className="details-intro">
        <span className="chip chip-accent">{record.sensor}</span>
        <span className="chip">{record.variant === "quicklook" ? "quicklook" : "standard"}</span>
        <span className="chip">overlay {record.overlayCode}</span>
      </div>

      <dl className="details-grid">
        {infoRow("Дата съемки", `${formatDate(record.acquiredOn)} · ${record.acquiredAt}`)}
        {infoRow("Площадь покрытия", `${formatArea(record.areaKm2)} км²`)}
        {infoRow("Центр", `${formatCoordinate(record.centroid[1], true)} / ${formatCoordinate(record.centroid[0])}`)}
        {infoRow("Партия загрузки", record.batchDate ?? "без даты")}
        {infoRow("Префикс", record.catalogPrefix)}
        {infoRow("Код платформы", record.platformCode)}
        {infoRow("Код трека", record.trackCode)}
        {infoRow("Код набора", record.collectionCode)}
        {infoRow("Код сцены", record.sceneCode)}
        {infoRow("Связанный кадр", record.relatedSceneCode)}
        {infoRow("Проход", record.passCode)}
        {infoRow("Ревизия", record.revision)}
        {infoRow("Путь в репозитории", record.sourcePath)}
        {infoRow("Файл quicklook", record.iconHref ?? "не указан")}
      </dl>
    </section>
  );
}

