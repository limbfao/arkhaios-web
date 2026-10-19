// Symbol formats differ by service: routes use "btc-usd", charts/quotes (Yahoo) use
// "BTC-USD", the brokerage (Alpaca) uses "BTC/USD" for orders and "BTCUSD" for positions.

export function isCryptoSymbol(symbol = "") {
  return /^[A-Z]{2,6}[-/]?USD$/i.test(symbol) && !/^[A-Z]{2,6}$/i.test(symbol);
}

// Any format -> "BTC-USD" / "AAPL" / "BRK-B"
export function toChartSymbol(symbol = "") {
  const s = String(symbol).trim().toUpperCase().replace("/", "-").replace(/\./g, "-");
  if (/^[A-Z]{2,6}USD$/.test(s) && !s.includes("-")) return s.replace(/USD$/, "-USD");
  return s;
}

// Symbol sent with orders
export function toOrderSymbol(symbol = "") {
  const s = toChartSymbol(symbol);
  return s.endsWith("-USD") ? s.replace("-USD", "/USD") : s.replace(/-/g, ".");
}

// Symbol used for position lookups
export function toPositionSymbol(symbol = "") {
  const s = toChartSymbol(symbol);
  return s.endsWith("-USD") ? s.replace("-USD", "USD") : s.replace(/-/g, ".");
}

// Short display ticker: "BTC-USD" -> "BTC"
export function displaySymbol(symbol = "") {
  return toChartSymbol(symbol).replace(/-USD$/, "");
}

export function assetHref(symbol = "") {
  const s = toChartSymbol(symbol);
  return s.endsWith("-USD") ? `/markets/crypto/${s.toLowerCase()}` : `/markets/stocks/${s}`;
}
