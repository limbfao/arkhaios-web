const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger')

// Shared by check-recovery-code and reset-password: finds the user only if the code matches and hasn't expired
async function findUserByRecoveryCode(email, recoveryCode) {
    email = String(email || '').trim().toLowerCase();
    recoveryCode = String(recoveryCode || '').trim();
    if(!email || !/^\d{6}$/.test(recoveryCode)) return null;

    let user = null;
    await db.connect(async (db) => {
        user = await db.collection('Users').findOne({ "email": email, "verificationCode": recoveryCode });
    });

    if(user && (!user.verificationExpiry || Date.now() >= user.verificationExpiry)) return null;
    return user;
}

module.exports = {
    route: "/api/account/check-recovery-code",
    authenticate: false,
    findUserByRecoveryCode,
    post: async function(req, res) {
        try {
            const user = await findUserByRecoveryCode(req.body.email, req.body.recoveryCode);

            if(user) res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, error: "" });
            else res.status(401).json({ status: RESPONSE_TYPE.FAILED, error: "No match" });
        } catch (e) {
            logger.log({ level: 'error', message: e })
            SERVER_ERROR(res)
        }
    }
}
