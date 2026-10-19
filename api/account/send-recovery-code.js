const db = require('../../util/db');
const sendgrid = require('../external/sendgrid/api');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger')

module.exports = {
    route: "/api/account/send-recovery-code",
    authenticate: false,
    post: async function (req, res) {
        try {
            const email = String(req.body.email || '').trim().toLowerCase();
            if(!email) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, error: "Email is required.", message: "email is required" });
            }

            let exists = false;
            await db.connect(async (db) => {
                exists = (await db.collection('Users').findOne({ "email": email })) != null;
            });

            if(exists) {
                await sendgrid.sendCode(email,
                    "Account Recovery", "We see you requested a password reset!");
            }

            // Same response whether or not the account exists, so this can't be used to probe for emails
            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, error: "", message: "if the account exists, a code was sent" });
        } catch (e) {
            logger.log({ level: 'error', message: e })
            SERVER_ERROR(res)
        }
    }
}
