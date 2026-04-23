import type { CatalogData, CatalogRecord } from "../types";
import { formatArea, formatDate, formatGeneratedAt } from "../lib/format";

type HeroProps = {
  catalog: CatalogData;
  filteredRecords: CatalogRecord[];
};

export function Hero({ catalog, filteredRecords }: HeroProps) {
  return (
    <section className="hero panel">
      <div className="hero-copy">
        <p className="eyebrow">LASM MSU / Static Coverage Catalog</p>
        <h1>Каталог охватов ЛАКМ МГУ (лаборатории аэрокосмических снимков)</h1>
        <p className="hero-lead">
          Статический каталог KML-охватов для GitHub Pages. Данные приводятся к единому JSON-индексу на этапе сборки,
          поэтому сайт остается быстрым даже при росте архива.
        </p>
        <div className="hero-badges">
          <span className="chip chip-accent">GitHub Pages ready</span>
          <span className="chip">Build-time KML ingest</span>
          <span className="chip">Map-first discovery</span>
        </div>
      </div>

      <div className="hero-stats">
        <article className="stat-card">
          <span className="stat-label">Сцен в каталоге</span>
          <strong>{catalog.total}</strong>
          <small>{filteredRecords.length} по текущим фильтрам</small>
        </article>
        <article className="stat-card">
          <span className="stat-label">Суммарная площадь сцен</span>
          <strong>{formatArea(catalog.stats.areaKm2Total)} км²</strong>
          <small>сумма по отдельным контурам, без вычитания пересечений</small>
        </article>
        <article className="stat-card">
          <span className="stat-label">Окно съемки</span>
          <strong>{formatDate(catalog.stats.latestAcquiredOn)}</strong>
          <small>с {formatDate(catalog.stats.earliestAcquiredOn)}</small>
        </article>
        <article className="stat-card">
          <span className="stat-label">Обновление индекса</span>
          <strong>{formatGeneratedAt(catalog.generatedAt)}</strong>
          <small>время UTC</small>
        </article>
      </div>
    </section>
  );
}
