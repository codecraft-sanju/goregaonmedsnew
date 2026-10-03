import { NextResponse, type NextRequest } from 'next/server';

/**
 * UX-only guard: sends visitors without an admin cookie to the login page.
 * Real authorisation happens in Express, which verifies the JWT on every admin request.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login' || request.cookies.has('gm_admin')) return NextResponse.next();
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
