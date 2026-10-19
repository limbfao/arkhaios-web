// Demo mode: preloaded with `node -r ./demo/mock-apis.js server.js`.
// Intercepts outbound calls to Alpaca, Yahoo Finance, Finnhub, the fund
// history service and SendGrid, and answers them with fake data.
//
// The Alpaca mock behaves like a small cash brokerage: orders validate against
// buying power and holdings, fills move cash and positions, limit orders fill
// when the price crosses, deposits settle after a short delay. Its state is kept
// in demo/.state.json so it survives restarts (delete the file to reset).

const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const market = require("./market");
const fx = require("./fixtures");

const realFetch = globalThis.fetch;
const STATE_FILE = path.join(__dirname, ".state.json");
const SETTLE_MS = 20000; // ACH transfers complete after this long

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const round2 = (n) => Math.round(n * 100) / 100;
const now = () => Date.now() / 1000;

// Broker symbols drop the dash for crypto ("BTCUSD"); prices use "BTC-USD"
const brokerSymbol = (symbol) => market.normalizeSymbol(symbol).replace("-", "");

// ---------- persistent brokerage state ----------

let state = { accounts: {} };
try { state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch {}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1)); } catch {}
  }, 200);
}

function seededOrder(o, account) {
  const price = o.limit ? parseFloat(o.limit) : market.priceAt(o.symbol, now() - (o.daysAgo || 0) * 86400);
  const qty = o.qty || (o.notional ? (parseFloat(o.notional) / price).toFixed(4) : "1");
  const created = Date.now() - (o.daysAgo || 0) * fx.DAY - 3600000;
  return {
    id: o.id, client_order_id: o.id, account_id: account,
    symbol: brokerSymbol(o.symbol), asset_id: "asset-" + brokerSymbol(o.symbol),
    asset_class: market.isCrypto(o.symbol) ? "crypto" : "us_equity",
    side: o.side, order_type: o.type, type: o.type, time_in_force: "gtc",
    qty: o.notional ? null : String(qty), notional: o.notional || null, limit_price: o.limit || null,
    filled_qty: o.filled ? String(qty) : "0", filled_avg_price: o.filled ? price.toFixed(2) : null,
    status: o.filled ? "filled" : "new",
    created_at: new Date(created).toISOString(), submitted_at: new Date(created).toISOString(),
    filled_at: o.filled ? new Date(created + 1500).toISOString() : null,
  };
}

function seededTransfers(account) {
  return [
    { amount: "5000.00", direction: "INCOMING", daysAgo: 60 },
    { amount: "2500.00", direction: "INCOMING", daysAgo: 31 },
    { amount: "750.00", direction: "OUTGOING", daysAgo: 14 },
  ].map((t, i) => ({
    id: `xfer-${account}-${i}`, relationship_id: "ach-demo-0001", account_id: account, type: "ach",
    currency: "USD", amount: t.amount, direction: t.direction, status: "COMPLETE", applied: true,
    created_at: iso(t.daysAgo * fx.DAY + 7200000),
  }));
}

// Accounts are created on first use. Seeded users start with the demo portfolio,
// the firm account holds the funds' positions, anything else (new KYC) starts empty.
function account(id) {
  if (state.accounts[id]) return state.accounts[id];

  const seededUser = fx.USERS.some((u) => u.brokerageID === id);
  const isFirm = id === fx.FIRM_ACCOUNT;
  const holdings = {};

  if (seededUser) {
    for (const [symbol, [qty, avg]] of Object.entries(fx.HOLDINGS)) holdings[brokerSymbol(symbol)] = { qty, cost: qty * avg };
  } else if (isFirm) {
    for (const fund of Object.values(fx.FUNDS)) {
      for (const [symbol, [qty, avg]] of Object.entries(fund.positions)) {
        const h = holdings[symbol] ??= { qty: 0, cost: 0 };
        h.qty += qty;
        h.cost += qty * avg;
      }
    }
  }

  const cash = seededUser ? fx.CASH : isFirm ? Object.values(fx.FUNDS).reduce((n, f) => n + f.cash, 0) : 0;
  const orders = fx.ORDERS
    .filter((o) => (seededUser && o.id.startsWith("ord-user")) || (isFirm && o.id.startsWith("ord-fund")))
    .map((o) => seededOrder(o, id));

  state.accounts[id] = {
    id, cash, holdings, orders,
    transfers: seededUser ? seededTransfers(id) : [],
    ach: seededUser ? [{
      id: "ach-demo-0001", account_id: id, status: "APPROVED", account_owner_name: "Demo User",
      bank_account_type: "CHECKING", bank_account_number: "****6789", nickname: "Demo Checking",
    }] : [],
    createdAt: Date.now() - (seededUser || isFirm ? 200 * fx.DAY : 0),
  };
  save();
  return state.accounts[id];
}

