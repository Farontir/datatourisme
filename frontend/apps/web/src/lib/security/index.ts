export * from './csp';
export * from './rate-limit';
export * from './middleware';

// Security utility functions
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function isValidURL(url: string): boolean {
  try {
    const parsedURL = new URL(url);
    return ['http:', 'https:'].includes(parsedURL.protocol);
  } catch {
    return false;
  }
}

export function hashIP(ip: string): string {
  // Simple hash for IP addresses (use crypto in production)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export interface SecurityMetrics {
  requestCount: number;
  blockedRequests: number;
  cspViolations: number;
  rateLimitHits: number;
  suspiciousActivity: number;
}

// Mock security metrics (replace with real monitoring in production)
export function getSecurityMetrics(): SecurityMetrics {
  return {
    requestCount: 0,
    blockedRequests: 0,
    cspViolations: 0,
    rateLimitHits: 0,
    suspiciousActivity: 0,
  };
}