const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { logger } = require('../../util/logger')
const { withDb, isManager, investedByMember } = require('./lib.js');

// Members, managers and pending join requests of a fund (portfolio managers only).
// Each member carries the capital they have contributed (`invested`).
module.exports = {
    route: '/api/fund/members',
    kyc: true,
    get: async function(req, res, user) {
        try {
            const id = req.query.id;

            const result = await withDb(async (db) => {
                const fund = await db.collection('FundPortfolios').findOne({ fundID: id });
                if(!fund || !isManager(fund, user)) return null;

                const ids = [...new Set([
                    ...(fund.members || []),
                    ...(fund.portfolioManagers || []),
                    ...(fund.memberRequests || []).map((r) => r.user),
                ])];

                const list = ids.length ? await db.collection('Users').find(
                    { accountID: { $in: ids } },
                    { projection: { accountID: 1, firstName: 1, lastName: 1, username: 1 } }
                ).toArray() : [];
                const byId = Object.fromEntries(list.map((u) => [u.accountID, u]));
                const invested = investedByMember(fund);

                const person = (accountID) => {
                    const u = byId[accountID];
                    return {
                        id: accountID,
                        name: u ? `${u.firstName} ${u.lastName}` : 'Unknown user',
                        username: u?.username || null,
                    };
                };

                return {
                    members: (fund.members || []).filter((m) => byId[m]).map((m) => ({
                        ...person(m),
                        invested: +(invested[m] || 0).toFixed(2),
                        manager: (fund.portfolioManagers || []).includes(m),
                    })),
                    managers: (fund.portfolioManagers || []).filter((m) => byId[m]).map(person),
                    requests: (fund.memberRequests || []).filter((r) => byId[r.user]).map((r) => ({
                        ...person(r.user),
                        inquiry: r.inquiry || '',
                    })),
                    totalInvested: +Object.values(invested).reduce((n, v) => n + v, 0).toFixed(2),
                };
            });

            if(!result) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized" });
            }

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "", data: result });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