// ---------- order execution ----------

const OPEN_STATUSES = ["new", "accepted", "pending_new", "partially_filled"];

function fill(acct, order, price) {
  const qty = order.notional ? round2(parseFloat(order.notional) / price * 10000) / 10000 : parseFloat(order.qty);
  const h = acct.holdings[order.symbol] ??= { qty: 0, cost: 0 };
  if (order.side === "buy") {
    h.qty += qty;
    h.cost += qty * price;
    acct.cash = round2(acct.cash - qty * price);
  } else {
    const avg = h.qty ? h.cost / h.qty : 0;
    h.qty -= qty;
    h.cost -= qty * avg;
    acct.cash = round2(acct.cash + qty * price);
  }
  if (h.qty <= 1e-9) delete acct.holdings[order.symbol];

  order.status = "filled";
  order.filled_qty = String(qty);
  if (!order.qty) order.qty = String(qty);
  order.filled_avg_price = price.toFixed(2);
  order.filled_at = new Date().toISOString();
}

// Fill open orders whose conditions are now met
function settle(acct) {
  let changed = false;
  for (const order of acct.orders) {
    if (!OPEN_STATUSES.includes(order.status)) continue;
    const crypto = order.asset_class === "crypto";
    if (!crypto && !market.isMarketOpen()) continue;

    const price = market.priceOf(order.symbol);
    if (order.type === "market") {
      fill(acct, order, price);
      changed = true;
    } else if (order.type === "limit") {
      const limit = parseFloat(order.limit_price);
      if ((order.side === "buy" && price <= limit) || (order.side === "sell" && price >= limit)) {
        fill(acct, order, price); // marketable limit orders fill at the market price (never worse than the limit)
        changed = true;
      }
    }
  }

  for (const t of acct.transfers) {
    if (t.status === "QUEUED" && Date.now() - Date.parse(t.created_at) > SETTLE_MS) {
      t.status = "COMPLETE";
      if (!t.applied) {
        acct.cash = round2(acct.cash + (t.direction === "INCOMING" ? 1 : -1) * parseFloat(t.amount));
        t.applied = true;
      }
      changed = true;
    }
  }

  if (changed) save();
}

function pendingBuyCost(acct) {
  return acct.orders
    .filter((o) => OPEN_STATUSES.includes(o.status) && o.side === "buy")
    .reduce((n, o) => n + (o.notional ? parseFloat(o.notional)
      : parseFloat(o.qty) * (o.limit_price ? parseFloat(o.limit_price) : market.priceOf(o.symbol))), 0);
}

const buyingPower = (acct) => Math.max(0, round2(acct.cash - pendingBuyCost(acct)));

