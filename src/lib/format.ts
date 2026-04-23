export function formatArea(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: value >= 1000 ? 0 : 1,
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "не указана";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatCoordinate(value: number, latitude = false) {
  const suffix = latitude ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}° ${suffix}`;
}

