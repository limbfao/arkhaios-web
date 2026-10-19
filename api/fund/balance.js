const { logger } = require('../../util/logger')
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { withDb, isManager } = require('./lib.js');

// Cash available for a fund's portfolio managers to trade with
module.exports = {
    route: "/api/fund/balance",
    kyc: true,
    get: async function(req, res, user) {
        try {
            const fund = await withDb((db) => db.collection('FundPortfolios').findOne({ fundID: req.query.fund }));
            if(!fund || !isManager(fund, user)) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized", data: {} });
            }
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "", data: { balance: fund.availableBalance } });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
