const db = require('../../util/db');

const sendgrid = require('../external/sendgrid/api');
const { RESPONSE_TYPE } = require('../response_type');

module.exports = {
    route: '/api/account/verify',
    authenticate: true,
    unverified: true,
    post: async function(req, res, user) {
        if(user.emailVerified === true) {
            res.status(401).json({
                status: RESPONSE_TYPE.FAILED,
                message: "email has already been verified",
                data: {}
            });
        } else if (req.body.resend == true) {
            await sendgrid.sendCode(user.email,
                "Your Verification Code", "Here is your new verification code.");

            res.status(200).json({
                status: RESPONSE_TYPE.SUCCESS,
                message: "a new verification code has been sent",
                data: {}
            })
        } else if(!user.verificationExpiry || Date.now() >= user.verificationExpiry) {
            res.status(401).json({
                status: RESPONSE_TYPE.FAILED,
                message: "verification code has expired",
                data: {}
            })
        } else {
            const code = String(req.body.verificationCode || '').trim();
            if(code.length === 6 && String(user.verificationCode) === code) {
                // Clear the code so it can't be reused (it shares a field with password recovery)
                await db.updateUser(user, {
                    emailVerified: true,
                    verificationCode: null,
                    verificationExpiry: 0
                })

                res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: {} });
            } else {
                res.status(200).json({ status: RESPONSE_TYPE.FAILED, message: "invalid verification code", data: {}});
            }
        }
    }
}
