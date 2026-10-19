const { client, isDemoMode, DEMO_INSTITUTIONS } = require('../plaid_configs');
const { RESPONSE_TYPE } = require('../response_type');
const { logger } = require('../../util/logger');

//https://plaid.com/docs/api/tokens/#linktokencreate
module.exports = {
    route: '/api/plaid/generate-link-token',
    authenticate: true,
    //pre-condition: client side just needs to call this endpoint
    //post-condition: a json object is returned with the link data contained in object
    get: async function (req, res, user){
        // Demo mode: no Plaid credentials, the client shows a simulated bank picker instead
        if(isDemoMode()) {
            return res.status(200).json({ demo: true, institutions: DEMO_INSTITUTIONS });
        }

        //create an object to send to Plaid, these are the required options, but 
        //the other options that you can include are found the in Plaid Docs
        const configs = {
            user: {
                client_user_id: user.plaidID,
            },
            country_codes: ['US'],
            client_name: 'Arkhaios',
            products: ['auth'],
            language: 'en'
        };

        try {
            //this calls Plaid's API endpoint
            var tokenResponse = await client.linkTokenCreate(configs);

            //send this to the frontend so they can display the link initialization.
            //(the data object is already a JSON object, so we don't need to deconstruct it)
            res.status(201).json(tokenResponse.data);
        } catch(e) {
            logger.log({ level: 'error', message: 'Plaid link token: ' + (e?.response?.data?.error_message || e) });
            res.status(502).json({ status: RESPONSE_TYPE.ERROR, message: 'bank linking is unavailable' });
        }
    }
}
