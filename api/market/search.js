const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger')

const LIMIT = 6;

// User input goes into a regex, so escape it (an unescaped "(" used to throw)
function startsWith(text) {
    return { $regex: "^" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

module.exports = {
    route: "/api/search",
    authenticate: true,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');
        const raw = String(req.query.query || "").trim();

        // "F:" searches funds, anything else searches stocks and crypto
        const fundSearch = raw.toUpperCase().startsWith("F:");
        const query = (fundSearch ? raw.substring(2) : raw).trim().slice(0, 50);

        if(!query) {
            return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: [] });
        }

        try {
            await db.connect(async (db) => {
                try {
                    let results;

                    if(fundSearch) {
                        const funds = await db.collection('FundPortfolios')
                            .find({ publiclyAvailable: true, $or: [{ fundName: startsWith(query) }, { fundSymbol: startsWith(query) }] })
                            .limit(LIMIT).toArray();

                        results = funds.map((fund) => ({
                            id: fund.fundID,
                            symbol: fund.fundSymbol,
                            name: fund.fundName,
                            exchange: "FUNDS"
                        }));
                    } else {
                        // Symbol matches first, then name matches that aren't already listed
                        const assets = db.collection('Assets');
                        results = await assets.find({ symbol: startsWith(query) })
                            .sort({ symbol: 1 }).limit(LIMIT).toArray();

                        if(results.length < LIMIT) {
                            results = results.concat(await assets
                                .find({ name: startsWith(query), symbol: { $nin: results.map((r) => r.symbol) } })
                                .sort({ symbol: 1 }).limit(LIMIT - results.length).toArray());
                        }

                        results = results.map(({ _id, ...asset }) => asset);
                    }

                    res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: results });
                } catch(e) {
                    logger.log({
                        level: 'error',
                        message: e
                    })
                }
            });
        } catch(e) {
            logger.log({
                level: 'error',
                message: e
            })
        }

        if(!res.headersSent) {
            SERVER_ERROR(res)
        }
    }
}
