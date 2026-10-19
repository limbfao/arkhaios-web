// Range buttons and their request parameters, plus time label formatting shared by every chart

// Yahoo chart ranges (stocks and crypto)
export const SYMBOL_RANGES = [
  { key: "1D", range: "1d", interval: "5m", intraday: true, label: "Today" },
  { key: "1W", range: "5d", interval: "15m", intraday: true, label: "Past week" },
  { key: "1M", range: "1mo", interval: "90m", intraday: true, label: "Past month" },
  { key: "6M", range: "6mo", interval: "1d", intraday: false, label: "Past 6 months" },
  { key: "1Y", range: "1y", interval: "1d", intraday: false, label: "Past year" },
  { key: "All", range: "max", interval: "1wk", intraday: false, label: "All time" },
];

// Brokerage portfolio history ranges
export const PORTFOLIO_RANGES = [
  { key: "1D", period: "1D", timeframe: "1Min", intraday: true, label: "Today" },
  { key: "1W", period: "1W", timeframe: "1H", intraday: true, label: "Past week" },
  { key: "1M", period: "1M", timeframe: "1D", intraday: false, label: "Past month" },
  { key: "6M", period: "6M", timeframe: "1D", intraday: false, label: "Past 6 months" },
  { key: "1Y", period: "1A", timeframe: "1D", intraday: false, label: "Past year" },
  { key: "All", period: "5A", timeframe: "1D", intraday: false, label: "All time" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clock(date) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

// Axis labels: lightweight-charts tells us which kind of boundary each tick is
// (0 year, 1 month, 2 day, 3/4 time), so labels stay sensible at every range.
export function tickFormatter(time, tickMarkType) {
  const date = new Date(time * 1000);
  switch (tickMarkType) {
    case 0:
      return String(date.getFullYear());
    case 1:
      return MONTHS[date.getMonth()];
    case 2:
      return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
    default:
      return clock(date);
  }
}

// Crosshair / hover label
export function hoverLabel(time, intraday) {
  const date = new Date(time * 1000);
  const day = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  if (intraday) return `${day}, ${clock(date)}`;
  return `${day}, ${date.getFullYear()}`;
}

// Turns parallel timestamp/value arrays into sorted, de-duplicated chart points
export function toPoints(timestamps = [], values = []) {
  const points = [];
  let last = -Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const time = Number(timestamps[i]);
    const value = Number(values[i]);
    if (values[i] === null || !Number.isFinite(time) || !Number.isFinite(value) || time <= last) continue;
    points.push({ time, value });
    last = time;
  }
  return points;
}
