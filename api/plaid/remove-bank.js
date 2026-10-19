const { client, isDemoMode } = require('../plaid_configs');
const database = require('../../util/db');
const { backward } = require('../aes');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');
const { logger } = require('../../util/logger');

const bankId = (b) => b.key || `${b.institution_id || b.institution_name}-${b.mask}`;

//https://plaid.com/docs/api/items/#item-remove-request-client-id
module.exports = {
    route: '/api/plaid/remove-bank',
    authenticate: true,
    // body: { key } — the bank account's key (or institution-mask for older entries)
    post: async function(req, res, user) {
        const banks = Array.isArray(user.bank_accounts) ? user.bank_accounts.flat().filter(Boolean) : [];
        const bank = banks.find((b) => bankId(b) === req.body.key);

        if(!bank) {
            return res.status(404).json({status: RESPONSE_TYPE.FAILED, message: "bank account not found", data: ""});
        }

        const remaining = banks.filter((b) => b !== bank);
        const institution = bank.institution_id;
        // Plaid links a whole institution (an "item"); revoke it once no accounts from it remain
        const lastAtInstitution = institution && !remaining.some((b) => b.institution_id === institution);

        try {
            if(lastAtInstitution) {
                await database.connect(async (db) => {
                    const record = await db.collection('Banks').findOne({accountID: user.accountID});
                    const encrypted = record?.access_tokens?.[institution];

                    if(encrypted && !isDemoMode()) {
                        try {
                            await client.itemRemove({ access_token: await backward(encrypted) });
                        } catch(e) {
                            logger.log({ level: 'error', message: 'Plaid itemRemove: ' + (e?.response?.data?.error_message || e) });
                        }
                    }

                    await db.collection('Banks').updateOne(
                        { accountID: user.accountID },
                        { $unset: { [`access_tokens.${institution}`]: "", [`processor_tokens.${institution}`]: "" } }
                    );
                });
            }

            const ok = await database.updateUser(user, { bank_accounts: remaining });
            if(!ok) return SERVER_ERROR(res);

            res.status(200).json({status: RESPONSE_TYPE.SUCCESS, message: "bank account removed", data: remaining});
        } catch(e) {
            logger.log({ level: 'error', message: e });
            SERVER_ERROR(res);
        }
    }
}
