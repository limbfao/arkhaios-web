const { Configuration, PlaidApi, PlaidEnvironments} = require('plaid');

const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENTID,
            'PLAID-SECRET': process.env.PLAID_SANDBOX
        },
    },
});

const client = new PlaidApi(configuration);
//This needs to be changed to the arkhaios homepage. This is where the OAuth redirects to when they 
//are finished authenticating the link token. Store it in the .env file, as well as configure it in the Plaid dashboard
const PLAID_REDIRECT_URI = '';

// Local demo mode (demo/start.sh) has no Plaid credentials: bank linking is simulated instead
function isDemoMode() {
    return process.env.DEMO_MODE === '1' || process.env.PLAID_CLIENTID === 'demo';
}

// Sample institutions offered by the simulated bank link in demo mode
const DEMO_INSTITUTIONS = [
    { institution_id: 'ins_56', institution_name: 'Chase' },
    { institution_id: 'ins_127989', institution_name: 'Bank of America' },
    { institution_id: 'ins_127991', institution_name: 'Wells Fargo' },
    { institution_id: 'ins_128026', institution_name: 'Capital One' },
    { institution_id: 'ins_25', institution_name: 'Ally Bank' },
];

module.exports = {
    client,
    isDemoMode,
    DEMO_INSTITUTIONS
}
