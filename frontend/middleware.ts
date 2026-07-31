import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup');

  if (!isDashboardRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Verify auth session on Express backend
  let isLoggedIn = false;
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'cookie': cookieHeader,
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      isLoggedIn = true;
    }
  } catch (error) {
    console.error('Middleware: failed to verify session with backend:', error);
  }

  // 1. If user is logged in and trying to access login/signup pages, redirect to dashboard
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If user is not logged in and trying to access dashboard, redirect to login
  if (!isLoggedIn && isDashboardRoute) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.set('session_token', '', { maxAge: 0, path: '/' });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/login',
    '/auth/signup',
  ],
};
