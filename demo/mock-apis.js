// Demo mode: preloaded with `node -r ./demo/mock-apis.js server.js`.
// Intercepts outbound calls to Alpaca, Yahoo Finance, Finnhub, the fund
// history service and SendGrid, and answers them with fake data.

const { randomUUID } = require("crypto");
const market = require("./market");
const fx = require("./fixtures");

const realFetch = globalThis.fetch;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

// ---------- Alpaca broker API ----------

const createdOrders = {}; // account -> [orders placed during this run]
const transfers = {};     // account -> [transfers]
const achRelationships = {};

function alpacaOrder(o, account) {
  const price = o.limit ? parseFloat(o.limit) : market.priceOf(o.symbol);
  const qty = o.qty || (o.notional ? (parseFloat(o.notional) / price).toFixed(4) : "1");
  const created = Date.now() - (o.daysAgo || 0) * fx.DAY - 3600000;
  return {
    id: o.id,
    client_order_id: o.id,
    account_id: account,
    symbol: o.symbol,
    asset_id: "asset-" + o.symbol,
    asset_class: o.symbol.endsWith("USD") ? "crypto" : "us_equity",
    side: o.side,
    order_type: o.type,
    type: o.type,
    time_in_force: "gtc",
    qty: o.notional ? null : qty,
    notional: o.notional || null,
    limit_price: o.limit || null,
    filled_qty: o.filled ? qty : "0",
    filled_avg_price: o.filled ? price.toFixed(2) : null,
    status: o.filled ? "filled" : "new",
    created_at: new Date(created).toISOString(),
    submitted_at: new Date(created).toISOString(),
    filled_at: o.filled ? new Date(created + 1500).toISOString() : null,
  };
}

function ordersFor(account) {
  const seeded = fx.ORDERS
    .filter((o) => (account === fx.FIRM_ACCOUNT) === o.id.startsWith("ord-fund"))
    .map((o) => alpacaOrder(o, account));
  return [...(createdOrders[account] || []), ...seeded];
}

function positions() {
  return Object.entries(fx.HOLDINGS).map(([symbol, [qty, avg]]) => {
    const price = market.priceOf(symbol);
    const r = market.rng(market.hashString(symbol + Math.floor(Date.now() / fx.DAY)));
    const intraday = (r() - 0.45) * 0.05;
    const marketValue = qty * price;
    const cost = qty * avg;
    return {
      asset_id: "asset-" + symbol,
      symbol,
      exchange: symbol.endsWith("USD") ? "CRYPTO" : "NASDAQ",
      asset_class: symbol.endsWith("USD") ? "crypto" : "us_equity",
      qty: String(qty),
      qty_available: String(qty),
      avg_entry_price: avg.toFixed(2),
      side: "long",
      market_value: marketValue.toFixed(2),
      cost_basis: cost.toFixed(2),
      unrealized_pl: (marketValue - cost).toFixed(2),
      unrealized_plpc: ((marketValue - cost) / cost).toFixed(4),
      unrealized_intraday_pl: (marketValue * intraday).toFixed(2),
      unrealized_intraday_plpc: intraday.toFixed(4),
      current_price: price.toFixed(2),
      lastday_price: (price / (1 + intraday)).toFixed(2),
      change_today: intraday.toFixed(4),
    };
  });
}

function equity() {
  return fx.CASH + positions().reduce((sum, p) => sum + parseFloat(p.market_value), 0);
}

function tradingAccount(id) {
  const eq = equity();
  return {
    id,
    account_number: "9" + String(market.hashString(id)).padStart(9, "0").slice(0, 9),
    status: "ACTIVE",
    crypto_status: "ACTIVE",
    currency: "USD",
    cash: fx.CASH.toFixed(2),
    buying_power: (fx.CASH * 2).toFixed(2),
    non_marginable_buying_power: fx.CASH.toFixed(2),
    portfolio_value: eq.toFixed(2),
    equity: eq.toFixed(2),
    last_equity: (eq * 0.991).toFixed(2),
    long_market_value: (eq - fx.CASH).toFixed(2),
    pattern_day_trader: false,
    trading_blocked: false,
    created_at: iso(200 * fx.DAY),
  };
}

function brokerAccount(id) {
  const user = fx.USERS.find((u) => u.brokerageID === id) || fx.USERS[0];
  return {
    id,
    account_number: tradingAccount(id).account_number,
    status: "APPROVED",
    crypto_status: "ACTIVE",
    currency: "USD",
    last_equity: equity().toFixed(2),
    created_at: iso(200 * fx.DAY),
    contact: {
      email_address: user.email,
      phone_number: "+1 555 0142",
      street_address: ["100 Market St"],
      city: "San Francisco",
      state: "CA",
      postal_code: "94105",
    },
    identity: { given_name: user.firstName, family_name: user.lastName, date_of_birth: "1994-04-12" },
    enabled_assets: ["us_equity", "crypto"],
  };
}

