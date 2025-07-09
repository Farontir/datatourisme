export interface SecurityConfig {
  csp: {
    reportOnly: boolean;
    reportUri: string;
    enableNonce: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  headers: {
    hsts: boolean;
    hstsMaxAge: number;
    hstsIncludeSubDomains: boolean;
    hstsPreload: boolean;
  };
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableMetrics: boolean;
    enableAlerts: boolean;
  };
  features: {
    botProtection: boolean;
    ipBlocking: boolean;
    geoBlocking: boolean;
    suspiciousPatternDetection: boolean;
  };
}

const developmentConfig: SecurityConfig = {
  csp: {
    reportOnly: true,
    reportUri: '/api/security/csp-report',
    enableNonce: false,
  },
  rateLimit: {
    enabled: false, // Disabled in development for easier testing
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000,
    skipSuccessfulRequests: false,
  },
  headers: {
    hsts: false,
    hstsMaxAge: 0,
    hstsIncludeSubDomains: false,
    hstsPreload: false,
  },
  monitoring: {
    logLevel: 'debug',
    enableMetrics: true,
    enableAlerts: false,
  },
  features: {
    botProtection: false,
    ipBlocking: false,
    geoBlocking: false,
    suspiciousPatternDetection: true,
  },
};

const productionConfig: SecurityConfig = {
  csp: {
    reportOnly: false,
    reportUri: '/api/security/csp-report',
    enableNonce: true,
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    skipSuccessfulRequests: true,
  },
  headers: {
    hsts: true,
    hstsMaxAge: 31536000, // 1 year
    hstsIncludeSubDomains: true,
    hstsPreload: true,
  },
  monitoring: {
    logLevel: 'warn',
    enableMetrics: true,
    enableAlerts: true,
  },
  features: {
    botProtection: true,
    ipBlocking: true,
    geoBlocking: false, // Tourism site should be globally accessible
    suspiciousPatternDetection: true,
  },
};

const testConfig: SecurityConfig = {
  ...developmentConfig,
  monitoring: {
    logLevel: 'error',
    enableMetrics: false,
    enableAlerts: false,
  },
};

export function getSecurityConfig(): SecurityConfig {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
}

export { developmentConfig, productionConfig, testConfig };