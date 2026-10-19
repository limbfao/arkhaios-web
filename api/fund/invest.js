const { logger } = require('../../util/logger.js');
const alpaca = require('../external/alpaca/api.js');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { withDb } = require('./lib.js');

// A member deposits cash into a recruiting fund: the amount is journaled from their
// brokerage account to the firm account and recorded as a contribution.
module.exports = {
    route: '/api/fund/invest',
    kyc: true,
    post: async function(req, res, user) {
        try {
            const { fundID } = req.body || {};
            const amount = Math.round(parseFloat(req.body?.amount) * 100) / 100;

            if(!Number.isFinite(amount) || amount < 1) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'Enter an amount of at least $1.00' });
            }

            const fund = await withDb((db) => db.collection('FundPortfolios').findOne({ fundID }));
            if(!fund) {
                return res.status(404).json({ status: RESPONSE_TYPE.FAILED, message: 'Fund not found' });
            }
            if(!fund.members?.includes(user.accountID)) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: 'Only members can deposit into this fund' });
            }
            if(!fund.fundRecruiting || Math.floor(Date.now() / 1000) > fund.recruitEnd) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: 'Deposits are only accepted while the fund is recruiting' });
            }

            const trading = await alpaca.get_trading_details(user.brokerageID);
            if(trading.status != 200) return SERVER_ERROR(res);
            if(parseFloat(trading.response.buying_power) < amount) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: 'Not enough buying power for this deposit' });
            }

            if(!process.env.FIRM_ACCOUNT) {
                logger.log({ level: 'error', message: "firm account not specified!" });
                return SERVER_ERROR(res);
            }

            const { response, status } = await alpaca.create_journal({
                to: process.env.FIRM_ACCOUNT,
                from: user.brokerageID,
                amount: amount.toFixed(2),
            });

            if(status != 200) {
                const message = response?.message ? `Transfer failed: ${response.message}` : 'Transfer failed';
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message });
            }

            if(['canceled', 'rejected', 'deleted'].includes(response.status)) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'Transfer was rejected' });
            }

            const contribution = {
                user: user.accountID,
                amount: amount.toFixed(2),
                time: Date.now(),
                journalID: response.id,
                status: response.status,
            };

            await withDb((db) => db.collection('FundPortfolios').updateOne({ fundID }, {
                $addToSet: { inJournals: response.id },
                $push: { contributions: contribution },
            }));

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Deposit initiated', data: contribution });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
