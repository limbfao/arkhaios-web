// Options for the session cookies (email/session).
// Production keeps cross-site friendly settings; local dev (http://localhost,
// *.local.test) uses host-only, lax cookies so browsers accept them over http.
function sessionCookieOptions(req, maxAge) {
    const options = process.env.NODE_ENV === 'production'
        ? { httpOnly: true, sameSite: 'none', domain: req.hostname, secure: true }
        : { httpOnly: true, sameSite: 'lax', secure: req.secure };

    if(maxAge !== undefined) options.maxAge = maxAge;

    return options;
}

module.exports = { sessionCookieOptions };
