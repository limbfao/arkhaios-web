// Deterministic fake market data shared by the mock APIs and the seed script.

const BASE_PRICES = {
  AAPL: 231.42, MSFT: 418.17, NVDA: 138.85, TSLA: 248.5, AMZN: 186.33,
  GOOGL: 164.74, META: 576.3, NFLX: 712.4, AMD: 156.2, JPM: 214.6,
  V: 281.9, DIS: 94.25, KO: 70.1, PEP: 172.4, WMT: 80.55, COST: 889.3,
  INTC: 22.6, BA: 158.9, NKE: 82.4, SPY: 572.8, QQQ: 489.2,
  "BTC-USD": 67250.0, "ETH-USD": 2615.4, "SOL-USD": 152.3,
};

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; ++i) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (/^[A-Z]+USD$/.test(s) && !s.includes("-")) return s.replace(/USD$/, "-USD");
  return s;
}

// Current price: base price nudged by a small per-day drift so it isn't static
function priceOf(symbol) {
  const s = normalizeSymbol(symbol);
  const base = BASE_PRICES[s] ?? 20 + (hashString(s) % 30000) / 100;
  const day = Math.floor(Date.now() / 86400000);
  const r = rng(hashString(s + ":" + day));
  return +(base * (1 + (r() - 0.5) * 0.03)).toFixed(2);
}

const INTERVAL_SECONDS = {
  "1m": 60, "2m": 120, "5m": 300, "15m": 900, "30m": 1800, "60m": 3600,
  "90m": 5400, "1h": 3600, "1d": 86400, "5d": 432000, "1wk": 604800,
  "1mo": 2592000, "3mo": 7776000,
};

const RANGE_SECONDS = {
  "1d": 86400 * 0.27, "5d": 86400 * 5, "1mo": 86400 * 30, "3mo": 86400 * 91,
  "6mo": 86400 * 182, "1y": 86400 * 365, "2y": 86400 * 730, "5y": 86400 * 1826,
  "10y": 86400 * 3652, "ytd": 86400 * 290, "max": 86400 * 3652,
};

// Random walk that ends exactly at `end`
function walk(seedKey, count, end, volatility) {
  const r = rng(hashString(seedKey));
  const values = [end];
  for (let i = 1; i < count; ++i) {
    const prev = values[values.length - 1];
    const drift = (r() - 0.48) * volatility;
    values.push(prev / (1 + drift));
  }
  return values.reverse().map((v) => +v.toFixed(2));
}

function series(seedKey, endValue, stepSeconds, spanSeconds, volatility) {
  const count = Math.max(2, Math.min(600, Math.round(spanSeconds / stepSeconds)));
  const now = Math.floor(Date.now() / 1000);
  const last = now - (now % stepSeconds);
  const timestamps = [];
  for (let i = count - 1; i >= 0; --i) timestamps.push(last - i * stepSeconds);
  return { timestamps, values: walk(seedKey, count, endValue, volatility) };
}

function chart(symbol, interval, range) {
  const s = normalizeSymbol(symbol);
  const step = INTERVAL_SECONDS[interval] || 300;
  const span = Math.max(RANGE_SECONDS[range] || 86400, step * 2);
  const vol = s.endsWith("-USD") ? 0.012 : 0.006;
  const { timestamps, values } = series(`${s}:${interval}:${range}`, priceOf(s), step,
    span, vol * Math.sqrt(step / 300));
  return { symbol: s, timestamps, closes: values };
}

// Current fund AUM, drifting a little each day
function fundValue(symbol) {
  const s = String(symbol || "").toUpperCase();
  const base = 80000 + (hashString("fund:" + s) % 120000);
  const day = Math.floor(Date.now() / 86400000);
  return +(base * (1 + (rng(hashString(s + day))() - 0.4) * 0.02)).toFixed(2);
}

module.exports = { BASE_PRICES, priceOf, chart, fundValue, series, normalizeSymbol, rng, hashString };
