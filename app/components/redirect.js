'use client';

// Auth redirects (signed-out -> /login, unverified -> /signup/verify, signed-in away from
// the public pages) are handled on the server in app/layout.js before anything renders.
// This component used to repeat them on the client, but it read a prop the layout never
// passed, so it never ran. It's kept as a no-op so the layout's import keeps working.
export default function Redirect() {
    return null;
}
