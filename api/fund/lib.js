// Helpers shared by the fund API routes (no route of its own)
const db = require('../../util/db.js');

// Runs `fn(db)` on a database connection and returns its result
async function withDb(fn) {
    let result;
    let error = null;
    await db.connect(async (conn) => {
        try {
            result = await fn(conn);
        } catch(e) {
            error = e;
        }
    });
    if(error) throw error;
    return result;
}

function isManager(fund, user) {
    return Boolean(user && fund?.portfolioManagers?.includes(user.accountID));
}

function isMember(fund, user) {
    return Boolean(user && (fund?.members?.includes(user.accountID) || isManager(fund, user)));
}

// Contributions that count toward a member's invested capital
function investedByMember(fund) {
    const totals = {};
    for(const c of fund?.contributions || []) {
        if(['canceled', 'rejected', 'deleted', 'failed'].includes(c.status)) continue;
        const amount = parseFloat(c.amount);
        if(!Number.isFinite(amount)) continue;
        totals[c.user] = (totals[c.user] || 0) + amount;
    }
    return totals;
}

const PERIOD_SECONDS = {
    '1min': 60, '5min': 300, 'hourly': 3600, 'daily': 86400, 'monthly': 30 * 86400, 'quarterly': 91 * 86400,
};

module.exports = { withDb, isManager, isMember, investedByMember, PERIOD_SECONDS };
