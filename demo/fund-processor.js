// Demo stand-in for the backend job that settles fund activity. Every few seconds:
// - executed deposit journals are credited to the fund's available cash
// - filled fund orders update the fund's holdings (FundPositions) and cash:
//   buys reserved limit x qty when placed, so any price improvement is refunded;
//   sells credit their proceeds
// Orders that existed before the processor first saw a fund are treated as settled.

const { MongoClient } = require("mongodb");

const INTERVAL_MS = 5000;
const round2 = (n) => Math.round(n * 100) / 100;

async function processFunds(broker) {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  try {
    const db = client.db("db");
    const firm = broker.account(process.env.FIRM_ACCOUNT);
    broker.settle(firm);
    const brokerOrders = Object.fromEntries(firm.orders.map((o) => [o.id, o]));

    for (const fund of await db.collection("FundPortfolios").find({}).toArray()) {
      let cash = parseFloat(fund.availableBalance) || 0;
      let changed = false;

      // Deposits: journals are executed by the broker immediately
      const completed = new Set(fund.completedJournals || []);
      for (const contribution of fund.contributions || []) {
        const id = contribution.journalID;
        if (!id || completed.has(id) || ["canceled", "rejected", "deleted", "failed"].includes(contribution.status)) continue;
        cash += parseFloat(contribution.amount) || 0;
        completed.add(id);
        changed = true;
      }

      // Orders
      const fundOrders = await db.collection("FundOrders").findOne({ fundID: fund.fundID });
      const orderIds = fundOrders?.orders || [];
      let processed = fundOrders?.processedOrders;
      if (fundOrders && !processed) {
        // First run for this fund: everything already there counts as settled
        await db.collection("FundOrders").updateOne({ fundID: fund.fundID }, { $set: { processedOrders: orderIds } });
        processed = orderIds;
      }
      const done = new Set(processed || []);
      const positionsDoc = await db.collection("FundPositions").findOne({ fundID: fund.fundID });
      const positions = { ...(positionsDoc?.positions || {}) };
      let positionsChanged = false;

      for (const id of orderIds) {
        if (done.has(id)) continue;
        const order = brokerOrders[id];
        if (!order) continue;
        if (order.status === "canceled" || order.status === "rejected" || order.status === "expired") {
          done.add(id); // the cancel route already refunded the reserved cash
          continue;
        }
        if (order.status !== "filled") continue;

        const qty = parseFloat(order.filled_qty);
        const fillPrice = parseFloat(order.filled_avg_price);
        const p = positions[order.symbol] || { symbol: order.symbol, asset_id: "asset-" + order.symbol, shares: 0, avg_entry_price: "0" };
        const shares = parseFloat(p.shares) || 0;
        const avg = parseFloat(p.avg_entry_price) || 0;

        if (order.side === "buy") {
          const newShares = shares + qty;
          p.avg_entry_price = ((shares * avg + qty * fillPrice) / newShares).toFixed(2);
          p.shares = +newShares.toFixed(6);
          cash += Math.max(0, (parseFloat(order.limit_price) || fillPrice) - fillPrice) * qty;
        } else {
          p.shares = +Math.max(0, shares - qty).toFixed(6);
          cash += fillPrice * qty;
        }

        p.current_price = fillPrice.toFixed(2);
        p.market_value = (p.shares * fillPrice).toFixed(2);
        if (p.shares > 0) positions[order.symbol] = p;
        else delete positions[order.symbol];

        done.add(id);
        positionsChanged = changed = true;
      }

      if (positionsChanged) {
        await db.collection("FundPositions").updateOne({ fundID: fund.fundID }, { $set: { positions } }, { upsert: true });
      }
      if (fundOrders && done.size !== (processed || []).length) {
        await db.collection("FundOrders").updateOne({ fundID: fund.fundID }, { $set: { processedOrders: [...done] } });
      }
      if (changed) {
        await db.collection("FundPortfolios").updateOne({ fundID: fund.fundID }, {
          $set: { availableBalance: round2(cash).toFixed(2), completedJournals: [...completed] },
        });
      }
    }
  } finally {
    await client.close();
  }
}

function start(broker) {
  if (!process.env.MONGO_URL || !process.env.FIRM_ACCOUNT) return;
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processFunds(broker);
    } catch (e) {
      console.error("[demo] fund processor:", e.message);
    } finally {
      running = false;
    }
  }, INTERVAL_MS).unref();
}

module.exports = { start, processFunds };
