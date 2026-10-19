const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');

// Withdraws a friend request the current user sent
module.exports = {
    route: "/api/friends/cancel",
    authenticate: true,
    post: async function(req, res, user) {
        const id = String(req.body.id || '');

        try {
            await db.connect(async (db) => {
                try {
                    const self = await db.collection('Friends').findOne({ accountID: user.accountID });

                    if(!self?.sentRequests?.includes(id)) {
                        return res.status(400).json({status: RESPONSE_TYPE.FAILED, message: "no pending request to this user", data: {}});
                    }

                    await db.collection('Friends').updateOne({ accountID: user.accountID }, { $pull: { sentRequests: id } });
                    await db.collection('Friends').updateOne({ accountID: id }, { $pull: { receivedRequests: user.accountID } });

                    res.status(200).json({status: RESPONSE_TYPE.SUCCESS, message: "request canceled", data: {}});
                } catch(e) {
                    logger.log({ level: 'error', message: e });
                    SERVER_ERROR(res);
                }
            });
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
};
