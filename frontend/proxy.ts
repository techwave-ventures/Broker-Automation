import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function proxy(request: NextRequest) {
  // Only protect dashboard routes
  if (!request.nextUrl.pathname.startsWith('/dashboard')) {
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

  // Redirect to login page if not authenticated
  const loginUrl = new URL('/auth/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
