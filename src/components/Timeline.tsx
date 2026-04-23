import { type CSSProperties, type FormEvent, useState } from "react";
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon } from "./Icons";
import type { CatalogFilters, CatalogRecord, CatalogTimePeriod } from "../types";

type TimelineProps = {
  activeRecords: CatalogRecord[];
  collapsed: boolean;
  filters: CatalogFilters;
  records: CatalogRecord[];
  onAddPeriod: (period: CatalogTimePeriod) => void;
  onApplyPeriod: (period: CatalogTimePeriod) => void;
  onClearTime: () => void;
  onRemovePeriod: (index: number) => void;
  onToggleCollapsed: () => void;
};

type TimelineUnit = "quarter-hour" | "hour" | "day" | "month" | "year";

type TimelineBin = {
  activeCount: number;
  count: number;
  end: number;
  label: string;
  start: number;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const unitNames: Record<TimelineUnit, string> = {
  "quarter-hour": "15 минут",
  hour: "часы",
  day: "дни",
  month: "месяцы",
  year: "годы",
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toInputValue(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeInput(value: string, end = false) {
  if (!value) {
    return "";
  }

  if (!value.includes("T")) {
    return `${value}T${end ? "23:59" : "00:00"}`;
  }

  return value.slice(0, 16);
}

function toTime(value: string) {
  return new Date(value).getTime();
}

function chooseUnit(spanMs: number): TimelineUnit {
  if (spanMs <= 6 * HOUR_MS) {
    return "quarter-hour";
  }

  if (spanMs <= 48 * HOUR_MS) {
    return "hour";
  }

  if (spanMs <= 120 * DAY_MS) {
    return "day";
  }

  if (spanMs <= 1460 * DAY_MS) {
    return "month";
  }

  return "year";
}

function floorToUnit(timestamp: number, unit: TimelineUnit) {
  const date = new Date(timestamp);

  if (unit === "quarter-hour") {
    date.setMinutes(Math.floor(date.getMinutes() / 15) * 15, 0, 0);
    return date;
  }

  if (unit === "hour") {
    date.setMinutes(0, 0, 0);
    return date;
  }

  if (unit === "day") {
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (unit === "month") {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addUnit(date: Date, unit: TimelineUnit) {
  const next = new Date(date);

  if (unit === "quarter-hour") {
    next.setMinutes(next.getMinutes() + 15);
    return next;
  }

  if (unit === "hour") {
    next.setHours(next.getHours() + 1);
    return next;
  }

  if (unit === "day") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (unit === "month") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function formatBucket(start: number, end: number, unit: TimelineUnit) {
  const startDate = new Date(start);
  const endDate = new Date(end - 1000);

  if (unit === "quarter-hour" || unit === "hour") {
    return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)}-${timeFormatter.format(endDate)}`;
  }

  if (unit === "day") {
    return dateFormatter.format(startDate);
  }

  if (unit === "month") {
    return monthFormatter.format(startDate);
  }

  return startDate.getFullYear().toString();
}

function formatAxisLabel(timestamp: number, unit: TimelineUnit) {
  const date = new Date(timestamp);

  if (unit === "quarter-hour" || unit === "hour") {
    return dayTimeFormatter.format(date);
  }

  if (unit === "day") {
    return dateFormatter.format(date);
  }

  if (unit === "month") {
    return monthFormatter.format(date);
  }

  return date.getFullYear().toString();
}

function formatPeriod(period: CatalogTimePeriod) {
  const hasExplicitTime = period.start.includes("T") || period.end.includes("T");
  const start = normalizeInput(period.start);
  const end = normalizeInput(period.end, true);
  const startTime = toTime(start);
  const endTime = toTime(end);
  const left = Math.min(startTime, endTime);
  const right = Math.max(startTime, endTime);
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  const sameDay =
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate();

  if (!hasExplicitTime && sameDay) {
    return dateFormatter.format(leftDate);
  }

  if (sameDay) {
    return `${dateFormatter.format(leftDate)} ${timeFormatter.format(leftDate)}-${timeFormatter.format(rightDate)}`;
  }

  if (hasExplicitTime) {
    return `${dateTimeFormatter.format(leftDate)} - ${dateTimeFormatter.format(rightDate)}`;
  }

  return `${dateFormatter.format(leftDate)} - ${dateFormatter.format(rightDate)}`;
}

function formatSceneCount(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${value} снимок`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} снимка`;
  }

  return `${value} снимков`;
}

function formatPeriodCount(value: number) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${value} период`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} периода`;
  }

  return `${value} периодов`;
}

function isSamePeriod(left: CatalogTimePeriod, right: CatalogTimePeriod) {
  return normalizeInput(left.start) === normalizeInput(right.start) && normalizeInput(left.end, true) === normalizeInput(right.end, true);
}

function buildDraftValue(date: string, time: string) {
  if (!date) {
    return "";
  }

  return time ? `${date}T${time}` : date;
}

function buildTimeline(records: CatalogRecord[], activeIds: ReadonlySet<string>) {
  const timedRecords = records
    .map((record) => ({ record, time: toTime(record.acquiredAtSort) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((left, right) => left.time - right.time);

  if (!timedRecords.length) {
    return null;
  }

  const minTime = timedRecords[0].time;
  const maxTime = timedRecords[timedRecords.length - 1].time;
  const unit = chooseUnit(maxTime - minTime);
  const domainStart = floorToUnit(minTime, unit).getTime();
  const maxBucketStart = floorToUnit(maxTime, unit);
  const domainEnd = addUnit(maxBucketStart, unit).getTime();
  const bins = new Map<number, TimelineBin>();

  timedRecords.forEach(({ record, time }) => {
    const start = floorToUnit(time, unit).getTime();
    const end = addUnit(new Date(start), unit).getTime();
    const existing = bins.get(start);

    if (existing) {
      existing.count += 1;
      existing.activeCount += activeIds.has(record.id) ? 1 : 0;
      return;
    }

    bins.set(start, {
      activeCount: activeIds.has(record.id) ? 1 : 0,
      count: 1,
      end,
      label: formatBucket(start, end, unit),
      start,
    });
  });

  return {
    bins: [...bins.values()].sort((left, right) => left.start - right.start),
    domainEnd,
    domainStart,
    maxCount: Math.max(...[...bins.values()].map((bin) => bin.count)),
    unit,
  };
}

export function Timeline({
  activeRecords,
  collapsed,
  filters,
  records,
  onAddPeriod,
  onApplyPeriod,
  onClearTime,
  onRemovePeriod,
  onToggleCollapsed,
}: TimelineProps) {
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftStartTime, setDraftStartTime] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftEndTime, setDraftEndTime] = useState("");
  const [hoveredBinStart, setHoveredBinStart] = useState<number | null>(null);
  const activeIds = new Set(activeRecords.map((record) => record.id));
  const timeline = buildTimeline(records, activeIds);
  const hasTimeFilter = filters.timePeriods.length > 0 || Boolean(filters.dateFrom || filters.dateTo);
  const canAddPeriod = Boolean(draftStartDate && draftEndDate);

  const addDraftPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canAddPeriod) {
      return;
    }

    const start = buildDraftValue(draftStartDate, draftStartTime);
    const end = buildDraftValue(draftEndDate, draftEndTime);
    const startTime = toTime(normalizeInput(start));
    const endTime = toTime(normalizeInput(end, true));

    onAddPeriod({
      start: startTime <= endTime ? start : end,
      end: startTime <= endTime ? end : start,
    });
    setDraftStartDate("");
    setDraftStartTime("");
    setDraftEndDate("");
    setDraftEndTime("");
  };

  if (!timeline) {
    return (
      <section className="timeline-panel panel-chrome">
        <div className="timeline-empty">
          <CalendarIcon className="timeline-icon" />
          <span>Нет дат в текущей выборке.</span>
        </div>
      </section>
    );
  }

  const domainSpan = Math.max(timeline.domainEnd - timeline.domainStart, 1);
  const axisMiddle = timeline.domainStart + domainSpan / 2;
  const axisLabels = [
    { label: formatAxisLabel(timeline.domainStart, timeline.unit), left: 0 },
    { label: formatAxisLabel(axisMiddle, timeline.unit), left: 50 },
    { label: formatAxisLabel(timeline.domainEnd - 1000, timeline.unit), left: 100 },
  ];
  const hoveredBin = hoveredBinStart !== null ? timeline.bins.find((bin) => bin.start === hoveredBinStart) ?? null : null;
  const timelineHint = hoveredBin
    ? `${hoveredBin.label} · ${formatSceneCount(hoveredBin.count)}`
    : filters.timePeriods.length
      ? `${formatPeriodCount(filters.timePeriods.length)} выбрано`
      : hasTimeFilter
        ? "Активен диапазон дат из фильтров"
      : "Наведите на столбец или кликните для фильтрации";

  if (collapsed) {
    return (
      <section className="timeline-panel panel-chrome is-collapsed">
        <div className="timeline-collapsed-row">
          <button
            className="timeline-toggle timeline-toggle-inline"
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Развернуть таймлайн"
            title="Развернуть таймлайн"
          >
            <ChevronUpIcon />
            <span>Таймлайн</span>
          </button>

          <div className="timeline-scale timeline-scale-collapsed">
            <div
              className={`timeline-bars${hasTimeFilter ? " has-time-filter" : ""}`}
              aria-label="Доступные даты съемки"
            >
              <div className="timeline-baseline" />
              {timeline.bins.map((bin) => {
                const left = ((bin.start - timeline.domainStart) / domainSpan) * 100;
                const width = ((bin.end - bin.start) / domainSpan) * 100;
                const isActive = hasTimeFilter && bin.activeCount > 0;
                const period = {
                  start: toInputValue(bin.start),
                  end: toInputValue(bin.end - 1000),
                };
                const isExactActive = filters.timePeriods.length === 1 && isSamePeriod(filters.timePeriods[0], period);
                const style = {
                  "--bar-height": `${16 + (bin.count / timeline.maxCount) * 44}px`,
                  "--bar-left": `${left}%`,
                  "--bar-width": `${width}%`,
                } as CSSProperties;

                return (
                  <button
                    key={bin.start}
                    className={`timeline-bar${isActive ? " is-active" : ""}${hasTimeFilter && !isActive ? " is-muted" : ""}`}
                    type="button"
                    style={style}
                    onMouseEnter={() => setHoveredBinStart(bin.start)}
                    onMouseLeave={() => setHoveredBinStart(null)}
                    onFocus={() => setHoveredBinStart(bin.start)}
                    onBlur={() => setHoveredBinStart((current) => (current === bin.start ? null : current))}
                    onClick={() => {
                      if (isExactActive) {
                        onClearTime();
                        return;
                      }

                      onApplyPeriod(period);
                    }}
                    title={`${bin.label}: ${bin.count} снимков. Нажмите, чтобы отфильтровать.`}
                    aria-label={`${bin.label}: ${bin.count} снимков`}
                  />
                );
              })}
            </div>
          </div>

          <div className="timeline-collapsed-meta">
            {filters.timePeriods.length ? (
              <span className="timeline-periods-count">{filters.timePeriods.length}</span>
            ) : null}
            {hasTimeFilter ? (
              <button
                className="timeline-reset timeline-reset-inline"
                type="button"
                onClick={onClearTime}
              >
                <CloseIcon />
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="timeline-panel panel-chrome">
      <div className="timeline-layout">
        <div className="timeline-summary">
          <div className="timeline-summary-header">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Даты съемки</h2>
            </div>
            <button
              className="timeline-toggle"
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Свернуть таймлайн"
              title="Свернуть таймлайн"
            >
              <ChevronDownIcon />
              <span>Свернуть</span>
            </button>
          </div>
          <p>
            {records.length} доступны, {activeRecords.length} проходят фильтр · шаг: {unitNames[timeline.unit]}
          </p>
          {hasTimeFilter ? (
            <button
              className="timeline-reset"
              type="button"
              onClick={onClearTime}
            >
              <CloseIcon />
              Сбросить время
            </button>
          ) : null}
        </div>

        <div className="timeline-scale">
          <div className={`timeline-hover-readout${hoveredBin ? " is-active" : ""}`}>
            {timelineHint}
          </div>
          <div
            className={`timeline-bars${hasTimeFilter ? " has-time-filter" : ""}`}
            aria-label="Доступные даты съемки"
          >
            <div className="timeline-baseline" />
            {timeline.bins.map((bin) => {
              const left = ((bin.start - timeline.domainStart) / domainSpan) * 100;
              const width = ((bin.end - bin.start) / domainSpan) * 100;
              const isActive = hasTimeFilter && bin.activeCount > 0;
              const period = {
                start: toInputValue(bin.start),
                end: toInputValue(bin.end - 1000),
              };
              const isExactActive = filters.timePeriods.length === 1 && isSamePeriod(filters.timePeriods[0], period);
              const style = {
                "--bar-height": `${16 + (bin.count / timeline.maxCount) * 44}px`,
                "--bar-left": `${left}%`,
                "--bar-width": `${width}%`,
              } as CSSProperties;

              return (
                <button
                  key={bin.start}
                  className={`timeline-bar${isActive ? " is-active" : ""}${hasTimeFilter && !isActive ? " is-muted" : ""}`}
                  type="button"
                  style={style}
                  onMouseEnter={() => setHoveredBinStart(bin.start)}
                  onMouseLeave={() => setHoveredBinStart(null)}
                  onFocus={() => setHoveredBinStart(bin.start)}
                  onBlur={() => setHoveredBinStart((current) => (current === bin.start ? null : current))}
                  onClick={() => {
                    if (isExactActive) {
                      onClearTime();
                      return;
                    }

                    onApplyPeriod(period);
                  }}
                  title={`${bin.label}: ${bin.count} снимков. Нажмите, чтобы отфильтровать.`}
                  aria-label={`${bin.label}: ${bin.count} снимков`}
                />
              );
            })}
          </div>
          <div className="timeline-axis">
            {axisLabels.map((item) => (
              <span
                key={`${item.left}-${item.label}`}
                style={{ left: `${item.left}%` }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="timeline-periods-panel">
          <div className="timeline-periods-header">
            <span className="timeline-periods-title">Периоды</span>
            {filters.timePeriods.length ? (
              <span className="timeline-periods-count">{filters.timePeriods.length}</span>
            ) : null}
          </div>
          <div className="timeline-periods">
            {filters.timePeriods.length ? (
              filters.timePeriods.map((period, index) => (
                <button
                  key={`${period.start}-${period.end}-${index}`}
                  className="timeline-period-chip"
                  type="button"
                  onClick={() => onRemovePeriod(index)}
                  title="Убрать период"
                >
                  {formatPeriod(period)}
                  <CloseIcon />
                </button>
              ))
            ) : (
              <span className="timeline-period-placeholder">Клик по столбцу задает быстрый период.</span>
            )}
          </div>

          <details className="timeline-editor">
            <summary>Добавить период вручную</summary>
            <form
              className="timeline-period-form"
              onSubmit={addDraftPeriod}
            >
              <div className="timeline-period-group">
                <label className="timeline-field">
                  <span>От, дата</span>
                  <input
                    type="date"
                    value={draftStartDate}
                    onChange={(event) => setDraftStartDate(event.target.value)}
                  />
                </label>
                <label className="timeline-field timeline-field-time">
                  <span>Время, опционально</span>
                  <input
                    type="time"
                    step="60"
                    value={draftStartTime}
                    onChange={(event) => setDraftStartTime(event.target.value)}
                  />
                </label>
              </div>
              <div className="timeline-period-group">
                <label className="timeline-field">
                  <span>До, дата</span>
                  <input
                    type="date"
                    value={draftEndDate}
                    onChange={(event) => setDraftEndDate(event.target.value)}
                  />
                </label>
                <label className="timeline-field timeline-field-time">
                  <span>Время, опционально</span>
                  <input
                    type="time"
                    step="60"
                    value={draftEndTime}
                    onChange={(event) => setDraftEndTime(event.target.value)}
                  />
                </label>
              </div>
              <button
                className="button button-ghost button-compact"
                type="submit"
                disabled={!canAddPeriod}
              >
                Добавить
              </button>
            </form>
          </details>
        </div>
      </div>
    </section>
  );
}
