import { NextRequest, NextResponse } from 'next/server';
import { authRateLimiter } from '../../../../src/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  // Apply strict rate limiting for security endpoint
  const rateLimitResponse = await authRateLimiter(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // In production, you would verify admin authentication here
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Collect security status information
    const securityStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      security: {
        csp: {
          enabled: true,
          reportOnly: process.env.NODE_ENV === 'development',
          violations: 0, // In real app, get from monitoring system
        },
        rateLimit: {
          enabled: true,
          activeBlocks: 0, // In real app, get from rate limit store
        },
        headers: {
          hsts: process.env.NODE_ENV === 'production',
          xss: true,
          contentTypeOptions: true,
          frameOptions: true,
          referrerPolicy: true,
        },
      },
      threats: {
        blockedRequests: 0, // In real app, get from security logs
        suspiciousIPs: [], // In real app, get from monitoring
        lastIncident: null,
      },
      monitoring: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.version,
      },
    };

    return NextResponse.json(securityStatus);
  } catch (error) {
    console.error('Error getting security status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Health check endpoint (no auth required)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Security-Status': 'active',
      'X-Environment': process.env.NODE_ENV || 'unknown',
    },
  });
}