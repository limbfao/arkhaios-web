const db = require('../../util/db');
const { logger } = require('../../util/logger');
const { hash } = require('../hashAlgo');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { findUserByRecoveryCode } = require('./check-recovery-code');

module.exports =  {
    route: "/api/account/reset-password",
    authenticate: false,
    post: async function (req, res) {
        try {
            const { recoveryCode, email } = req.body;
            const password = String(req.body.password || '');

            if(password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: "password must be at least 8 characters and include a letter and a number", data: "" });
            }

            // Re-check the code here; the earlier check-recovery-code call is only for the UI
            const user = await findUserByRecoveryCode(email, recoveryCode);
            if(!user) {
                return res.status(401).json({ status: RESPONSE_TYPE.FAILED, message: "recovery code is invalid or has expired", data: "" });
            }

            const { hashed, salt, iter } = hash(password, '', 0);

            // New password, one-time code consumed, and any existing session signed out
            const result = await db.updateUser(user, {
                password: hashed,
                salt: salt,
                iter: iter,
                verificationCode: null,
                verificationExpiry: 0,
                sessionExpiry: Date.now()
            });

            if(!result) return SERVER_ERROR(res);

            const key = `authenticate:${user.email}`;
            try { if(await db.redis_get(key)) await db.redis_del(key); } catch(e) {}

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: "password reset", data: "" });
        } catch(e) {
            logger.log({ level: 'error', message: e })
            SERVER_ERROR(res);
        }
    }
}
