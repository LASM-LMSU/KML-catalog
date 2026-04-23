import { type CSSProperties, type FormEvent, useState } from "react";
import { CalendarIcon, CloseIcon } from "./Icons";
import type { CatalogFilters, CatalogRecord, CatalogTimePeriod } from "../types";

type TimelineProps = {
  activeRecords: CatalogRecord[];
  filters: CatalogFilters;
  records: CatalogRecord[];
  onAddPeriod: (period: CatalogTimePeriod) => void;
  onApplyPeriod: (period: CatalogTimePeriod) => void;
  onClearTime: () => void;
  onRemovePeriod: (index: number) => void;
};

type TimelineUnit = "quarter-hour" | "hour" | "day" | "month" | "year";

type TimelineBin = {
  activeCount: number;
  count: number;
  end: number;
  ids: string[];
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

  if (sameDay) {
    return `${dateFormatter.format(leftDate)} ${timeFormatter.format(leftDate)}-${timeFormatter.format(rightDate)}`;
  }

  return `${dateFormatter.format(leftDate)} - ${dateFormatter.format(rightDate)}`;
}

function isSamePeriod(left: CatalogTimePeriod, right: CatalogTimePeriod) {
  return normalizeInput(left.start) === normalizeInput(right.start) && normalizeInput(left.end, true) === normalizeInput(right.end, true);
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
      existing.ids.push(record.id);
      return;
    }

    bins.set(start, {
      activeCount: activeIds.has(record.id) ? 1 : 0,
      count: 1,
      end,
      ids: [record.id],
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
  filters,
  records,
  onAddPeriod,
  onApplyPeriod,
  onClearTime,
  onRemovePeriod,
}: TimelineProps) {
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const activeIds = new Set(activeRecords.map((record) => record.id));
  const timeline = buildTimeline(records, activeIds);
  const hasTimeFilter = filters.timePeriods.length > 0 || Boolean(filters.dateFrom || filters.dateTo);
  const canAddPeriod = Boolean(draftStart && draftEnd);

  const addDraftPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canAddPeriod) {
      return;
    }

    const start = normalizeInput(draftStart);
    const end = normalizeInput(draftEnd, true);
    const startTime = toTime(start);
    const endTime = toTime(end);

    onAddPeriod({
      start: startTime <= endTime ? start : end,
      end: startTime <= endTime ? end : start,
    });
    setDraftStart("");
    setDraftEnd("");
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

  return (
    <section className="timeline-panel panel-chrome">
      <div className="timeline-layout">
        <div className="timeline-summary">
          <p className="eyebrow">Timeline</p>
          <h2>Даты съемки</h2>
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
                  onClick={() => {
                    if (isExactActive) {
                      onClearTime();
                      return;
                    }

                    onApplyPeriod(period);
                  }}
                  title={`${bin.label}: ${bin.count} снимков. Нажмите, чтобы отфильтровать.`}
                  aria-label={`${bin.label}: ${bin.count} снимков`}
                >
                  <span>{bin.count}</span>
                </button>
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
              <label className="timeline-field">
                <span>От</span>
                <input
                  type="datetime-local"
                  value={draftStart}
                  onChange={(event) => setDraftStart(event.target.value)}
                />
              </label>
              <label className="timeline-field">
                <span>До</span>
                <input
                  type="datetime-local"
                  value={draftEnd}
                  onChange={(event) => setDraftEnd(event.target.value)}
                />
              </label>
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
