// Deterministic fake market shared by the mock APIs and the seed script.
//
// Every symbol has one continuous price path p(symbol, t): layered value noise
// anchored so p(symbol, ANCHOR) equals its base price. Quotes, charts, positions
// and portfolio history all read from that path, so they always agree. Stocks
// only trade during US market hours (prices freeze outside them); crypto trades 24/7.

const BASE_PRICES = {
  AAPL: 231.42, MSFT: 418.17, NVDA: 138.85, TSLA: 248.5, AMZN: 186.33,
  GOOGL: 164.74, META: 576.3, NFLX: 712.4, AMD: 156.2, JPM: 214.6,
  V: 281.9, DIS: 94.25, KO: 70.1, PEP: 172.4, WMT: 80.55, COST: 889.3,
  INTC: 22.6, BA: 158.9, NKE: 82.4, SPY: 572.8, QQQ: 489.2,
  "BTC-USD": 67250.0, "ETH-USD": 2615.4, "SOL-USD": 152.3,
};

const ANCHOR = Date.UTC(2026, 9, 16, 20) / 1000; // prices equal BASE_PRICES at this close
const MINUTE = 60, HOUR = 3600, DAY = 86400;

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

// "BTCUSD", "BTC/USD", "btc-usd" -> "BTC-USD"; stocks are upper-cased
function normalizeSymbol(symbol) {
  const s = String(symbol || "").toUpperCase().replace("/", "-");
  if (/^[A-Z]+USD$/.test(s) && BASE_PRICES[s.replace(/USD$/, "-USD")]) return s.replace(/USD$/, "-USD");
  return s;
}

// Symbols the fake market lists (anything else behaves like an unknown ticker)
const isKnown = (symbol) => normalizeSymbol(symbol) in BASE_PRICES;

const isCrypto = (symbol) => normalizeSymbol(symbol).endsWith("-USD");

// ---------- US market calendar (weekdays 9:30-16:00 America/New_York) ----------

function nyOffsetSeconds(t) {
  // Offset of New York from UTC at time t (handles daylight saving)
  const date = new Date(t * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second) / 1000;
  return asUTC - Math.floor(t);
}

// Open/close (unix seconds) of the trading session on the NY calendar day containing t, or null on weekends
function sessionOn(t) {
  const offset = nyOffsetSeconds(t);
  const local = t + offset;
  const midnight = local - (((local % DAY) + DAY) % DAY);
  const weekday = new Date(midnight * 1000).getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  return { open: midnight + 9.5 * HOUR - offset, close: midnight + 16 * HOUR - offset };
}

// Most recent sessions, newest first, starting with the one containing or preceding t
function recentSessions(t, count) {
  const sessions = [];
  for (let day = 0; sessions.length < count && day < count * 2 + 10; ++day) {
    const s = sessionOn(t - day * DAY);
    if (s && s.open <= t) sessions.push(s);
  }
  return sessions;
}

function isMarketOpen(t = Date.now() / 1000) {
  const s = sessionOn(t);
  return !!s && t >= s.open && t < s.close;
}

// Latest time at which a symbol had a price (stocks freeze outside market hours)
function lastTradeTime(symbol, t = Date.now() / 1000) {
  if (isCrypto(symbol)) return t;
  const s = recentSessions(t, 1)[0];
  return Math.min(t, s.close);
}

// ---------- price path ----------

