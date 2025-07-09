export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'connect-src'?: string[];
  'font-src'?: string[];
  'object-src'?: string[];
  'media-src'?: string[];
  'frame-src'?: string[];
  'child-src'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'prefetch-src'?: string[];
  'form-action'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface CSPConfig {
  reportOnly?: boolean;
  reportUri?: string;
  directives: CSPDirectives;
}

const defaultCSPConfig: CSPConfig = {
  reportOnly: process.env.NODE_ENV === 'development',
  reportUri: '/api/security/csp-report',
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js in development
      "'unsafe-eval'", // Required for Next.js in development
      'https://js.stripe.com',
      'https://js.paypal.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://maps.googleapis.com',
      ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS libraries
      'https://fonts.googleapis.com',
      'https://api.mapbox.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.datatourisme.fr',
      'https://images.unsplash.com',
      'https://via.placeholder.com',
      'https://maps.googleapis.com',
      'https://maps.gstatic.com',
      'https://www.google-analytics.com',
    ],
    'connect-src': [
      "'self'",
      'https://api.datatourisme.fr',
      'https://api.stripe.com',
      'https://api.paypal.com',
      'https://www.google-analytics.com',
      'https://analytics.google.com',
      'https://api.mapbox.com',
      'https://events.mapbox.com',
      ...(process.env.NODE_ENV === 'development' 
        ? ['ws://localhost:3000', 'http://localhost:3000'] 
        : []
      ),
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://api.mapbox.com',
    ],
    'object-src': ["'none'"],
    'media-src': [
      "'self'",
      'https://*.datatourisme.fr',
      'data:',
      'blob:',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://www.paypal.com',
      'https://www.youtube.com',
      'https://player.vimeo.com',
      'https://maps.google.com',
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'manifest-src': ["'self'"],
    'form-action': [
      "'self'",
      'https://api.datatourisme.fr',
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': process.env.NODE_ENV === 'production',
    'block-all-mixed-content': process.env.NODE_ENV === 'production',
  },
};

export function generateCSPHeader(config: CSPConfig = defaultCSPConfig): string {
  const { directives, reportUri } = config;
  
  const cspParts: string[] = [];
  
  // Add all directives
  Object.entries(directives).forEach(([directive, value]) => {
    if (value === true) {
      cspParts.push(directive);
    } else if (Array.isArray(value) && value.length > 0) {
      cspParts.push(`${directive} ${value.join(' ')}`);
    }
  });
  
  // Add report URI if specified
  if (reportUri) {
    cspParts.push(`report-uri ${reportUri}`);
  }
  
  return cspParts.join('; ');
}

export function getSecurityHeaders(): Record<string, string> {
  const cspHeader = generateCSPHeader();
  
  return {
    // Content Security Policy
    [defaultCSPConfig.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy']: cspHeader,
    
    // X-Frame-Options (backup for older browsers)
    'X-Frame-Options': 'DENY',
    
    // X-Content-Type-Options
    'X-Content-Type-Options': 'nosniff',
    
    // X-XSS-Protection (for older browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (Feature Policy)
    'Permissions-Policy': [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',
      'geolocation=(self)',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=(self)',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', '),
    
    // Strict Transport Security (HSTS)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };
}

export { defaultCSPConfig };