// Shared number/date formatting so prices read the same everywhere

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2,
});

function toNumber(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function formatCurrency(value, { compact = false, fallback = "—" } = {}) {
  const n = toNumber(value);
  if (n === null) return fallback;
  return (compact ? usdCompact : usd).format(n);
}

// Change in currency with an explicit sign, e.g. "+$12.40"
export function formatSignedCurrency(value, options) {
  const n = toNumber(value);
  if (n === null) return "—";
  return (n > 0 ? "+" : n < 0 ? "−" : "") + formatCurrency(Math.abs(n), options);
}

// `ratio` is a fraction (0.0123 => +1.23%) unless `isPercent` is set
export function formatPercent(value, { isPercent = false, signed = true, digits = 2 } = {}) {
  const n = toNumber(value);
  if (n === null) return "—";
  const pct = isPercent ? n : n * 100;
  const sign = signed ? (pct > 0 ? "+" : pct < 0 ? "−" : "") : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(digits)}%`;
}

export function formatNumber(value, { digits = 4 } = {}) {
  const n = toNumber(value);
  if (n === null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatDate(value, { time = true } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date)) return "—";
  return date.toLocaleString("en-US", time
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" });
}

export function timeAgo(value) {
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (isNaN(seconds)) return "";
  if (seconds < 60) return "just now";
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${unit}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

// Tailwind text color for a gain/loss value
export function changeColor(value) {
  const n = toNumber(value);
  if (!n) return "text-muted";
  return n > 0 ? "text-gain" : "text-loss";
}
