import { NextRequest, NextResponse } from 'next/server';
import { jwtManager } from './jwt';
import { RouteAccess, JWTPayload } from './types';

export interface AuthMiddlewareConfig {
  publicRoutes: string[];
  authRoutes: string[];
  adminRoutes: string[];
  apiRoutes: string[];
  redirects: {
    signIn: string;
    signOut: string;
    afterSignIn: string;
    afterSignOut: string;
    unauthorized: string;
  };
}

export class AuthMiddleware {
  private config: AuthMiddlewareConfig;

  constructor(config: AuthMiddlewareConfig) {
    this.config = config;
  }

  /**
   * Main middleware function for Next.js
   */
  async middleware(request: NextRequest): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    const token = this.getTokenFromRequest(request);

    // Check if route is public (no auth required)
    if (this.isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Check if route is an auth route (login, register, etc.)
    if (this.isAuthRoute(pathname)) {
      // If user is already authenticated, redirect to dashboard
      if (token && jwtManager.isTokenValid(token)) {
        return NextResponse.redirect(new URL(this.config.redirects.afterSignIn, request.url));
      }
      return NextResponse.next();
    }

    // For protected routes, validate authentication
    if (!token) {
      return this.redirectToSignIn(request);
    }

    try {
      const payload = jwtManager.verifyToken(token);
      
      // Check if token is expired or about to expire
      if (jwtManager.isTokenExpired(token)) {
        return this.redirectToSignIn(request);
      }

      // Check admin routes
      if (this.isAdminRoute(pathname) && payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL(this.config.redirects.unauthorized, request.url));
      }

      // Add user info to headers for API routes
      if (this.isApiRoute(pathname)) {
        const response = NextResponse.next();
        response.headers.set('x-user-id', payload.sub);
        response.headers.set('x-user-email', payload.email);
        response.headers.set('x-user-role', payload.role);
        return response;
      }

      // Token refresh logic for near-expiry tokens
      if (jwtManager.isTokenExpiringSoon(token)) {
        const response = NextResponse.next();
        response.headers.set('x-token-refresh-needed', 'true');
        return response;
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return this.redirectToSignIn(request);
    }
  }

  /**
   * Extract JWT token from request
   */
  private getTokenFromRequest(request: NextRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const tokenCookie = request.cookies.get('auth-token');
    if (tokenCookie) {
      return tokenCookie.value;
    }

    return null;
  }

  /**
   * Check if route is public (no auth required)
   */
  private isPublicRoute(pathname: string): boolean {
    return this.config.publicRoutes.some(route => {
      if (route.endsWith('*')) {
        return pathname.startsWith(route.slice(0, -1));
      }
      return pathname === route;
    });
  }

  /**
   * Check if route is an auth route
   */
  private isAuthRoute(pathname: string): boolean {
    return this.config.authRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Check if route requires admin access
   */
  private isAdminRoute(pathname: string): boolean {
    return this.config.adminRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Check if route is an API route
   */
  private isApiRoute(pathname: string): boolean {
    return this.config.apiRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Redirect to sign-in page
   */
  private redirectToSignIn(request: NextRequest): NextResponse {
    const signInUrl = new URL(this.config.redirects.signIn, request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  /**
   * Create route protection decorator for API routes
   */
  createRouteProtection(access: RouteAccess) {
    return (handler: Function) => {
      return async (request: NextRequest, context: any) => {
        // Check if authentication is required
        if (access.requireAuth) {
          const token = this.getTokenFromRequest(request);
          
          if (!token) {
            return NextResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            );
          }

          try {
            const payload = jwtManager.verifyToken(token);

            // Check role requirements
            if (access.requireRole && payload.role !== access.requireRole) {
              return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
              );
            }

            // Add user context to request
            (request as any).user = payload;
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid authentication token' },
              { status: 401 }
            );
          }
        } else if (!access.allowAnonymous) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }

        return handler(request, context);
      };
    };
  }

  /**
   * Rate limiting middleware
   */
  createRateLimiter(options: { windowMs: number; maxRequests: number }) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (request: NextRequest): NextResponse | null => {
      const ip = this.getClientIP(request);
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Clean up old entries
      for (const [key, value] of requests.entries()) {
        if (value.resetTime < now) {
          requests.delete(key);
        }
      }

      // Get or create rate limit entry for this IP
      let entry = requests.get(ip);
      if (!entry || entry.resetTime < now) {
        entry = { count: 0, resetTime: now + options.windowMs };
        requests.set(ip, entry);
      }

      // Check if limit exceeded
      if (entry.count >= options.maxRequests) {
        return NextResponse.json(
          { 
            error: 'Too many requests',
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
              'X-RateLimit-Limit': options.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': entry.resetTime.toString(),
            }
          }
        );
      }

      // Increment counter
      entry.count++;

      return null; // Continue to next middleware
    };
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    // Check various headers for real IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    // Fallback to request IP
    return request.ip || 'unknown';
  }

  /**
   * CSRF protection middleware
   */
  createCSRFProtection() {
    return (request: NextRequest): NextResponse | null => {
      // Skip CSRF for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return null;
      }

      const csrfToken = request.headers.get('x-csrf-token') || request.cookies.get('csrf-token')?.value;
      const sessionToken = this.getTokenFromRequest(request);

      if (!csrfToken || !sessionToken) {
        return NextResponse.json(
          { error: 'CSRF token missing' },
          { status: 403 }
        );
      }

      // In a real implementation, you would validate the CSRF token
      // For now, we'll just check if it exists
      if (csrfToken.length < 32) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }

      return null;
    };
  }
}

// Default configuration
export const defaultAuthMiddlewareConfig: AuthMiddlewareConfig = {
  publicRoutes: [
    '/',
    '/search',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/api/health',
    '/api/search*',
    '/_next*',
    '/favicon.ico',
  ],
  authRoutes: [
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
  ],
  adminRoutes: [
    '/admin',
    '/api/admin',
  ],
  apiRoutes: [
    '/api',
  ],
  redirects: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    afterSignIn: '/dashboard',
    afterSignOut: '/',
    unauthorized: '/unauthorized',
  },
};

// Create middleware instance
export const authMiddleware = new AuthMiddleware(defaultAuthMiddlewareConfig);