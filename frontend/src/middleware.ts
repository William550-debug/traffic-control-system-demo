import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_KEY    = 'cmd_center_user_id';
const PROTECTED      = ['/operator', '/wall'];
const PUBLIC_ONLY    = ['/login'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // sessionStorage is client-only — we use a cookie mirror instead.
    // The login page sets this cookie; logout clears it.
    const sessionCookie = request.cookies.get(SESSION_KEY)?.value;
    const isAuthed      = !!sessionCookie;

    const isProtected = PROTECTED.some(p => pathname.startsWith(p));
    const isPublicOnly = PUBLIC_ONLY.some(p => pathname.startsWith(p));

    // Not logged in → trying to access protected route
    if (isProtected && !isAuthed) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
    }

    // Already logged in → trying to access login page
    if (isPublicOnly && isAuthed) {
        return NextResponse.redirect(new URL('/operator', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/operator/:path*', '/wall/:path*', '/login'],
};