const PERIOD_SECONDS = { D: 86400, W: 604800, M: 2592000, A: 31536000 };
const TIMEFRAME_SECONDS = { "1Min": 60, "5Min": 300, "15Min": 900, "1H": 3600, "1D": 86400 };

function portfolioHistory(account, period, timeframe) {
  const m = /^(\d+)([DWMA])$/.exec(period || "1M") || [null, "1", "M"];
  let span = parseInt(m[1], 10) * PERIOD_SECONDS[m[2]];
  const step = TIMEFRAME_SECONDS[timeframe] || 86400;
  if (m[2] === "D" && step < 3600) span = 6.5 * 3600; // one trading session
  const vol = 0.004 * Math.sqrt(step / 300);
  const { timestamps, values } = market.series(`${account}:${period}:${timeframe}`, equity(), step, span, vol);
  const base = values[0];
  return {
    timestamp: timestamps,
    equity: values,
    profit_loss: values.map((v) => +(v - base).toFixed(2)),
    profit_loss_pct: values.map((v) => +((v / base - 1)).toFixed(4)),
    base_value: base,
    timeframe,
  };
}

function documents(account) {
  return [0, 1, 2, 3].map((i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1, 1);
    return {
      id: `doc-${account}-${i}`,
      name: `Account Statement ${d.toISOString().slice(0, 7)}`,
      type: i === 3 ? "trade_confirmation" : "account_statement",
      date: d.toISOString().slice(0, 10),
    };
  });
}

const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
  "4 0 obj<</Length 58>>stream\nBT /F1 24 Tf 72 700 Td (Arkhaios demo statement) Tj ET\nendstream endobj " +
  "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

function seededTransfers(account) {
  return [
    { amount: "5000.00", direction: "INCOMING", status: "COMPLETE", daysAgo: 60 },
    { amount: "2500.00", direction: "INCOMING", status: "COMPLETE", daysAgo: 31 },
    { amount: "750.00", direction: "OUTGOING", status: "COMPLETE", daysAgo: 14 },
    { amount: "1000.00", direction: "INCOMING", status: "QUEUED", daysAgo: 0 },
  ].map((t, i) => ({
    id: `xfer-${account}-${i}`, relationship_id: "ach-demo-0001", account_id: account, type: "ach",
    currency: "USD", amount: t.amount, direction: t.direction, status: t.status,
    created_at: iso(t.daysAgo * fx.DAY + 7200000),
  }));
}

