const { randomUUID } = require('crypto');
const db = require('../../util/db');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type');

const RELATIONSHIPS = ['spouse', 'child', 'parent', 'sibling', 'other'];

function list(user) {
    return Array.isArray(user.beneficiaries) ? user.beneficiaries : [];
}

// Beneficiaries who receive the account if the owner dies. Shares must total 100%.
module.exports = {
    route: '/api/account/beneficiaries',
    authenticate: true,
    get: async function(req, res, user) {
        res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: list(user) });
    },
    // body: { action: "add", name, relationship, share } or { action: "remove", id }
    post: async function(req, res, user) {
        const current = list(user);
        let next;

        if(req.body.action === 'remove') {
            next = current.filter((b) => b.id !== req.body.id);
        } else if(req.body.action === 'add') {
            const name = String(req.body.name || '').trim().slice(0, 80);
            const relationship = String(req.body.relationship || '');
            const share = Math.round(Number(req.body.share));
            const allocated = current.reduce((sum, b) => sum + b.share, 0);

            if(name.length < 2) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'Enter the beneficiary\'s full name.' });
            }
            if(!RELATIONSHIPS.includes(relationship)) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'Choose a relationship.' });
            }
            if(!Number.isFinite(share) || share < 1 || share > 100 - allocated) {
                return res.status(400).json({ status: RESPONSE_TYPE.FAILED,
                    message: `Share must be between 1% and ${100 - allocated}%.` });
            }
            next = [...current, { id: randomUUID(), name, relationship, share, added: Date.now() }];
        } else {
            return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'unknown action' });
        }

        const ok = await db.updateUser(user, { beneficiaries: next });
        if(!ok) return SERVER_ERROR(res);
        res.status(200).json({ status: RESPONSE_TYPE.SUCCESS, message: '', data: next });
    }
};
