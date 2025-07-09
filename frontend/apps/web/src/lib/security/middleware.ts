import { NextRequest, NextResponse } from 'next/server';
import { getSecurityHeaders } from './csp';
import { createRateLimiter, rateLimitConfigs, createRateLimitHeaders, type RateLimitConfig } from './rate-limit';

export interface SecurityMiddlewareConfig {
  enableCSP?: boolean;
  enableRateLimit?: boolean;
  rateLimitByPath?: Record<string, RateLimitConfig>;
  trustedDomains?: string[];
  blockedIPs?: string[];
  enableBotProtection?: boolean;
}

const defaultConfig: SecurityMiddlewareConfig = {
  enableCSP: true,
  enableRateLimit: true,
  rateLimitByPath: {
    '/api/auth': rateLimitConfigs.auth,
    '/api/contact': rateLimitConfigs.contact,
    '/api/upload': rateLimitConfigs.upload,
    '/api/search': rateLimitConfigs.search,
    '/api': rateLimitConfigs.api,
  },
  trustedDomains: ['datatourisme.fr', 'www.datatourisme.fr'],
  blockedIPs: [],
  enableBotProtection: true,
};

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return req.ip || 'unknown';
}

function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /nodejs/i,
    /headless/i,
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
}

function isSuspiciousRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  
  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    return true;
  }
  
  // Check for suspicious patterns in URL
  const url = req.nextUrl.pathname.toLowerCase();
  const suspiciousPatterns = [
    '/wp-admin',
    '/wp-content',
    '/.env',
    '/config',
    '/admin',
    '/phpmyadmin',
    '/.git',
    '/vendor',
    '/uploads',
    '/tmp',
    '/backup',
    '/database',
    '/sql',
    '/shell',
    '/../',
    '/etc/passwd',
    '/proc/version',
  ];
  
  if (suspiciousPatterns.some(pattern => url.includes(pattern))) {
    return true;
  }
  
  // Check for SQL injection patterns in query parameters
  const searchParams = req.nextUrl.searchParams.toString().toLowerCase();
  const sqlPatterns = [
    'union select',
    'or 1=1',
    'drop table',
    'insert into',
    'delete from',
    'update set',
    'script>',
    'javascript:',
    'onload=',
    'onerror=',
  ];
  
  if (sqlPatterns.some(pattern => searchParams.includes(pattern))) {
    return true;
  }
  
  return false;
}

export async function securityMiddleware(
  req: NextRequest,
  config: SecurityMiddlewareConfig = defaultConfig
): Promise<NextResponse> {
  const response = NextResponse.next();
  const clientIP = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || '';
  const pathname = req.nextUrl.pathname;
  
  // Block suspicious requests early
  if (isSuspiciousRequest(req)) {
    console.warn(`Suspicious request blocked: ${clientIP} ${pathname}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Block known bad IPs
  if (config.blockedIPs?.includes(clientIP)) {
    console.warn(`Blocked IP attempted access: ${clientIP}`);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Bot protection (allow search engine bots but block scrapers)
  if (config.enableBotProtection && isBot(userAgent)) {
    // Allow legitimate search engine bots
    const allowedBots = [
      'googlebot',
      'bingbot',
      'slurp', // Yahoo
      'duckduckbot',
      'baiduspider',
      'yandexbot',
      'facebookexternalhit',
      'twitterbot',
      'linkedinbot',
    ];
    
    const isAllowedBot = allowedBots.some(bot => 
      userAgent.toLowerCase().includes(bot)
    );
    
    if (!isAllowedBot) {
      console.warn(`Suspicious bot blocked: ${clientIP} ${userAgent}`);
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  // Apply rate limiting
  if (config.enableRateLimit && config.rateLimitByPath) {
    // Find the most specific rate limit config for this path
    let rateLimitConfig = rateLimitConfigs.default;
    let matchedPath = '';
    
    for (const [path, pathConfig] of Object.entries(config.rateLimitByPath)) {
      if (pathname.startsWith(path) && path.length > matchedPath.length) {
        rateLimitConfig = pathConfig;
        matchedPath = path;
      }
    }
    
    const rateLimiter = createRateLimiter(rateLimitConfig);
    const rateLimitResponse = await rateLimiter(req);
    
    if (rateLimitResponse) {
      console.warn(`Rate limit exceeded: ${clientIP} ${pathname}`);
      return rateLimitResponse;
    }
  }
  
  // Apply security headers
  if (config.enableCSP) {
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  // Add additional security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('X-Served-By', 'DataTourisme');
  
  // Log security events in production
  if (process.env.NODE_ENV === 'production') {
    console.log(`Security middleware: ${clientIP} ${req.method} ${pathname} ${userAgent}`);
  }
  
  return response;
}

// Specialized middleware for API routes
export async function apiSecurityMiddleware(req: NextRequest): Promise<NextResponse> {
  return securityMiddleware(req, {
    ...defaultConfig,
    enableRateLimit: true,
    rateLimitByPath: {
      '/api/auth': rateLimitConfigs.auth,
      '/api/contact': rateLimitConfigs.contact,
      '/api/upload': rateLimitConfigs.upload,
      '/api/search': rateLimitConfigs.search,
      '/api': rateLimitConfigs.api,
    },
  });
}

// Specialized middleware for public pages
export async function pageSecurityMiddleware(req: NextRequest): Promise<NextResponse> {
  return securityMiddleware(req, {
    ...defaultConfig,
    enableRateLimit: true,
    rateLimitByPath: {
      '/': rateLimitConfigs.default,
    },
  });
}