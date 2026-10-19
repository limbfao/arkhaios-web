const alpaca = require('../external/alpaca/api.js');
const { RESPONSE_TYPE, SERVER_ERROR } = require('../response_type.js');

module.exports = {
    route: '/api/account/document',
    kyc: true,
    get: async function(req, res, user) {
        const id = String(req.query.id || '');
        if(!/^[\w-]+$/.test(id)) {
            return res.status(400).json({ status: RESPONSE_TYPE.FAILED, message: 'invalid document id' });
        }

        const { response, status } = await alpaca.get_document(user.brokerageID, id);

        if(status == 200) {
            // ?download=1 saves the file; otherwise it opens in the browser's PDF viewer
            const name = String(req.query.name || id).replace(/[^\w.-]+/g, '-').slice(0, 80);
            const disposition = req.query.download ? 'attachment' : 'inline';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `${disposition}; filename="${name}.pdf"`);
            res.status(200).send(Buffer.from(response));
        } else {
            SERVER_ERROR(res)
        }
    }
}
