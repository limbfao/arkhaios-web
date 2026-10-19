const { randomUUID } = require('crypto');
const database = require('../../util/db');
const { forward } = require('../aes');
const { isDemoMode, DEMO_INSTITUTIONS } = require('../plaid_configs');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');

// Demo mode only: links a sample bank account without Plaid. Stores the same shape as
// public-token-exchange (bank_accounts on the user, a processor token in Banks)
module.exports = {
    route: '/api/plaid/demo-link',
    authenticate: true,
    post: async function (req, res, user) {
        if(!isDemoMode()) {
            return res.status(404).json({ status: RESPONSE_TYPE.FAILED, message: 'not available' });
        }

        const institution = DEMO_INSTITUTIONS.find((i) => i.institution_id === req.body.institution_id);
        const subtype = req.body.subtype === 'savings' ? 'savings' : 'checking';
        if(!institution) {
            return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'unknown institution' });
        }

        const account = {
            key: 'bank-' + randomUUID(),
            institution_name: institution.institution_name,
            institution_id: institution.institution_id,
            name: subtype === 'savings' ? 'High Yield Savings' : 'Everyday Checking',
            mask: String(Math.floor(1000 + Math.random() * 9000)),
            subtype,
        };

        try {
            const token = await forward('processor-sandbox-' + randomUUID());
            await database.connect(async (db) => {
                await db.collection('Banks').updateOne(
                    { accountID: user.accountID },
                    { $set: { [`processor_tokens.${institution.institution_id}`]: token } },
                    { upsert: true }
                );
            });
            await database.updateUser(user, { bank_accounts: account }, '$push');

            res.status(201).json({ status: RESPONSE_TYPE.SUCCESS, message: `${institution.institution_name} linked`, data: account });
        } catch(e) {
            SERVER_ERROR(res);
        }
    }
};
