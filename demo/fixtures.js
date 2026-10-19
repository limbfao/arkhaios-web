// Fixed IDs and holdings shared by the mock APIs and the seed script.

const DAY = 86400000;

module.exports = {
  FIRM_ACCOUNT: "firm-0000-demo-account",

  DEMO_PASSWORD: "demo1234",

  USERS: [
    { accountID: "demo-user-00000001", brokerageID: "brk-demo-0001", firstName: "Alex", lastName: "Rivera",
      username: "Bold-Amber-Falcon-417", email: "demo@arkhaios.test" },
    { accountID: "demo-user-00000002", brokerageID: "brk-demo-0002", firstName: "Priya", lastName: "Shah",
      username: "Calm-Teal-Otter-238", email: "priya@arkhaios.test" },
    { accountID: "demo-user-00000003", brokerageID: "brk-demo-0003", firstName: "Marcus", lastName: "Chen",
      username: "Swift-Navy-Heron-902", email: "marcus@arkhaios.test" },
    { accountID: "demo-user-00000004", brokerageID: "brk-demo-0004", firstName: "Sofia", lastName: "Alvarez",
      username: "Bright-Coral-Lynx-561", email: "sofia@arkhaios.test" },
    { accountID: "demo-user-00000005", brokerageID: "brk-demo-0005", firstName: "Jordan", lastName: "Brooks",
      username: "Quiet-Jade-Badger-774", email: "jordan@arkhaios.test" },
  ],

  // Personal brokerage holdings: symbol -> [qty, avg entry price]
  HOLDINGS: {
    AAPL: [25, 188.4],
    NVDA: [60, 96.1],
    MSFT: [12, 371.25],
    TSLA: [15, 221.0],
    AMZN: [20, 171.8],
    BTCUSD: [0.15, 52300.0],
  },

  CASH: 12480.55,

  // Fund portfolios held in the firm account: symbol -> [shares, avg entry price]
  FUNDS: {
    ARKG: { cash: 18450.22, positions: { MSFT: [30, 405.0], GOOGL: [80, 158.0], JPM: [40, 205.0], NVDA: [120, 101.3] } },
    BHV: { cash: 42000.0, positions: { KO: [150, 64.2], PEP: [60, 166.0], WMT: [120, 71.9] } },
  },

  FUND_ORDER_IDS: ["ord-fund-0001", "ord-fund-0002", "ord-fund-0003", "ord-fund-0004"],

  // Orders shown in the order history (personal + fund)
  ORDERS: [
    { id: "ord-user-0001", symbol: "NVDA", side: "buy", type: "market", qty: "20", filled: true, daysAgo: 2 },
    { id: "ord-user-0002", symbol: "AAPL", side: "buy", type: "limit", qty: "10", limit: "185.00", filled: true, daysAgo: 6 },
    { id: "ord-user-0003", symbol: "TSLA", side: "sell", type: "limit", qty: "5", limit: "275.00", filled: false, daysAgo: 1 },
    { id: "ord-user-0004", symbol: "AMZN", side: "buy", type: "market", notional: "1500", filled: true, daysAgo: 12 },
    { id: "ord-fund-0001", symbol: "MSFT", side: "buy", type: "limit", qty: "30", limit: "405.00", filled: true, daysAgo: 20 },
    { id: "ord-fund-0002", symbol: "GOOGL", side: "buy", type: "limit", qty: "80", limit: "158.00", filled: true, daysAgo: 18 },
    { id: "ord-fund-0003", symbol: "JPM", side: "buy", type: "limit", qty: "40", limit: "205.00", filled: true, daysAgo: 9 },
    { id: "ord-fund-0004", symbol: "COST", side: "buy", type: "limit", qty: "8", limit: "860.00", filled: false, daysAgo: 1 },
  ],

  DAY,
};
