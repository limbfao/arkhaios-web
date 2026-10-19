const { randomInt } = require('node:crypto');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { logger } = require('../../util/logger')
const { withDb, isManager } = require('./lib.js');

const newAccessCode = () => Array.from({ length: 6 }, () => randomInt(10)).join('');

function settingsOf(fund) {
    return {
        id: fund.fundID,
        name: fund.fundName,
        symbol: fund.fundSymbol,
        description: fund.fundDescription || '',
        publiclyAvailable: Boolean(fund.publiclyAvailable),
        accessCode: fund.accessCode,
    };
}

// Fund settings for its portfolio managers: description, visibility and access code
module.exports = {
    route: '/api/fund/settings',
    kyc: true,

    get: async function(req, res, user) {
        try {
            const fund = await withDb((db) => db.collection('FundPortfolios').findOne({ fundID: req.query.id }));
            if(!fund || !isManager(fund, user)) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized" });
            }
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "", data: settingsOf(fund) });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    },

    // Body: { id, description?, publiclyAvailable?, regenerateAccessCode? }
    post: async function(req, res, user) {
        try {
            const { id, description, publiclyAvailable, regenerateAccessCode } = req.body || {};
            const update = {};

            if(description !== undefined) {
                const text = String(description).trim();
                if(text.length < 10) {
                    return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                        message: "Describe the fund in at least 10 characters" });
                }
                if(text.length > 1000) {
                    return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                        message: "Descriptions are limited to 1,000 characters" });
                }
                update.fundDescription = text;
            }
            if(publiclyAvailable !== undefined) {
                if(typeof publiclyAvailable !== 'boolean') {
                    return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: "Invalid visibility setting" });
                }
                update.publiclyAvailable = publiclyAvailable;
            }
            if(regenerateAccessCode) update.accessCode = newAccessCode();

            if(!Object.keys(update).length) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: "Nothing to update" });
            }

            const fund = await withDb(async (db) => {
                const existing = await db.collection('FundPortfolios').findOne({ fundID: id });
                if(!existing || !isManager(existing, user)) return null;
                await db.collection('FundPortfolios').updateOne({ fundID: id }, { $set: update });
                return { ...existing, ...update };
            });

            if(!fund) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized" });
            }
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "Settings saved", data: settingsOf(fund) });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