// Smooth value noise in [-1, 1]
function valueNoise(seed, x) {
  const i = Math.floor(x);
  const f = x - i;
  const a = rng(seed ^ hashString(String(i)))() * 2 - 1;
  const b = rng(seed ^ hashString(String(i + 1)))() * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

const OCTAVES = [
  [5 * MINUTE, 0.0015], [HOUR, 0.004], [DAY, 0.012], [7 * DAY, 0.03],
  [30 * DAY, 0.06], [182 * DAY, 0.12], [730 * DAY, 0.22],
];

function logOffset(symbol, t) {
  const seed = hashString(symbol);
  const scale = isCrypto(symbol) ? 2.2 : 1;
  let sum = 0;
  for (const [period, amplitude] of OCTAVES) {
    sum += valueNoise(seed ^ hashString(String(period)), t / period) * amplitude * scale;
  }
  // Gentle long-run growth so long ranges trend upward like real markets
  return sum + (t - ANCHOR) / (365 * DAY) * 0.12;
}

function basePrice(symbol) {
  return BASE_PRICES[symbol] ?? 20 + (hashString(symbol) % 30000) / 100;
}

function priceAt(symbol, t) {
  const s = normalizeSymbol(symbol);
  const effective = isCrypto(s) ? t : lastTradeTime(s, t);
  const p = basePrice(s) * Math.exp(logOffset(s, effective) - logOffset(s, ANCHOR));
  return +p.toFixed(p < 1 ? 4 : 2);
}

function priceOf(symbol) {
  return priceAt(symbol, Date.now() / 1000);
}

// Reference price for "today's change": previous session close for stocks, 24h ago for crypto
function previousClose(symbol, t = Date.now() / 1000) {
  const s = normalizeSymbol(symbol);
  if (isCrypto(s)) return priceAt(s, t - DAY);
  const [current, prior] = recentSessions(t, 2);
  const reference = t >= current.open ? prior : recentSessions(current.open - 1, 1)[0];
  return priceAt(s, reference.close);
}

// ---------- time grids for charts ----------

const INTERVAL_SECONDS = {
  "1m": MINUTE, "2m": 2 * MINUTE, "5m": 5 * MINUTE, "15m": 15 * MINUTE, "30m": 30 * MINUTE,
  "60m": HOUR, "90m": 90 * MINUTE, "1h": HOUR, "1d": DAY, "5d": 5 * DAY, "1wk": 7 * DAY,
  "1mo": 30 * DAY, "3mo": 91 * DAY,
};

const RANGE_SECONDS = {
  "5d": 5 * DAY, "1mo": 30 * DAY, "3mo": 91 * DAY, "6mo": 182 * DAY, "1y": 365 * DAY,
  "2y": 730 * DAY, "5y": 1826 * DAY, "10y": 3652 * DAY, "ytd": null, "max": 3652 * DAY,
};

const MAX_POINTS = 2500;

// Timestamps covering `span` seconds before now (or the latest session when sessionOnly),
// at `step` spacing, trading hours only for stocks. Coarsens the step if there'd be too many points.
function timeGrid(symbol, step, span, { sessionOnly = false } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const crypto = isCrypto(symbol);

  if (crypto || step >= DAY) {
    const from = now - span;
    step = Math.max(step, Math.ceil(span / MAX_POINTS));
    const out = [];
    const last = crypto ? now - (now % step) : now;
    for (let t = last; t >= from; t -= step) {
      if (crypto || step < DAY) out.push(t);
      else {
        // Daily bars for stocks: one per session, stamped at the close
        const s = sessionOn(t);
        if (s && s.close <= now + DAY) out.push(Math.min(s.close, now));
      }
    }
    const grid = [...new Set(out)].reverse();
    if (crypto && grid[grid.length - 1] < now) grid.push(now); // end on the live price
    return grid;
  }

  const days = sessionOnly ? 1 : Math.max(1, Math.ceil(span / DAY));
  const sessions = recentSessions(now, days * 5 / 7 + 2)
    .filter((s, i) => sessionOnly ? i === 0 : s.close > now - span);
  const total = sessions.reduce((n, s) => n + (Math.min(s.close, now) - s.open) / step, 0);
  if (total > MAX_POINTS) step = Math.ceil((step * total) / MAX_POINTS / 60) * 60;

  const out = [];
  for (const s of sessions.reverse()) {
    for (let t = s.open; t <= Math.min(s.close, now); t += step) out.push(t);
  }
  return out;
}

function chart(symbol, interval, range) {
  const s = normalizeSymbol(symbol);
  const step = INTERVAL_SECONDS[interval] || 5 * MINUTE;
  let timestamps;
  if (range === "1d") {
    timestamps = timeGrid(s, step, DAY, { sessionOnly: true });
  } else {
    let span = RANGE_SECONDS[range];
    if (span === null) span = Date.now() / 1000 - Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000;
    timestamps = timeGrid(s, step, span || DAY);
  }
  if (timestamps.length < 2) timestamps = timeGrid(s, step, 5 * DAY);
  return { symbol: s, timestamps, closes: timestamps.map((t) => priceAt(s, t)) };
}

// Value of a portfolio {symbol: qty} plus cash at time t
function portfolioValue(holdings, cash, t) {
  let total = cash;
  for (const [symbol, qty] of Object.entries(holdings)) total += qty * priceAt(symbol, t);
  return +total.toFixed(2);
}

module.exports = {
  BASE_PRICES, MINUTE, HOUR, DAY,
  priceOf, priceAt, previousClose, chart, timeGrid, portfolioValue,
  normalizeSymbol, isKnown, isCrypto, isMarketOpen, recentSessions, rng, hashString,
};
