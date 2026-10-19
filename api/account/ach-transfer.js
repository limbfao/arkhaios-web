const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js')
const alpaca = require('../external/alpaca/api.js');
const db = require('../../util/db.js');
const logger = require('../../util/logger.js');
const { backward } = require('../aes.js');
const { isDemoMode } = require('../plaid_configs.js');

function failed(res, message) {
    return res.status(400).send({ status: RESPONSE_TYPE.FAILED, message, data: {} });
}

module.exports = {
    route: '/api/account/ach-transfer',
    kyc: true,
    post: async function(req, res, user) {
        const amount = parseFloat(req.body.amount);

        if(!req.body.institution) {
            return failed(res, 'invalid institution');
        } else if(req.body.type != 'checking' && req.body.type != 'savings') {
            return failed(res, 'expected checking or savings account');
        } else if(req.body.direction != 'incoming' && req.body.direction != 'outgoing') {
            return failed(res, 'expected incoming or outgoing direction');
        } else if(!Number.isFinite(amount) || amount <= 0) {
            return failed(res, 'enter an amount greater than zero');
        }

        const { response, status } = await alpaca.get_ach_relationships(user.brokerageID);
        if(status != 200) return SERVER_ERROR(res);

        // Alpaca allows one ACH relationship at a time: replace it with the selected bank
        const relationship = response[0];
        if(relationship?.id) {
            const { status } = await alpaca.delete_ach_relationship(user.brokerageID, relationship.id);
            if(status != 200 && status != 204) {
                return SERVER_ERROR(res);
            }
        }

        let token = null;

        await db.connect(async (db) => {
            try {
                let banks = await db.collection('Banks').findOne({accountID: user.accountID});

                if(banks?.processor_tokens?.[req.body.institution]) {
                    token = await backward(banks.processor_tokens[req.body.institution]);
                }
            } catch(e) {
                logger.log({
                    level: 'error',
                    message: e
                })
            }
        });

        // Demo mode has no Plaid processor tokens for the seeded banks; the mocked Alpaca accepts any token
        if(!token && isDemoMode()) token = 'processor-sandbox-demo';

        if(!token) {
            return failed(res, 'this bank account needs to be linked again');
        }

        const created = await alpaca.create_ach_relationship(user.brokerageID, {
            processor_token: token,
            bank_account_type: req.body.type.toUpperCase()
        });

        if(created.status != 200 || !created.response?.id) {
            return SERVER_ERROR(res);
        }

        const transfer = await alpaca.create_transfer(user.brokerageID, {
            transfer_type: "ach",
            relationship_id: created.response.id,
            amount: amount.toFixed(2),
            direction: req.body.direction.toUpperCase(),
            timing: "immediate"
        });

        if(transfer.status == 200) {
            res.status(200).send({
                status: RESPONSE_TYPE.SUCCESS,
                message: 'transfer initiated',
                data: transfer.response
            });
        } else if(transfer.status >= 400 && transfer.status < 500) {
            // e.g. "insufficient funds for withdrawal"
            return failed(res, transfer.response?.message || 'the transfer was rejected');
        } else {
            return SERVER_ERROR(res);
        }
    }
}
