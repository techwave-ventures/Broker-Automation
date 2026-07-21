import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function proxy(request: NextRequest) {
  // Bypass auth check for public property detail page (e.g. /p/[id])
  if (request.nextUrl.pathname.startsWith('/p/')) {
    return NextResponse.next();
  }

  // Bypass auth pages and API routes to avoid redirect loop or breaking API calls
  if (request.nextUrl.pathname.startsWith('/auth/') || request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Verify auth session on Express backend
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'cookie': cookieHeader,
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      return NextResponse.next();
    }
  } catch (error) {
    console.error('Proxy: failed to verify session with backend:', error);
  }

  // Redirect to local login page if not authenticated
  const loginUrl = new URL('/auth/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