async function alpaca(method, path, body) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  const seg = pathname.split("/").filter(Boolean); // ["v1", ...]
  let m;

  if (pathname === "/v1/accounts" && method === "GET") return json(fx.USERS.map((u) => brokerAccount(u.brokerageID)));
  if (pathname === "/v1/accounts" && method === "POST") return json({ id: "brk-" + randomUUID(), status: "SUBMITTED" });
  if (pathname === "/v1/assets") {
    return json(Object.keys(market.BASE_PRICES).map((s) => ({
      id: "asset-" + s, symbol: s.replace("-", ""), status: "active", tradable: true, lastPrice: market.priceOf(s),
    })));
  }
  if ((m = /^\/v1\/asset\/(.+)$/.exec(pathname))) {
    const s = m[1].replace(/^asset-/, "");
    return json({ id: m[1], symbol: s, lastPrice: market.priceOf(s) });
  }
  if (pathname.startsWith("/v1/journals")) {
    return json({ id: "jnl-" + randomUUID(), status: "executed", entry_type: "JNLC", ...body });
  }

  if (seg[1] === "accounts" && seg.length === 3) {
    return json(brokerAccount(seg[2])); // GET status / PATCH enable crypto
  }

  if (seg[1] === "accounts" && seg[3] === "ach_relationships") {
    const id = seg[2];
    achRelationships[id] ??= [{
      id: "ach-demo-0001", account_id: id, status: "APPROVED", account_owner_name: "Demo User",
      bank_account_type: "CHECKING", bank_account_number: "****6789", nickname: "Demo Checking",
    }];
    if (method === "POST") {
      const rel = { id: "ach-" + randomUUID(), account_id: id, status: "APPROVED", ...body };
      achRelationships[id].push(rel);
      return json(rel);
    }
    if (method === "DELETE") {
      achRelationships[id] = achRelationships[id].filter((r) => r.id !== seg[4]);
      return new Response(null, { status: 204 });
    }
    return json(achRelationships[id]);
  }

  if (seg[1] === "accounts" && seg[3] === "transfers") {
    const id = seg[2];
    transfers[id] ??= seededTransfers(id);
    if (method === "POST") {
      const t = { id: "xfer-" + randomUUID(), account_id: id, type: "ach", currency: "USD", status: "QUEUED",
        created_at: new Date().toISOString(), ...body };
      transfers[id].unshift(t);
      return json(t);
    }
    return json(transfers[id]);
  }

  if (seg[1] === "accounts" && seg[3] === "documents") {
    if (seg[5] === "download") {
      return new Response(PDF, { status: 200, headers: { "Content-Type": "application/pdf" } });
    }
    return json(documents(seg[2]));
  }

  if (seg[1] === "trading" && seg[2] === "accounts") {
    const id = seg[3];
    const rest = seg.slice(4).join("/");

    if (rest === "orders" && method === "POST") {
      const price = body.limit_price ? parseFloat(body.limit_price) : market.priceOf(body.symbol);
      const order = alpacaOrder({
        id: "ord-" + randomUUID(), symbol: String(body.symbol).toUpperCase(), side: body.side, type: body.type,
        qty: body.qty, notional: body.notional, limit: body.limit_price,
        filled: body.type === "market",
      }, id);
      order.created_at = order.submitted_at = new Date().toISOString();
      if (order.status === "filled") order.filled_avg_price = price.toFixed(2);
      (createdOrders[id] ??= []).unshift(order);
      return json(order);
    }
    if (rest === "orders") {
      const status = params.get("status") || "open";
      const all = ordersFor(id);
      const open = (o) => !["filled", "canceled", "expired", "rejected"].includes(o.status);
      return json(status === "all" ? all : all.filter((o) => (status === "open") === open(o)));
    }
    if (seg[4] === "orders" && seg[5]) {
      const order = ordersFor(id).find((o) => o.id === seg[5]);
      return order ? json(order) : json({ message: "order not found" }, 404);
    }
    if (rest === "positions") return json(positions());
    if (seg[4] === "positions" && seg[5]) {
      const symbol = seg[5].toUpperCase().replace("-", "").replace("/", "");
      const p = positions().find((x) => x.symbol === symbol);
      return p ? json(p) : json({ code: 40410000, message: "position does not exist" }, 404);
    }
    if (rest === "account/portfolio/history") {
      return json(portfolioHistory(id, params.get("period"), params.get("timeframe")));
    }
    if (rest === "account") return json(tradingAccount(id));
  }

  return json({ message: "demo mock: unhandled alpaca route " + method + " " + path }, 404);
}

// ---------- Yahoo Finance ----------

function yahoo(url) {
  const symbol = decodeURIComponent(url.pathname.split("/").pop());
  const interval = url.searchParams.get("interval") || "5m";
  const range = url.searchParams.get("range") || "1d";
  const { timestamps, closes } = market.chart(symbol, interval, range);
  return json({
    chart: {
      result: [{
        meta: {
          symbol: market.normalizeSymbol(symbol), currency: "USD",
          regularMarketPrice: closes[closes.length - 1], chartPreviousClose: closes[0], previousClose: closes[0],
        },
        timestamp: timestamps,
        indicators: { quote: [{ close: closes, open: closes, high: closes, low: closes, volume: closes.map(() => 100000) }] },
      }],
      error: null,
    },
  });
}

// ---------- Finnhub ----------

const HEADLINES = [
  ["Fed signals patience as inflation cools toward target", "Policymakers indicated they are in no rush to move rates as price pressures continue to ease."],
  ["Chipmakers rally on stronger-than-expected AI server demand", "Semiconductor stocks led the market higher after several suppliers raised guidance."],
  ["Retail sales beat estimates, lifting consumer stocks", "Spending at retailers rose more than forecast last month, easing slowdown fears."],
  ["Treasury yields slip ahead of key jobs report", "Investors positioned cautiously as traders await fresh signals on the labor market."],
  ["Oil steadies after OPEC+ reaffirms output plan", "Crude prices held in a narrow range as the cartel stuck to its production schedule."],
  ["Big Tech earnings season kicks off with cloud in focus", "Analysts expect cloud and AI revenue to drive results across the largest platforms."],
  ["Bitcoin climbs as ETF inflows pick up", "Digital assets gained as institutional demand returned to spot crypto funds."],
  ["Small caps outperform as rate-cut bets build", "The Russell 2000 posted its best week in a month as borrowing-cost expectations fell."],
  ["Bank stocks gain after upbeat loan-growth outlook", "Lenders rose after executives pointed to steadier credit and rising demand."],
  ["Consumer confidence ticks higher for a third month", "Households reported improving views on jobs and business conditions."],
];