function placeOrder(acct, body) {
  const symbol = brokerSymbol(body.symbol);
  const side = body.side === "sell" ? "sell" : "buy";
  const type = body.type === "limit" ? "limit" : "market";
  const price = market.priceOf(symbol);
  const limit = body.limit_price ? parseFloat(body.limit_price) : null;
  const qty = body.qty ? parseFloat(body.qty) : null;
  const notional = body.notional ? parseFloat(body.notional) : null;

  if (!symbol || !(price > 0)) return json({ code: 40010001, message: "asset not found" }, 422);
  if (!(qty > 0) && !(notional > 0)) return json({ code: 40010001, message: "qty or notional is required" }, 422);
  if (type === "limit" && !(limit > 0)) return json({ code: 40010001, message: "limit price is required" }, 422);
  if (notional && type !== "market") return json({ code: 40010001, message: "notional orders must be market orders" }, 422);

  const estimate = notional || qty * (limit || price);
  if (side === "buy" && estimate > buyingPower(acct) + 0.005) {
    return json({ code: 40310000, message: "insufficient buying power" }, 403);
  }
  if (side === "sell") {
    const held = acct.holdings[symbol]?.qty || 0;
    const openSells = acct.orders
      .filter((o) => OPEN_STATUSES.includes(o.status) && o.side === "sell" && o.symbol === symbol)
      .reduce((n, o) => n + parseFloat(o.qty || 0), 0);
    const selling = qty || notional / price;
    if (selling > held - openSells + 1e-9) {
      return json({ code: 40310000, message: `insufficient qty available for order (available: ${+(held - openSells).toFixed(4)})` }, 403);
    }
  }

  const order = {
    id: randomUUID(), client_order_id: randomUUID(), account_id: acct.id,
    symbol, asset_id: "asset-" + symbol, asset_class: market.isCrypto(symbol) ? "crypto" : "us_equity",
    side, order_type: type, type, time_in_force: body.time_in_force || "gtc",
    qty: qty ? String(qty) : null, notional: notional ? String(notional) : null,
    limit_price: limit ? limit.toFixed(2) : null,
    filled_qty: "0", filled_avg_price: null, status: "accepted",
    created_at: new Date().toISOString(), submitted_at: new Date().toISOString(), filled_at: null,
  };
  acct.orders.unshift(order);
  settle(acct);
  if (order.status === "accepted") order.status = "new";
  save();
  return json(order);
}

// ---------- account views ----------

function positions(acct) {
  return Object.entries(acct.holdings).map(([symbol, h]) => {
    const price = market.priceOf(symbol);
    const prev = market.previousClose(symbol);
    const marketValue = h.qty * price;
    const intraday = prev ? price / prev - 1 : 0;
    const crypto = market.isCrypto(symbol);
    return {
      asset_id: "asset-" + symbol, symbol,
      exchange: crypto ? "CRYPTO" : ["JPM", "V", "DIS", "KO", "WMT", "BA", "NKE"].includes(symbol) ? "NYSE" : "NASDAQ",
      asset_class: crypto ? "crypto" : "us_equity",
      qty: String(+h.qty.toFixed(6)), qty_available: String(+h.qty.toFixed(6)),
      avg_entry_price: (h.cost / h.qty).toFixed(2), side: "long",
      market_value: marketValue.toFixed(2), cost_basis: h.cost.toFixed(2),
      unrealized_pl: (marketValue - h.cost).toFixed(2),
      unrealized_plpc: ((marketValue - h.cost) / h.cost).toFixed(4),
      unrealized_intraday_pl: (h.qty * (price - prev)).toFixed(2),
      unrealized_intraday_plpc: intraday.toFixed(4),
      current_price: price.toFixed(2), lastday_price: prev.toFixed(2), change_today: intraday.toFixed(4),
    };
  });
}

function holdingsQty(acct) {
  return Object.fromEntries(Object.entries(acct.holdings).map(([s, h]) => [s, h.qty]));
}

function equityAt(acct, t) {
  return market.portfolioValue(holdingsQty(acct), acct.cash, t);
}

