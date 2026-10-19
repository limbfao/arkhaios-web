const db = require('../../util/db.js');
const { randomInt } = require('node:crypto')
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../util/logger')
const { fundPeriods, fundType } = require('./exports.js')
const { withDb } = require('./lib.js');

// New funds open for deposits for this long before trading starts
const RECRUIT_DAYS = 14;

module.exports = {
    route: '/api/fund/create',
    kyc: true,
    post: async function(req, res, user) {
        try {
            // Required parameters: name, symbol, description, disbursement period, disbursement type, public (y/n)
            // Valid disbursement periods and types can be seen within fund/exports.js
            const body = req.body || {};
            const name = String(body.name || '').trim();
            const symbol = String(body.symbol || '').trim();
            const description = String(body.description || '').trim();
            const { disbursementPeriod, disbursementType } = body;
            const isPublic = body.public;
            const fail = (message) => res.status(400).json({ status: RESPONSE_TYPE.FAILED, message });

            if(name.length < 2 || name.length > 60) return fail("Fund name must be 2 to 60 characters");
            if(!/^[A-Z]{2,8}$/.test(symbol)) return fail("Symbol must be 2 to 8 uppercase letters");
            if(description.length < 10) return fail("Describe the fund's strategy in at least 10 characters");
            if(description.length > 1000) return fail("Descriptions are limited to 1,000 characters");
            if(!fundPeriods.includes(disbursementPeriod)) return fail("Invalid fund disbursement period");
            if(!fundType.includes(disbursementType)) return fail("Invalid fund fee structure");
            if(isPublic !== true && isPublic !== false) return fail("Invalid visibility setting");

            const now = Date.now();
            const data = {
                fundName: name,
                fundID: uuidv4(),
                fundSymbol: symbol,
                fundDescription: description,
                portfolioManagers: [user.accountID],
                fundFounder: user.accountID,
                publiclyAvailable: isPublic,
                fundValue: 0,
                startValue: 0,
                accessCode: Array.from({length: 6}, () => randomInt(10)).join(''),
                memberRequests: [],
                members: [user.accountID],
                fundDisbursementPeriod: disbursementPeriod,
                disbursementType: disbursementType,
                dateCreated: now,
                fundRecruiting: true,
                recruitEnd: Math.floor(now / 1000) + RECRUIT_DAYS * 86400,
                availableBalance: "0",
                withdrawableFunds: "0",
                inJournals: [],
                outJournals: [],
                completedJournals: [],
                contributions: [],
            };

            const outcome = await withDb(async (conn) => {
                const funds = conn.collection('FundPortfolios');
                if(await funds.findOne({ fundFounder: user.accountID })) return "You already manage a fund";
                if(await funds.findOne({ fundSymbol: symbol })) return `The symbol ${symbol} is already taken`;
                await funds.insertOne(data);
                return null;
            });

            if(outcome) return fail(outcome);

            await db.updateUser(user, { fundsManaging: data.fundID }, "$push");
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Fund created',
                data: { fundID: data.fundID, symbol } });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