function news(symbol) {
  return HEADLINES.map(([headline, summary], i) => {
    const company = symbol ? `${symbol}: ` : "";
    return {
      category: symbol ? "company" : "general",
      datetime: Math.floor((Date.now() - i * 5400000 - 1800000) / 1000),
      headline: company + headline,
      id: market.hashString((symbol || "general") + i),
      image: `https://picsum.photos/seed/arkhaios-${(symbol || "mkt").toLowerCase()}-${i}/640/360`,
      related: symbol || "",
      source: ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "Barron's"][i % 5],
      summary,
      url: "https://example.com/news/" + i,
    };
  });
}

const PEERS = {
  AAPL: ["AAPL", "MSFT", "GOOGL", "META", "AMZN"], MSFT: ["MSFT", "AAPL", "GOOGL", "AMZN", "META"],
  NVDA: ["NVDA", "AMD", "INTC", "AAPL", "MSFT"], AMD: ["AMD", "NVDA", "INTC"], TSLA: ["TSLA", "AAPL", "AMZN", "NVDA"],
};

function metric(symbol) {
  const s = symbol.toUpperCase();
  const r = market.rng(market.hashString("metric:" + s));
  const price = market.priceOf(s);
  return {
    symbol: s,
    metricType: "all",
    metric: {
      "52WeekHigh": +(price * (1.08 + r() * 0.2)).toFixed(2),
      "52WeekLow": +(price * (0.6 + r() * 0.2)).toFixed(2),
      "10DayAverageTradingVolume": +(5 + r() * 80).toFixed(2),
      marketCapitalization: Math.round(50000 + r() * 3000000),
      peTTM: +(12 + r() * 50).toFixed(2),
      epsTTM: +(price / (15 + r() * 30)).toFixed(2),
      dividendYieldIndicatedAnnual: +(r() * 2.5).toFixed(2),
      beta: +(0.7 + r() * 1.2).toFixed(2),
      netProfitMarginTTM: +(5 + r() * 30).toFixed(2),
      roeTTM: +(8 + r() * 40).toFixed(2),
    },
    series: {},
  };
}

function finnhub(url) {
  const symbol = url.searchParams.get("symbol");
  if (url.pathname === "/api/v1/news") return json(news(null));
  if (url.pathname === "/api/v1/company-news") return json(news(symbol?.toUpperCase()));
  if (url.pathname === "/api/v1/stock/peers") {
    const s = symbol?.toUpperCase();
    return json(PEERS[s] || [s, "SPY", "QQQ", "AAPL", "MSFT"]);
  }
  if (url.pathname === "/api/v1/stock/metric") return json(metric(symbol || "SPY"));
  return json([]);
}

// ---------- Fund portfolio history service ----------

function fundHistory(url) {
  const [, , , symbol, period] = url.pathname.split("/"); // /api/portfolio/:symbol/:period
  const end = market.fundValue(symbol);
  const config = { "1d": [300, 6.5 * 3600], "1w": [3600, 7 * 86400], "1m": [86400, 30 * 86400] }[period]
    || [86400, 30 * 86400];
  const { timestamps, values } = market.series(`fund:${symbol}:${period}`, end, config[0], config[1],
    0.003 * Math.sqrt(config[0] / 300));
  return json({ timestamps, value: values });
}

// ---------- fetch interception ----------

globalThis.fetch = async function demoFetch(input, init = {}) {
  const href = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
  let url;
  try { url = new URL(href); } catch { return realFetch(input, init); }

  const method = (init.method || "GET").toUpperCase();
  let body;
  try { body = init.body ? JSON.parse(init.body) : undefined; } catch { body = undefined; }

  if (url.hostname.endsWith("alpaca.markets")) return alpaca(method, url.pathname + url.search, body);
  if (url.hostname === "query1.finance.yahoo.com") return yahoo(url);
  if (url.hostname === "finnhub.io") return finnhub(url);
  if (url.hostname === "18.218.219.131") return fundHistory(url);

  return realFetch(input, init);
};

// ---------- SendGrid: print verification codes instead of emailing ----------

const sendgrid = require("@sendgrid/mail");
sendgrid.send = async function (msg) {
  const p = msg.personalizations?.[0];
  console.log(`\n[demo] Email to ${p?.to?.email}: "${p?.dynamicTemplateData?.subject}" ` +
    `code = ${p?.dynamicTemplateData?.Code}\n`);
  return [{ statusCode: 202 }];
};

console.log("[demo] Mock APIs enabled (Alpaca, Yahoo, Finnhub, fund history, SendGrid)");
