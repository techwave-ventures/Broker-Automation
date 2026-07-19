import { NextResponse, type NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function middleware(request: NextRequest) {
  // Bypass auth check for local development only
  if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Bypass auth check for public detail page (e.g. /p/[id])
  if (request.nextUrl.pathname.startsWith('/p/')) {
    return NextResponse.next();
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
