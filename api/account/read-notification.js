const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');

module.exports = {
    route: "/api/account/read-notification",
    authenticate: true,
    // body: { id } marks one notification read, { all: true } marks every notification read
    post: async function (req, res, user) {
        if(!req.body.id && !req.body.all) {
            return res.status(400).json({status: RESPONSE_TYPE.FAILED, message: "requires id", data: {}});
        }

        if(!user.brokerageID) {
            return res.status(200).json({status: RESPONSE_TYPE.SUCCESS, message: "", data: {}});
        }

        try {
            await db.connect(async (db) => {
                try {
                    // Only the owner's notifications can be changed
                    if(req.body.all) {
                        await db.collection('Notifications').updateMany({ user: user.brokerageID, read: { $ne: true } }, { $set: { read: true } });
                    } else {
                        await db.collection('Notifications').updateOne({ event_id: String(req.body.id), user: user.brokerageID }, { $set: { read: true } });
                    }

                    return res.status(200).json({status: RESPONSE_TYPE.SUCCESS, message: "", data: {}});
                } catch(e) {
                    logger.log({
                        level: 'error',
                        message: e
                    })
        
                    SERVER_ERROR(res)
                }
            })
        } catch(e) {
            logger.log({
                level: 'error',
                message: e
            })

            SERVER_ERROR(res)
        }
    }
}