function tradingAccount(acct) {
  const t = now();
  const eq = equityAt(acct, t);
  const last = market.portfolioValue(holdingsQty(acct), acct.cash, t - 86400) ;
  return {
    id: acct.id,
    account_number: "9" + String(market.hashString(acct.id)).padStart(9, "0").slice(0, 9),
    status: "ACTIVE", crypto_status: "ACTIVE", currency: "USD",
    cash: acct.cash.toFixed(2),
    buying_power: buyingPower(acct).toFixed(2),
    non_marginable_buying_power: buyingPower(acct).toFixed(2),
    portfolio_value: eq.toFixed(2), equity: eq.toFixed(2), last_equity: last.toFixed(2),
    long_market_value: (eq - acct.cash).toFixed(2),
    pattern_day_trader: false, daytrade_count: 0, trading_blocked: false, account_blocked: false,
    multiplier: "1", created_at: new Date(acct.createdAt).toISOString(),
  };
}

function brokerAccount(acct) {
  const user = fx.USERS.find((u) => u.brokerageID === acct.id);
  return {
    id: acct.id,
    account_number: tradingAccount(acct).account_number,
    status: "APPROVED", crypto_status: "ACTIVE", currency: "USD",
    last_equity: equityAt(acct, now()).toFixed(2),
    created_at: new Date(acct.createdAt).toISOString(),
    contact: {
      email_address: user?.email, phone_number: "+1 555 0142",
      street_address: ["100 Market St"], city: "San Francisco", state: "CA", postal_code: "94105",
    },
    identity: { given_name: user?.firstName, family_name: user?.lastName, date_of_birth: "1994-04-12" },
    enabled_assets: ["us_equity", "crypto"],
  };
}

const PERIOD_SECONDS = { D: 86400, W: 604800, M: 2592000, A: 31536000 };
const TIMEFRAME_SECONDS = { "1Min": 60, "5Min": 300, "15Min": 900, "1H": 3600, "1D": 86400 };

// Equity curve of the account's current holdings and cash over the period
function portfolioHistory(acct, period, timeframe) {
  const m = /^(\d+)([DWMA])$/.exec(period || "1M") || [null, "1", "M"];
  const span = parseInt(m[1], 10) * PERIOD_SECONDS[m[2]];
  const step = TIMEFRAME_SECONDS[timeframe] || 86400;
  const hasStocks = Object.keys(acct.holdings).some((s) => !market.isCrypto(s));
  const timestamps = market.timeGrid(hasStocks ? "SPY" : "BTC-USD", step, span, { sessionOnly: m[2] === "D" && m[1] === "1" });
  const equity = timestamps.map((t) => equityAt(acct, t));
  const base = equity[0];
  return {
    timestamp: timestamps, equity,
    profit_loss: equity.map((v) => round2(v - base)),
    profit_loss_pct: equity.map((v) => +(v / base - 1).toFixed(4)),
    base_value: base, timeframe,
  };
}

