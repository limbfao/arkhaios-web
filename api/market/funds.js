const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');
const alpaca = require('../external/alpaca/api');
const { investedByMember } = require('../fund/lib');

// Latest prices for every fund holding; the firm account holds all funds' shares
async function firmPrices() {
    if(!process.env.FIRM_ACCOUNT) return {};
    try {
        const { response, status } = await alpaca.get_positions(process.env.FIRM_ACCOUNT);
        if(status != 200 || !Array.isArray(response)) return {};
        return Object.fromEntries(response.map((p) => [p.symbol, parseFloat(p.current_price)]));
    } catch(e) {
        return {};
    }
}

// Public fund directory for the markets pages. Only publicly listed funds, and only
// fields that are safe to show to anyone (no access codes, balances or member lists).
module.exports = {
    route: "/api/market/funds",
    authenticate: true,
    unverified: true,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');

        try {
            await db.connect(async (db) => {
                const funds = await db.collection('FundPortfolios')
                    .find({ publiclyAvailable: true })
                    .limit(100)
                    .toArray();

                // Value each fund like the fund pages do: cash plus holdings at live prices
                const [prices, positionDocs] = await Promise.all([
                    firmPrices(),
                    db.collection('FundPositions').find({ fundID: { $in: funds.map((f) => f.fundID) } }).toArray(),
                ]);
                const holdings = Object.fromEntries(positionDocs.map((d) => [d.fundID, d.positions || {}]));
                const valueOf = (f) => {
                    let total = parseFloat(f.availableBalance) || 0;
                    for(const [symbol, p] of Object.entries(holdings[f.fundID] || {})) {
                        const price = prices[symbol] ?? parseFloat(p.current_price);
                        total += (parseFloat(p.shares) || 0) * (Number.isFinite(price) ? price : 0);
                    }
                    return total;
                };

                const managerIds = [...new Set(funds.flatMap((f) => f.portfolioManagers || []))];
                const managers = await db.collection('Users')
                    .find({ accountID: { $in: managerIds } }, { projection: { accountID: 1, firstName: 1, lastName: 1, username: 1 } })
                    .toArray();
                const names = Object.fromEntries(managers.map((m) =>
                    [m.accountID, [m.firstName, m.lastName].filter(Boolean).join(" ") || m.username]));

                const data = funds.map((f) => {
                    const value = valueOf(f);
                    const contributed = Object.values(investedByMember(f)).reduce((n, v) => n + v, 0);
                    const recruitEndMs = f.recruitEnd ? f.recruitEnd * 1000 : null;
                    return {
                        id: f.fundID,
                        symbol: f.fundSymbol,
                        name: f.fundName,
                        description: f.fundDescription || "",
                        value: Number.isFinite(value) ? value : null,
                        returnSinceInception: contributed > 0 ? value / contributed - 1 : null,
                        members: (f.members || []).length,
                        managers: (f.portfolioManagers || []).map((id) => names[id]).filter(Boolean),
                        recruiting: Boolean(f.fundRecruiting) && (!recruitEndMs || recruitEndMs > Date.now()),
                        recruitEnd: recruitEndMs,
                        disbursementPeriod: f.fundDisbursementPeriod || null,
                        feeStructure: f.disbursementType || null,
                        created: f.dateCreated || null,
                        isMember: (f.members || []).includes(user.accountID) || (f.portfolioManagers || []).includes(user.accountID),
                    };
                });

                data.sort((a, b) => (b.value || 0) - (a.value || 0));
                res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data });
            });
        } catch (e) {
            logger.log({ level: 'error', message: e });
            if (!res.headersSent) SERVER_ERROR(res);
        }
    }
}
