const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');

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
                    .sort({ fundValue: -1 })
                    .limit(100)
                    .toArray();

                const managerIds = [...new Set(funds.flatMap((f) => f.portfolioManagers || []))];
                const managers = await db.collection('Users')
                    .find({ accountID: { $in: managerIds } }, { projection: { accountID: 1, firstName: 1, lastName: 1, username: 1 } })
                    .toArray();
                const names = Object.fromEntries(managers.map((m) =>
                    [m.accountID, [m.firstName, m.lastName].filter(Boolean).join(" ") || m.username]));

                const data = funds.map((f) => {
                    const value = parseFloat(f.fundValue);
                    const start = parseFloat(f.startValue);
                    const recruitEndMs = f.recruitEnd ? f.recruitEnd * 1000 : null;
                    return {
                        id: f.fundID,
                        symbol: f.fundSymbol,
                        name: f.fundName,
                        description: f.fundDescription || "",
                        value: Number.isFinite(value) ? value : null,
                        returnSinceInception: Number.isFinite(value) && Number.isFinite(start) && start ? value / start - 1 : null,
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

                res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data });
            });
        } catch (e) {
            logger.log({ level: 'error', message: e });
            if (!res.headersSent) SERVER_ERROR(res);
        }
    }
}
