import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware, apiSecurityMiddleware, pageSecurityMiddleware } from './src/lib/security/middleware';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Apply different security policies based on the route
  if (pathname.startsWith('/api/')) {
    return apiSecurityMiddleware(req);
  } else {
    const response = await pageSecurityMiddleware(req);
    
    // Add geo-location info for tourism features
    const country = req.geo?.country || 'FR';
    const city = req.geo?.city || 'Unknown';
    const locale = req.nextUrl.locale || 'fr';
    
    response.headers.set('X-Geo-Country', country);
    response.headers.set('X-Geo-City', city);
    response.headers.set('X-Locale', locale);
    
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};