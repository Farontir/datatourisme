# Security Documentation

This document describes the security measures implemented in the DataTourisme frontend application.

## Security Features

### 1. Content Security Policy (CSP)

**Location**: `src/lib/security/csp.ts`

The application implements a comprehensive Content Security Policy that:

- Prevents XSS attacks by controlling resource loading
- Blocks inline scripts and styles (with exceptions for Next.js requirements)
- Restricts resource origins to trusted domains
- Reports violations to `/api/security/csp-report`

**Key directives:**
- `default-src`: Self-only by default
- `script-src`: Allows trusted CDNs (Stripe, Google Analytics, etc.)
- `style-src`: Allows inline styles for CSS-in-JS libraries
- `img-src`: Allows images from trusted sources and data URLs
- `connect-src`: Restricts API connections to known endpoints
- `frame-ancestors`: Prevents clickjacking

### 2. Rate Limiting

**Location**: `src/lib/security/rate-limit.ts`

Multi-tier rate limiting system:

- **Default**: 100 requests per 15 minutes
- **API endpoints**: 1000 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes (strict)
- **Search**: 30 requests per 1 minute
- **Upload**: 5 requests per 15 minutes
- **Contact**: 3 requests per 1 hour

**Features:**
- IP-based tracking with user-agent fingerprinting
- Configurable time windows and limits
- Automatic cleanup of expired entries
- Custom rate limit headers in responses

### 3. Security Middleware

**Location**: `src/lib/security/middleware.ts`

Comprehensive request filtering:

- **Bot Protection**: Blocks scrapers while allowing legitimate search engines
- **Suspicious Request Detection**: Identifies potential attacks
- **IP Blocking**: Supports blacklisting known bad actors
- **Geographic Headers**: Adds location data for tourism features
- **Security Headers**: Applies comprehensive security headers

### 4. Security Headers

Applied to all responses:

```typescript
// Security Headers
'Content-Security-Policy': 'default-src \'self\'; ...'
'X-Frame-Options': 'DENY'
'X-Content-Type-Options': 'nosniff'
'X-XSS-Protection': '1; mode=block'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'accelerometer=(), camera=(), ...'
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload' // Production only
```

### 5. Attack Prevention

The system protects against:

- **Cross-Site Scripting (XSS)**: CSP + input sanitization
- **Clickjacking**: X-Frame-Options + CSP frame-ancestors
- **CSRF**: SameSite cookies + CSRF tokens
- **SQL Injection**: Input validation + parameterized queries
- **DDoS**: Rate limiting + bot detection
- **Directory Traversal**: Request validation
- **File Upload Attacks**: File type validation + size limits

## Monitoring & Logging

### CSP Violation Reports

Endpoint: `POST /api/security/csp-report`

Automatically logs and analyzes CSP violations:
- Identifies potential XSS attempts
- Tracks policy effectiveness
- Alerts on suspicious patterns

### Security Status Endpoint

Endpoint: `GET /api/security/status`

Provides security monitoring dashboard data:
- Active security measures
- Threat detection stats
- System health metrics

## Configuration

Security settings are environment-specific:

### Development
- CSP in report-only mode
- Rate limiting disabled
- Detailed logging enabled
- Bot protection relaxed

### Production
- Strict CSP enforcement
- Full rate limiting active
- HSTS enabled
- All protections active

### Configuration Files

- `src/lib/security/config.ts`: Environment-specific settings
- `middleware.ts`: Next.js middleware integration
- Environment variables for sensitive settings

## Best Practices

### 1. Content Security Policy
- Never use `'unsafe-inline'` or `'unsafe-eval'` in production
- Use nonces for inline scripts when necessary
- Regularly review and update allowed origins
- Monitor CSP reports for violations

### 2. Rate Limiting
- Adjust limits based on legitimate usage patterns
- Use Redis in production for distributed rate limiting
- Implement different limits for different user types
- Monitor for abuse patterns

### 3. Input Validation
- Sanitize all user inputs
- Validate file uploads strictly
- Use parameterized queries for database access
- Implement proper error handling

### 4. Authentication & Authorization
- Use secure session management
- Implement proper JWT handling
- Apply principle of least privilege
- Regular security audits

## Incident Response

### CSP Violations
1. Review violation reports in logs
2. Identify if violation is legitimate or attack
3. Update CSP policy if needed
4. Block source if malicious

### Rate Limit Exceeded
1. Investigate source IP and patterns
2. Determine if legitimate traffic spike or attack
3. Temporarily block IP if malicious
4. Scale infrastructure if legitimate

### Suspicious Activity
1. Immediate IP blocking for clear attacks
2. Enhanced monitoring for borderline cases
3. Log analysis for patterns
4. Update detection rules as needed

## Security Updates

- Regularly update dependencies
- Monitor security advisories
- Test security configurations
- Conduct periodic security reviews
- Implement security scanning in CI/CD

## Contact

For security issues or questions:
- Internal: Security team
- External: security@datatourisme.fr
- Emergency: Follow incident response procedures