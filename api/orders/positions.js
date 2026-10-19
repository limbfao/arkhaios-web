const db = require('../../util/db');
const { logger } = require('../../util/logger');
const alpaca = require('../external/alpaca/api');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');

module.exports = {
    route: "/api/positions",
    kyc: true,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');
        
        const symbol = req.query?.symbol;

        // Fund positions (members and portfolio managers), marked to the latest prices
        if(req.query?.fund) {
            let fund = null;
            let positions = null;
            try {
                await db.connect(async (db) => {
                    fund = await db.collection('FundPortfolios').findOne({ fundID: req.query.fund });
                    positions = await db.collection('FundPositions').findOne({ fundID: req.query.fund });
                });
            } catch(e) {
                logger.log({ level: 'error', message: e });
                return SERVER_ERROR(res);
            }

            const allowed = fund && (fund.members?.includes(user.accountID) || fund.portfolioManagers?.includes(user.accountID));
            if(!allowed) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized", data: [] });
            }

            const stored = positions?.positions || {};

            // Latest prices come from the firm account, which holds every fund's shares
            let live = {};
            if(process.env.FIRM_ACCOUNT && Object.keys(stored).length) {
                try {
                    const { response, status } = await alpaca.get_positions(process.env.FIRM_ACCOUNT);
                    if(status == 200 && Array.isArray(response)) {
                        live = Object.fromEntries(response.map((p) => [String(p.symbol).replace("/", ""), p]));
                    }
                } catch(e) {
                    logger.log({ level: 'error', message: e });
                }
            }

            const list = Object.entries(stored).map(([key, p]) => {
                const shares = parseFloat(p.shares ?? p.qty) || 0;
                const avg = parseFloat(p.avg_entry_price) || 0;
                const quote = live[String(p.symbol || key).replace("/", "")];
                const price = parseFloat(quote?.current_price ?? p.current_price) || 0;
                const marketValue = shares * price;
                const cost = shares * avg;
                return {
                    ...p,
                    symbol: p.symbol || key,
                    shares,
                    qty: String(shares),
                    avg_entry_price: avg.toFixed(2),
                    current_price: price.toFixed(2),
                    lastday_price: quote?.lastday_price ?? null,
                    change_today: quote?.change_today ?? null,
                    market_value: marketValue.toFixed(2),
                    cost_basis: cost.toFixed(2),
                    unrealized_pl: (marketValue - cost).toFixed(2),
                    unrealized_plpc: cost ? ((marketValue - cost) / cost).toFixed(4) : "0",
                };
            });

            if(req.query?.custom == "true") {
                return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "",
                    data: Object.fromEntries(list.map((p) => [p.symbol, p])) });
            }

            const data = symbol ? list.filter((p) => p.symbol == String(symbol).toUpperCase()) : list;
            return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "", data });
        } else {
            if (!symbol) {
                const { response, status } = await alpaca.get_positions(user.brokerageID);

                if(status == 200) {
                    res.send(JSON.stringify({status: RESPONSE_TYPE.SUCCESS, data: response}));
                } else {
                    SERVER_ERROR(res)
                }
                
            } else {
                const { response, status } = await alpaca.get_positions_symbol(user.brokerageID, symbol);
                
                if(status == 200) {
                    res.send(JSON.stringify({status: RESPONSE_TYPE.SUCCESS, data: response}));
                } else if(status == 404) {
                    // No position held in this symbol
                    res.send(JSON.stringify({status: RESPONSE_TYPE.SUCCESS, data: null}));
                } else {
                    SERVER_ERROR(res)
                }
            }
        }
    }
}