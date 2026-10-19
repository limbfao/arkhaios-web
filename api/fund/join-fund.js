const { logger } = require('../../util/logger.js');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const { withDb, isManager } = require('./lib.js');

// type 'request': a user asks to join (private funds need the access code).
// type 'response': a portfolio manager accepts or rejects a pending request.
module.exports = {
    route: '/api/fund/join',
    kyc: true,
    post: async function(req, res, user) {
        try {
            const { fundID, type } = req.body || {};
            const fail = (code, message) => res.status(code).json({ status: RESPONSE_TYPE.FAILED, message });

            const result = await withDb(async (db) => {
                const funds = db.collection('FundPortfolios');
                const fund = await funds.findOne({ fundID });
                if(!fund) return fail(404, 'Fund not found');

                if(type == 'request') {
                    const inquiry = String(req.body.inquiry || '').trim().slice(0, 500);

                    if(fund.members?.includes(user.accountID) || isManager(fund, user)) {
                        return fail(400, 'You are already a member of this fund');
                    }
                    if((fund.memberRequests || []).some((r) => r.user == user.accountID)) {
                        return fail(400, 'You have already requested to join this fund');
                    }
                    if(!fund.publiclyAvailable && String(req.body.accessCode || '').trim() != fund.accessCode) {
                        return fail(400, 'That access code is not valid');
                    }

                    await funds.updateOne({ fundID },
                        { $addToSet: { memberRequests: { user: user.accountID, inquiry } } });
                    return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Request sent' });
                }

                if(type == 'response') {
                    if(!isManager(fund, user)) return fail(401, 'unauthorized');

                    const { requester, action } = req.body;
                    if(!(fund.memberRequests || []).some((r) => r.user == requester)) {
                        return fail(404, 'That request no longer exists');
                    }

                    if(action == 'accept') {
                        await funds.updateOne({ fundID }, {
                            $pull: { memberRequests: { user: requester } },
                            $addToSet: { members: requester },
                        });
                        await db.collection('Friends').updateOne({ accountID: fund.fundFounder },
                            { $addToSet: { friends: requester } }, { upsert: true });
                        await db.collection('Friends').updateOne({ accountID: requester },
                            { $addToSet: { friends: fund.fundFounder } }, { upsert: true });
                        return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Member accepted' });
                    }

                    if(action == 'reject') {
                        await funds.updateOne({ fundID }, { $pull: { memberRequests: { user: requester } } });
                        return res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: 'Request declined' });
                    }

                    return fail(400, 'Valid actions are accept and reject');
                }

                return fail(400, 'Invalid request type');
            });

            return result;
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