function documents(id) {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1, 1);
    const kind = i % 3 === 2 ? "trade_confirmation" : "account_statement";
    return {
      id: `doc-${id}-${i}`,
      name: `${kind === "account_statement" ? "Account statement" : "Trade confirmations"} ${d.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      type: kind, date: d.toISOString().slice(0, 10),
    };
  });
}

function statementPdf(title) {
  const text = `Arkhaios demo - ${title}`.replace(/[()\\]/g, "");
  const stream = `BT /F1 20 Tf 72 700 Td (${text}) Tj ET`;
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
    `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj ` +
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
}

async function alpaca(method, pathWithQuery, body) {
  const [pathname, query = ""] = pathWithQuery.split("?");
  const params = new URLSearchParams(query);
  const seg = pathname.split("/").filter(Boolean); // ["v1", ...]
  let m;

  if (pathname === "/v1/accounts" && method === "GET") return json(Object.values(state.accounts).map(brokerAccount));
  if (pathname === "/v1/accounts" && method === "POST") {
    const acct = account("brk-" + randomUUID());
    return json({ id: acct.id, status: "SUBMITTED" });
  }
  if (pathname === "/v1/assets") {
    return json(Object.keys(market.BASE_PRICES).map((s) => ({
      id: "asset-" + brokerSymbol(s), symbol: brokerSymbol(s), status: "active", tradable: true, lastPrice: market.priceOf(s),
    })));
  }
  if ((m = /^\/v1\/asset\/(.+)$/.exec(pathname))) {
    const s = m[1].replace(/^asset-/, "");
    return json({ id: m[1], symbol: s, lastPrice: market.priceOf(s) });
  }

  // Journals move cash between accounts (fund deposits go from a member to the firm account)
  if (pathname.startsWith("/v1/journals")) {
    const from = account(body.from_account), to = account(body.to_account);
    settle(from);
    const amount = parseFloat(body.amount);
    if (!(amount > 0)) return json({ code: 40010001, message: "amount must be positive" }, 422);
    if (amount > buyingPower(from)) return json({ code: 40310000, message: "insufficient funds" }, 403);
    from.cash = round2(from.cash - amount);
    to.cash = round2(to.cash + amount);
    save();
    return json({ id: "jnl-" + randomUUID(), status: "executed", entry_type: "JNLC", ...body, settle_date: iso(0).slice(0, 10) });
  }

  if (seg[1] === "accounts" && seg.length === 3) {
    return json(brokerAccount(account(seg[2]))); // GET status / PATCH enable crypto
  }

  if (seg[1] === "accounts" && seg[3] === "ach_relationships") {
    const acct = account(seg[2]);
    if (method === "POST") {
      const rel = { id: "ach-" + randomUUID(), account_id: acct.id, status: "APPROVED", created_at: iso(0), ...body };
      acct.ach.push(rel);
      save();
      return json(rel);
    }
    if (method === "DELETE") {
      acct.ach = acct.ach.filter((r) => r.id !== seg[4]);
      save();
      return new Response(null, { status: 204 });
    }
    return json(acct.ach);
  }

  if (seg[1] === "accounts" && seg[3] === "transfers") {
    const acct = account(seg[2]);
    settle(acct);
    if (method === "POST") {
      const amount = parseFloat(body.amount);
      if (!(amount > 0)) return json({ code: 40010001, message: "amount must be positive" }, 422);
      if (body.direction === "OUTGOING" && amount > buyingPower(acct)) {
        return json({ code: 40310000, message: "insufficient funds for withdrawal" }, 403);
      }
      const t = { id: "xfer-" + randomUUID(), account_id: acct.id, type: "ach", currency: "USD", status: "QUEUED",
        created_at: new Date().toISOString(), ...body, amount: amount.toFixed(2) };
      if (t.direction === "OUTGOING") { // withdrawals leave the account immediately
        acct.cash = round2(acct.cash - amount);
        t.applied = true;
      }
      acct.transfers.unshift(t);
      save();
      return json(t);
    }
    return json([...acct.transfers].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
  }

  if (seg[1] === "accounts" && seg[3] === "documents") {
    if (seg[5] === "download") {
      const doc = documents(seg[2]).find((d) => d.id === seg[4]);
      return new Response(statementPdf(doc?.name || "Statement"), { status: 200, headers: { "Content-Type": "application/pdf" } });
    }
    return json(documents(seg[2]));
  }

  if (seg[1] === "trading" && seg[2] === "accounts") {
    const acct = account(seg[3]);
    settle(acct);
    const rest = seg.slice(4).join("/");

    if (rest === "orders" && method === "POST") return placeOrder(acct, body || {});
    if (rest === "orders") {
      const status = params.get("status") || "open";
      const open = (o) => OPEN_STATUSES.includes(o.status);
      const list = [...acct.orders].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      return json(status === "all" ? list : list.filter((o) => (status === "open") === open(o)));
    }
    if (seg[4] === "orders" && seg[5]) {
      const order = acct.orders.find((o) => o.id === seg[5]);
      if (!order) return json({ code: 40410000, message: "order not found" }, 404);
      if (method === "DELETE") {
        if (!OPEN_STATUSES.includes(order.status)) return json({ code: 42210000, message: "order is not cancelable" }, 422);
        order.status = "canceled";
        order.canceled_at = new Date().toISOString();
        save();
        return new Response(null, { status: 204 });
      }
      return json(order);
    }
    if (rest === "positions") return json(positions(acct));
    if (seg[4] === "positions" && seg[5]) {
      const p = positions(acct).find((x) => x.symbol === brokerSymbol(decodeURIComponent(seg[5])));
      return p ? json(p) : json({ code: 40410000, message: "position does not exist" }, 404);
    }
    if (rest === "account/portfolio/history") {
      return json(portfolioHistory(acct, params.get("period"), params.get("timeframe")));
    }
    if (rest === "account") return json(tradingAccount(acct));
  }

  return json({ message: "demo mock: unhandled alpaca route " + method + " " + pathWithQuery }, 404);
}

// ---------- Yahoo Finance ----------

function yahoo(url) {
  const symbol = decodeURIComponent(url.pathname.split("/").pop());
  if (!market.isKnown(symbol)) {
    return json({ chart: { result: null, error: { code: "Not Found", description: "No data found, symbol may be delisted" } } }, 404);
  }
  const interval = url.searchParams.get("interval") || "5m";
  const range = url.searchParams.get("range") || "1d";
  const { timestamps, closes } = market.chart(symbol, interval, range);
  const s = market.normalizeSymbol(symbol);
  return json({
    chart: {
      result: [{
        meta: {
          symbol: s, currency: "USD", exchangeTimezoneName: "America/New_York",
          regularMarketPrice: market.priceOf(s), chartPreviousClose: closes[0], previousClose: market.previousClose(s),
        },
        timestamp: timestamps,
        indicators: { quote: [{ close: closes, open: closes, high: closes, low: closes, volume: closes.map(() => 100000) }] },
      }],
      error: null,
    },
  });
}

// ---------- Finnhub ----------

const MARKET_HEADLINES = [
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

const COMPANY_NAMES = {
  AAPL: "Apple", MSFT: "Microsoft", NVDA: "Nvidia", TSLA: "Tesla", AMZN: "Amazon", GOOGL: "Alphabet",
  META: "Meta", NFLX: "Netflix", AMD: "AMD", JPM: "JPMorgan", V: "Visa", DIS: "Disney", KO: "Coca-Cola",
  PEP: "PepsiCo", WMT: "Walmart", COST: "Costco", INTC: "Intel", BA: "Boeing", NKE: "Nike",
};

const COMPANY_TEMPLATES = [
  ["{n} shares move as analysts update price targets", "Several brokerages revised their outlook for {n} after recent results, citing margins and guidance."],
  ["What to watch in {n}'s next earnings report", "Investors will focus on revenue growth, margins and any change to full-year guidance from {n}."],
  ["{n} expands buyback program", "The board of {n} authorized additional share repurchases, signaling confidence in cash generation."],
  ["Options traders position for a bigger move in {n}", "Implied volatility in {n} rose ahead of the company's upcoming catalysts."],
  ["{n} announces leadership changes in key division", "{n} named new executives to lead its fastest-growing business unit."],
  ["Institutional investors add to {n} positions", "Recent filings show several large funds increased their stakes in {n} last quarter."],
  ["{n} unveils new products at annual event", "{n} showcased updates across its lineup, with analysts weighing the impact on next year's sales."],
  ["Supply chain checks point to steady demand for {n}", "Industry surveys suggest orders for {n} remain stable heading into the holiday quarter."],
];

function news(symbol) {
  const name = symbol ? COMPANY_NAMES[symbol] || symbol : null;
  const items = symbol ? COMPANY_TEMPLATES.map(([h, s]) => [h.replaceAll("{n}", name), s.replaceAll("{n}", name)]) : MARKET_HEADLINES;
  return items.map(([headline, summary], i) => ({
    category: symbol ? "company" : "general",
    datetime: Math.floor((Date.now() - i * 5400000 - 1800000) / 1000),
    headline,
    id: market.hashString((symbol || "general") + i),
    image: `https://picsum.photos/seed/arkhaios-${(symbol || "mkt").toLowerCase()}-${i}/640/360`,
    related: symbol || "",
    source: ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "Barron's"][i % 5],
    summary,
    url: "https://example.com/news/" + (symbol || "markets").toLowerCase() + "-" + i,
  }));
}

