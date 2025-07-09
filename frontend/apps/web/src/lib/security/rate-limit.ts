export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request) => void;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
}

// In-memory store for rate limiting (use Redis in production)
class InMemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }
  
  async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
    this.store.set(key, value);
  }
  
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    const existing = await this.get(key);
    
    if (!existing) {
      const newEntry = { count: 1, resetTime };
      await this.set(key, newEntry);
      return newEntry;
    }
    
    existing.count += 1;
    await this.set(key, existing);
    return existing;
  }
  
  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const store = new InMemoryStore();

// Cleanup expired entries every 5 minutes
setInterval(() => store.cleanup(), 5 * 60 * 1000);

// Default configurations for different endpoints
export const rateLimitConfigs = {
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Strict limit for auth endpoints
  },
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30,
  },
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  contact: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },
} as const;

function getClientIP(req: Request): string {
  // Check for IP in various headers (reverse proxy, load balancer, etc.)
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
  
  // Fallback to a default identifier
  return 'unknown';
}

function defaultKeyGenerator(req: Request): string {
  const ip = getClientIP(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const url = new URL(req.url);
  
  // Create a unique key based on IP, endpoint, and user agent
  return `${ip}:${url.pathname}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
}

export async function rateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    onLimitReached,
  } = config;
  
  const key = keyGenerator(req);
  const entry = await store.increment(key, windowMs);
  
  const result: RateLimitResult = {
    success: entry.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    blocked: entry.count > maxRequests,
  };
  
  if (result.blocked && onLimitReached) {
    onLimitReached(req);
  }
  
  return result;
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'Retry-After': result.blocked ? Math.ceil((result.resetTime - Date.now()) / 1000).toString() : '0',
  };
}

// Middleware factory for different rate limiting strategies
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request): Promise<Response | null> => {
    const result = await rateLimit(req, config);
    const headers = createRateLimitHeaders(result);
    
    if (result.blocked) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${result.limit} requests per ${config.windowMs / 1000} seconds.`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        }
      );
    }
    
    return null; // No rate limit exceeded, continue
  };
}

// Pre-configured rate limiters
export const authRateLimiter = createRateLimiter(rateLimitConfigs.auth);
export const apiRateLimiter = createRateLimiter(rateLimitConfigs.api);
export const searchRateLimiter = createRateLimiter(rateLimitConfigs.search);
export const uploadRateLimiter = createRateLimiter(rateLimitConfigs.upload);
export const contactRateLimiter = createRateLimiter(rateLimitConfigs.contact);
export const defaultRateLimiter = createRateLimiter(rateLimitConfigs.default);