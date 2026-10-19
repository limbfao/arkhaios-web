const BigNumber = require('bignumber.js');
const alpaca = require('../external/alpaca/api.js');
const { logger } = require('../../util/logger');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js');
const { withDb, isManager } = require('./lib.js');

// Cancels an open fund order (portfolio managers only). For buy orders the unfilled
// part of the reserved cost goes back to the fund's available cash.
module.exports = {
    route: '/api/fund/cancel-order',
    kyc: true,
    post: async function(req, res, user) {
        try {
            const { fundID, order: orderID } = req.body || {};
            const { fund, orders } = await withDb(async (db) => ({
                fund: await db.collection('FundPortfolios').findOne({ fundID }),
                orders: await db.collection('FundOrders').findOne({ fundID }),
            }));

            if(!fund || !isManager(fund, user) || !orders?.orders?.includes(orderID)) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: 'unauthorized' });
            }
            if(!process.env.FIRM_ACCOUNT) return SERVER_ERROR(res);

            const current = await alpaca.get_order(process.env.FIRM_ACCOUNT, orderID);
            if(current.status != 200) {
                return res.status(404).json({ status: RESPONSE_TYPE.FAILED, message: 'Order not found' });
            }

            const { response, status } = await alpaca.cancel_order(process.env.FIRM_ACCOUNT, orderID);
            if(status != 200 && status != 204) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: response?.message || 'This order can no longer be canceled' });
            }

            const order = current.response;
            if(order.side == 'buy' && order.limit_price) {
                const unfilled = new BigNumber(order.qty || 0).minus(order.filled_qty || 0);
                const refund = unfilled.times(order.limit_price);
                if(refund.gt(0)) {
                    const balance = new BigNumber(fund.availableBalance || 0).plus(refund).decimalPlaces(2).toFixed(2);
                    await withDb((db) => db.collection('FundPortfolios').updateOne({ fundID },
                        { $set: { availableBalance: balance } }));
                }
            }

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Order canceled' });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
