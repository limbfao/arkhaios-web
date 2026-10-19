import { NextResponse } from 'next/server';

export function middleware(request) {

    const requestHeaders = new Headers(request.headers);
    // Full pathname (no query string) so the root layout can decide access per route
    requestHeaders.set('x-url', request.nextUrl.pathname);
    
    return NextResponse.next({
        request: {
            // Apply new request headers
            headers: requestHeaders,
        }
    });

}