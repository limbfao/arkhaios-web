const { logger } = require('../../util/logger');
const { RESPONSE_TYPE } = require('../response_type');

// Fund value history from the portfolio service: { timestamps: [unix seconds], value: [numbers] }
module.exports = {
    route: "/api/fund/history",
    kyc: true,
    get: async function(req, res, user) {
        res.setHeader('Content-Type', 'application/json');

        const period = req.query.period;
        const symbol = req.query.symbol;

        if(!symbol || !/^[A-Za-z]{1,8}$/.test(symbol)) {
            return res.status(400).json({status: RESPONSE_TYPE.FAILED, message: "symbol required"});
        }

        if(period != "1d" && period != "1w" && period != "1m") {
            return res.status(400).json({status: RESPONSE_TYPE.FAILED, message: "invalid period type"});
        }

        try {
            const response = await fetch("http://18.218.219.131" + "/api/portfolio/" + symbol.toUpperCase() + "/" + period, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": btoa(user.email + ":" + user.sessionToken)
                }
            });
            const data = await response.json();
            res.status(200).json({
                timestamps: Array.isArray(data?.timestamps) ? data.timestamps : [],
                value: Array.isArray(data?.value) ? data.value : [],
            });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            res.status(502).json({ status: RESPONSE_TYPE.ERROR, message: "Fund history is unavailable", timestamps: [], value: [] });
        }
    }
}
