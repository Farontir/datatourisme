import { NextRequest, NextResponse } from 'next/server';
import { authRateLimiter } from '../../../../src/lib/security/rate-limit';

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': string;
    'blocked-uri': string;
    'line-number': number;
    'column-number': number;
    'source-file': string;
    'status-code': number;
    'script-sample': string;
  };
}

export async function POST(req: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = await authRateLimiter(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const report: CSPReport = await req.json();
    const cspReport = report['csp-report'];
    
    if (!cspReport) {
      return NextResponse.json({ error: 'Invalid CSP report format' }, { status: 400 });
    }

    // Log CSP violation for security monitoring
    const logData = {
      timestamp: new Date().toISOString(),
      documentUri: cspReport['document-uri'],
      violatedDirective: cspReport['violated-directive'],
      blockedUri: cspReport['blocked-uri'],
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
      columnNumber: cspReport['column-number'],
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    };

    // In production, you would send this to your security monitoring system
    console.warn('CSP Violation:', JSON.stringify(logData, null, 2));

    // Here you could also:
    // 1. Send to a security monitoring service (e.g., Sentry, DataDog)
    // 2. Store in a database for analysis
    // 3. Alert security teams for critical violations
    // 4. Block IPs that repeatedly violate CSP

    // Check for suspicious patterns that might indicate an attack
    const suspiciousPatterns = [
      'javascript:',
      'data:text/html',
      'blob:',
      'eval(',
      'setTimeout(',
      'setInterval(',
      'Function(',
      '<script',
      'onerror=',
      'onload=',
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => 
      cspReport['blocked-uri'].includes(pattern) ||
      cspReport['script-sample']?.includes(pattern)
    );

    if (isSuspicious) {
      console.error('SECURITY ALERT - Suspicious CSP violation detected:', logData);
      
      // In production, you might want to:
      // 1. Alert security team immediately
      // 2. Temporarily block the IP
      // 3. Increase monitoring for this user
    }

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}