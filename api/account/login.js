const db = require('../../util/db');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const aes = require('../aes');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { hash } = require('../hashAlgo');
const { logger } = require('../../util/logger')
const { sessionCookieOptions } = require('../../util/cookies')

const DEFAULT_SESSION = 1000 * 3600 * 5;       // 5 hours
const REMEMBERED_SESSION = 1000 * 3600 * 24 * 30; // 30 days with "Keep me signed in"

module.exports = {
    route: "/api/account/login",
    authenticate: false,
    post: async function (req, res) {
        try {
            let error = '';
            let data = {};
            let response = RESPONSE_TYPE.FAILED;

            const email = String(req.body.email || '').trim().toLowerCase();
            const password = String(req.body.password || '');
            const sessionExpiry = req.body.remember ? REMEMBERED_SESSION : DEFAULT_SESSION;

            if(!email || !password) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'email and password are required' });
            }

            let authenticate = false;
            let user = null;

            await db.connect(async (db) => {
                try {
                    user = await db.collection('Users').findOne({ email: email });

                    if (user) {
                        let { hashed } = hash(password, user.salt, user.iter);

                        if (user.password == hashed) {
                            if(user.mfaVerified) {
                                if(!req.body.mfa) data["mfa"] = true;
                                else {
                                    var base32 = await aes.backward(user.base32Secret);
                                    var verified = speakeasy.totp.verify({secret: base32,
                                                                        encoding: 'base32',
                                                                        token: req.body.mfa});
                                    if(verified) authenticate = true;
                                    else error = 'invalid mfa code';
                                }
                            } else authenticate = true;
                        } else error = 'invalid credentials';
                    } else error = 'invalid credentials';
                } catch(e) {
                    logger.log({ level: 'error', message: e })
                    error = 'server error';
                    response = RESPONSE_TYPE.ERROR;
                }
            });

            if(error != '') {
                return res.status(response === RESPONSE_TYPE.ERROR ? 500 : 401).json({status: response, message: error});
            }

            if(!authenticate) {
                // Password was correct but an authenticator code is still needed
                return res.status(200).json({ status: RESPONSE_TYPE.FAILED, message: 'mfa required', data: data });
            }

            const session = uuidv4();
            const result = await db.updateUser(user, {
                sessionToken: session,
                sessionExpiry: Date.now() + sessionExpiry
            });

            if(!result) return SERVER_ERROR(res);

            res.cookie('email', email, sessionCookieOptions(req, sessionExpiry));
            res.cookie('session', session, sessionCookieOptions(req, sessionExpiry));

            res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: { session } });
        } catch (e) {
            logger.log({ level: 'error', message: e })
            SERVER_ERROR(res)
        }
    }
}