const PEERS = {
  AAPL: ["AAPL", "MSFT", "GOOGL", "META", "AMZN"], MSFT: ["MSFT", "AAPL", "GOOGL", "AMZN", "META"],
  NVDA: ["NVDA", "AMD", "INTC", "AAPL", "MSFT"], AMD: ["AMD", "NVDA", "INTC"], INTC: ["INTC", "AMD", "NVDA"],
  TSLA: ["TSLA", "AAPL", "AMZN", "NVDA"], AMZN: ["AMZN", "WMT", "COST", "GOOGL"], GOOGL: ["GOOGL", "META", "MSFT", "AAPL"],
  META: ["META", "GOOGL", "NFLX", "AAPL"], NFLX: ["NFLX", "DIS", "META"], DIS: ["DIS", "NFLX"],
  JPM: ["JPM", "V"], V: ["V", "JPM"], KO: ["KO", "PEP"], PEP: ["PEP", "KO"], WMT: ["WMT", "COST", "AMZN"],
  COST: ["COST", "WMT", "AMZN"], BA: ["BA"], NKE: ["NKE"],
};

function metric(symbol) {
  const s = symbol.toUpperCase();
  const r = market.rng(market.hashString("metric:" + s));
  const year = market.chart(s, "1d", "1y").closes;
  const price = market.priceOf(s);
  return {
    symbol: s,
    metricType: "all",
    metric: {
      "52WeekHigh": Math.max(...year), "52WeekLow": Math.min(...year),
      "10DayAverageTradingVolume": +(5 + r() * 80).toFixed(2),
      marketCapitalization: Math.round(50000 + r() * 3000000),
      peTTM: +(12 + r() * 50).toFixed(2),
      epsTTM: +(price / (15 + r() * 30)).toFixed(2),
      dividendYieldIndicatedAnnual: ["TSLA", "AMZN", "NFLX", "AMD", "META"].includes(s) ? null : +(r() * 2.5).toFixed(2),
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
    return json(PEERS[s] || [s, "SPY", "QQQ"]);
  }
  if (url.pathname === "/api/v1/stock/metric") return json(metric(symbol || "SPY"));
  return json([]);
}

// ---------- Fund portfolio history service ----------

// A fund's value over time: its current holdings and cash (from the database)
// marked to the shared price path
async function fundHolding(symbol) {
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(process.env.MONGO_URL);
  try {
    await client.connect();
    const db = client.db("db");
    const fund = await db.collection("FundPortfolios").findOne({ fundSymbol: String(symbol).toUpperCase() });
    if (!fund) return null;
    const doc = await db.collection("FundPositions").findOne({ fundID: fund.fundID });
    const holdings = Object.fromEntries(Object.entries(doc?.positions || {})
      .map(([s, p]) => [s, parseFloat(p.shares) || 0]));
    return { holdings, cash: parseFloat(fund.availableBalance) || 0 };
  } finally {
    await client.close();
  }
}

async function fundHistory(url) {
  const [, , , symbol, period] = url.pathname.split("/"); // /api/portfolio/:symbol/:period
  const fund = await fundHolding(symbol).catch(() => null);
  if (!fund) return json({ timestamps: [], value: [] });
  const [step, span, sessionOnly] = { "1d": [300, 86400, true], "1w": [3600, 7 * 86400], "1m": [86400, 30 * 86400] }[period]
    || [86400, 30 * 86400];
  const timestamps = market.timeGrid("SPY", step, span, { sessionOnly });
  return json({ timestamps, value: timestamps.map((t) => market.portfolioValue(fund.holdings, fund.cash, t)) });
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

// Settle fund deposits and fund order fills the way the production backend would
require("./fund-processor").start({ account, settle });

console.log("[demo] Mock APIs enabled (Alpaca, Yahoo, Finnhub, fund history, SendGrid)");
