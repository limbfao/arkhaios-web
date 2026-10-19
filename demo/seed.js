// Resets the local demo database and fills it with fake data.
// Usage: MONGO_URL=mongodb://localhost:27017 PEPPER=... node demo/seed.js

const { MongoClient } = require("mongodb");
const { hash } = require("../api/hashAlgo");
const market = require("./market");
const fx = require("./fixtures");

const DAY = fx.DAY;
const now = Date.now();
const [demo, priya, marcus, sofia, jordan] = fx.USERS;

const GROWTH_FUND = "fund-demo-growth-0001";
const VALUE_FUND = "fund-demo-value-0002";

const ASSETS = [
  ["AAPL", "Apple Inc.", "NASDAQ"], ["MSFT", "Microsoft Corporation", "NASDAQ"],
  ["NVDA", "NVIDIA Corporation", "NASDAQ"], ["TSLA", "Tesla, Inc.", "NASDAQ"],
  ["AMZN", "Amazon.com, Inc.", "NASDAQ"], ["GOOGL", "Alphabet Inc. Class A", "NASDAQ"],
  ["META", "Meta Platforms, Inc.", "NASDAQ"], ["NFLX", "Netflix, Inc.", "NASDAQ"],
  ["AMD", "Advanced Micro Devices, Inc.", "NASDAQ"], ["INTC", "Intel Corporation", "NASDAQ"],
  ["COST", "Costco Wholesale Corporation", "NASDAQ"], ["PEP", "PepsiCo, Inc.", "NASDAQ"],
  ["JPM", "JPMorgan Chase & Co.", "NYSE"], ["V", "Visa Inc.", "NYSE"],
  ["DIS", "The Walt Disney Company", "NYSE"], ["KO", "The Coca-Cola Company", "NYSE"],
  ["WMT", "Walmart Inc.", "NYSE"], ["BA", "The Boeing Company", "NYSE"], ["NKE", "NIKE, Inc.", "NYSE"],
  ["SPY", "SPDR S&P 500 ETF Trust", "ARCA"], ["QQQ", "Invesco QQQ Trust", "NASDAQ"],
  ["BTC/USD", "Bitcoin", "CRYPTO"], ["ETH/USD", "Ethereum", "CRYPTO"], ["SOL/USD", "Solana", "CRYPTO"],
];

function fundPosition(symbol, shares, avg) {
  const price = market.priceOf(symbol);
  return {
    symbol, asset_id: "asset-" + symbol, shares, avg_entry_price: avg.toFixed(2),
    current_price: price.toFixed(2), market_value: (shares * price).toFixed(2),
    unrealized_plpc: ((price - avg) / avg).toFixed(4),
  };
}

