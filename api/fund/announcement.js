const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { logger } = require('../../util/logger')
const { withDb, isManager, isMember } = require('./lib.js');

module.exports = {
    route: '/api/fund/announcement',
    kyc: true,

    // Announcements of a fund, newest first. Visible to members and, for public funds, everyone.
    get: async function(req, res, user) {
        try {
            const id = req.query.id;
            const result = await withDb(async (db) => {
                const fund = await db.collection('FundPortfolios').findOne({ fundID: id });
                if(!fund || (!fund.publiclyAvailable && !isMember(fund, user))) return null;
                const doc = await db.collection('FundAnnouncements').findOne({ fundID: id });
                return (doc?.announcements || []).slice().sort((a, b) => (b.time || 0) - (a.time || 0));
            });

            if(!result) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "unauthorized", data: [] });
            }
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "", data: result });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    },

    post: async function(req, res, user) {
        try {
            const id = req.body.id;
            const title = String(req.body.title || '').trim();
            const body = String(req.body.body || '').trim();

            if(!title || !body) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: "Add a subject and a message" });
            }
            if(title.length > 120 || body.length > 2000) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: "Subjects are limited to 120 characters and messages to 2,000" });
            }

            const announcement = { title, body, time: Math.floor(Date.now() / 1000) };

            const posted = await withDb(async (db) => {
                const fund = await db.collection('FundPortfolios').findOne({ fundID: id });
                if(!fund || !isManager(fund, user)) return null;
                const response = await db.collection('FundAnnouncements').updateOne({ fundID: id },
                    { $push: { announcements: announcement } }, { upsert: true });
                return response.acknowledged;
            });

            if(posted === null) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "Unauthorized" });
            }
            if(!posted) {
                return res.status(500).json({ status: RESPONSE_TYPE.FAILED, message: 'Unable to post announcement' });
            }

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Announcement posted', data: announcement });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
