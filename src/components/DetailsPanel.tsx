import type { CatalogRecord } from "../types";
import { formatArea, formatCoordinate, formatDate } from "../lib/format";
import { DownloadIcon, InfoIcon, LayersIcon } from "./Icons";

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
      <section className="details-panel drawer-panel">
        <p className="eyebrow">Карточка записи</p>
        <h2>Выберите покрытие</h2>
        <p>Клик по полигону выделяет сцену. Детали и скачивание исходного `KML` открываются здесь, без отдельной страницы.</p>
      </section>
    );
  }

  return (
    <section className="details-panel drawer-panel">
      <div className="details-header">
        <div>
          <p className="eyebrow">Карточка записи</p>
          <h2>{record.id}</h2>
        </div>
        <a
          className="button button-accent"
          href={`./${encodeURI(record.sitePath)}`}
          download
          aria-label={`Скачать KML ${record.id}`}
          title="Скачать KML"
        >
          <DownloadIcon className="button-icon" />
          <span className="button-label-mobile-hidden">Скачать KML</span>
        </a>
      </div>

      <div className="details-intro">
        <span className="chip chip-accent">{record.sensor}</span>
        <span className="chip">{record.variant === "quicklook" ? "quicklook" : "standard"}</span>
        <span className="chip">overlay {record.overlayCode}</span>
      </div>

      <details
        className="accordion"
        open
      >
        <summary>
          <span className="accordion-title">
            <InfoIcon className="accordion-icon" />
            Ключевые поля
          </span>
        </summary>
        <dl className="details-grid">
          {infoRow("Дата съемки", `${formatDate(record.acquiredOn)} · ${record.acquiredAt}`)}
          {infoRow("Площадь покрытия", `${formatArea(record.areaKm2)} км²`)}
          {infoRow("Центр", `${formatCoordinate(record.centroid[1], true)} / ${formatCoordinate(record.centroid[0])}`)}
          {infoRow("Партия загрузки", record.batchDate ?? "без даты")}
        </dl>
      </details>

      <details className="accordion">
        <summary>
          <span className="accordion-title">
            <LayersIcon className="accordion-icon" />
            Технические коды
          </span>
        </summary>
        <dl className="details-grid">
          {infoRow("Префикс", record.catalogPrefix)}
          {infoRow("Код платформы", record.platformCode)}
          {infoRow("Код трека", record.trackCode)}
          {infoRow("Код набора", record.collectionCode)}
          {infoRow("Код сцены", record.sceneCode)}
          {infoRow("Связанный кадр", record.relatedSceneCode)}
          {infoRow("Проход", record.passCode)}
          {infoRow("Ревизия", record.revision)}
        </dl>
      </details>

      <details className="accordion">
        <summary>
          <span className="accordion-title">
            <DownloadIcon className="accordion-icon" />
            Файлы и источник
          </span>
        </summary>
        <dl className="details-grid">
          {infoRow("Путь в репозитории", record.sourcePath)}
          {infoRow("Файл quicklook", record.iconHref ?? "не указан")}
        </dl>
      </details>
    </section>
  );
}