async function main() {
  if (!process.env.MONGO_URL || !process.env.PEPPER) {
    throw new Error("MONGO_URL and PEPPER must be set (use demo/start.sh)");
  }

  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db("db");
  await db.dropDatabase();

  // ----- Users -----
  const users = fx.USERS.map((u, i) => {
    const { hashed, salt, iter } = hash(fx.DEMO_PASSWORD, "", 0);
    return {
      ...u,
      plaidID: "plaid-" + u.accountID,
      password: hashed, salt, iter,
      emailVerified: true, verificationCode: 0,
      mfaVerified: false, kycVerified: true,
      sessionToken: null, sessionExpiry: 0,
      creationTime: now - (240 - i * 20) * DAY,
      fundsManaging: i === 0 ? [GROWTH_FUND] : i === 1 ? [VALUE_FUND] : [],
      bank_accounts: [{
        key: "bank-" + u.accountID, institution_name: "Chase", name: "Total Checking",
        mask: String(1000 + i * 1111).slice(-4), subtype: "checking",
      }],
    };
  });
  await db.collection("Users").insertMany(users);
  await db.collection("Users").createIndex({ username: 1 }, { unique: true });

  // ----- Friends -----
  await db.collection("Friends").insertMany([
    { accountID: demo.accountID, friends: [priya.accountID, marcus.accountID], receivedRequests: [sofia.accountID],
      sentRequests: [jordan.accountID], blocked: [] },
    { accountID: priya.accountID, friends: [demo.accountID, marcus.accountID], receivedRequests: [], sentRequests: [], blocked: [] },
    { accountID: marcus.accountID, friends: [demo.accountID, priya.accountID], receivedRequests: [], sentRequests: [], blocked: [] },
    { accountID: sofia.accountID, friends: [], receivedRequests: [], sentRequests: [demo.accountID], blocked: [] },
    { accountID: jordan.accountID, friends: [], receivedRequests: [demo.accountID], sentRequests: [], blocked: [] },
  ]);

  // ----- Chat history -----
  const chat = [
    [priya, "Did you see NVDA this morning? Up almost 3% pre-market."],
    [demo, "Yeah, I added 20 shares on Tuesday. Glad I didn't wait."],
    [priya, "Nice. I'm thinking of trimming some TSLA before earnings."],
    [demo, "Makes sense. I've got a limit sell sitting at 275."],
    [priya, "Also, Blue Harbor Value is recruiting again if you want to add more."],
    [demo, "I'll put another deposit in this week."],
  ];
  await db.collection("Messages").insertMany(chat.map(([from, message], i) => ({
    senderId: from.accountID,
    receiverId: from === demo ? priya.accountID : demo.accountID,
    message,
    timestamp: new Date(now - (chat.length - i) * 1800000).toISOString(),
  })));
  await db.collection("Messages").insertMany([
    { senderId: marcus.accountID, receiverId: demo.accountID, message: "Fund meeting moved to Thursday 5pm.",
      timestamp: new Date(now - 2 * DAY).toISOString() },
    { senderId: demo.accountID, receiverId: marcus.accountID, message: "Got it, see you then.",
      timestamp: new Date(now - 2 * DAY + 600000).toISOString() },
  ]);

  // ----- Funds -----
  const growthValue = market.fundValue("ARKG");
  const valueValue = market.fundValue("BHV");
  await db.collection("FundPortfolios").insertMany([
    {
      fundName: "Arkhaios Growth", fundID: GROWTH_FUND, fundSymbol: "ARKG",
      fundDescription: "A concentrated portfolio of large-cap technology and quality compounders, " +
        "rebalanced quarterly.",
      portfolioManagers: [demo.accountID], fundFounder: demo.accountID, publiclyAvailable: true,
      fundValue: growthValue, startValue: +(growthValue * 0.987).toFixed(2), accessCode: "481516",
      memberRequests: [{ user: sofia.accountID, inquiry: "I'd love to join, I follow your picks closely." },
        { user: jordan.accountID, inquiry: "Interested in long-term growth exposure." }],
      members: [demo.accountID, priya.accountID, marcus.accountID],
      fundDisbursementPeriod: "quarterly", disbursementType: "2/20",
      dateCreated: now - 75 * DAY, fundRecruiting: false, recruitEnd: Math.floor((now - 40 * DAY) / 1000),
      availableBalance: "18450.22", withdrawableFunds: "0",
      inJournals: ["jnl-demo-1", "jnl-demo-2"], outJournals: [], completedJournals: ["jnl-demo-1", "jnl-demo-2"],
    },
    {
      fundName: "Blue Harbor Value", fundID: VALUE_FUND, fundSymbol: "BHV",
      fundDescription: "Dividend-paying value stocks with a margin of safety. Currently recruiting members.",
      portfolioManagers: [priya.accountID], fundFounder: priya.accountID, publiclyAvailable: true,
      fundValue: valueValue, startValue: +(valueValue * 0.995).toFixed(2), accessCode: "271828",
      memberRequests: [], members: [priya.accountID, demo.accountID, marcus.accountID],
      fundDisbursementPeriod: "monthly", disbursementType: "1/10",
      dateCreated: now - 20 * DAY, fundRecruiting: true, recruitEnd: Math.floor((now + 10 * DAY) / 1000),
      availableBalance: "42000.00", withdrawableFunds: "0",
      inJournals: [], outJournals: [], completedJournals: [],
    },
  ]);

  await db.collection("FundPositions").insertMany([
    { fundID: GROWTH_FUND, positions: {
      MSFT: fundPosition("MSFT", 30, 405.0), GOOGL: fundPosition("GOOGL", 80, 158.0),
      JPM: fundPosition("JPM", 40, 205.0), NVDA: fundPosition("NVDA", 120, 101.3),
    } },
    { fundID: VALUE_FUND, positions: {
      KO: fundPosition("KO", 150, 64.2), PEP: fundPosition("PEP", 60, 166.0), WMT: fundPosition("WMT", 120, 71.9),
    } },
  ]);

  await db.collection("FundOrders").insertOne({ fundID: GROWTH_FUND, orders: fx.FUND_ORDER_IDS });

  await db.collection("FundAnnouncements").insertMany([
    { fundID: GROWTH_FUND, announcements: [
      { title: "Q3 rebalance complete", body: "Trimmed semis after the run-up and added to JPM. Cash is ~14% of AUM.",
        time: Math.floor((now - 3 * DAY) / 1000) },
      { title: "Welcome new members!", body: "Thanks for joining Arkhaios Growth. Monthly updates go out here.",
        time: Math.floor((now - 30 * DAY) / 1000) },
    ] },
    { fundID: VALUE_FUND, announcements: [
      { title: "Recruiting open", body: "Deposits are open for the next 10 days.", time: Math.floor((now - DAY) / 1000) },
    ] },
  ]);

  // ----- Watchlist, notifications, assets -----
  await db.collection("Watchlist").insertOne({ user: demo.accountID, watchlist: ["GOOGL", "META", "AMD", "NFLX", "COST"] });

  const notes = [
    ["Your order to buy 20 NVDA was filled at $" + market.priceOf("NVDA").toFixed(2) + ".", false, 2 * DAY],
    ["Sofia Alvarez requested to join Arkhaios Growth.", false, DAY],
    ["Deposit of $1,000.00 is being processed.", false, 3 * 3600000],
    ["Blue Harbor Value posted a new announcement.", true, DAY],
    ["Your monthly statement is available.", true, 15 * DAY],
  ];
  await db.collection("Notifications").insertMany(notes.map(([message, read, ago], i) => ({
    user: demo.brokerageID, event_id: "evt-demo-" + i, message, read, time: now - ago,
  })));

  await db.collection("Assets").insertMany(ASSETS.map(([symbol, name, exchange]) => ({
    id: "asset-" + symbol.replace("/", ""), symbol, name, exchange,
    class: exchange === "CRYPTO" ? "crypto" : "us_equity", status: "active", tradable: true,
  })));

  await client.close();
  console.log(`Seeded demo data. Log in with ${demo.email} / ${fx.DEMO_PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
