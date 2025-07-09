import { z } from 'zod';

// User and authentication types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().url().optional(),
  emailVerified: z.date().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  preferences: z.object({
    language: z.string().default('fr'),
    currency: z.string().default('EUR'),
    notifications: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
      push: z.boolean().default(true),
    }).default({}),
    accessibility: z.object({
      wheelchairAccessible: z.boolean().default(false),
      hearingImpaired: z.boolean().default(false),
      visuallyImpaired: z.boolean().default(false),
    }).default({}),
  }).default({}),
  twoFactorEnabled: z.boolean().default(false),
  twoFactorSecret: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expires: z.date(),
  sessionToken: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
});

export const VerificationTokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.date(),
});

// JWT payload types
export const JWTPayloadSchema = z.object({
  sub: z.string(), // user id
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']),
  iat: z.number(),
  exp: z.number(),
  jti: z.string(), // JWT ID for blacklisting
  tokenType: z.enum(['access', 'refresh']),
});

// Authentication request/response types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().default(false),
  twoFactorCode: z.string().length(6).optional(),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  }),
  name: z.string().min(2),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.date(),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const TwoFactorSetupResponseSchema = z.object({
  secret: z.string(),
  qrCode: z.string(), // Data URL for QR code
  backupCodes: z.array(z.string()),
});

export const TwoFactorVerifyRequestSchema = z.object({
  code: z.string().length(6),
  secret: z.string(),
});

// Route protection types
export const RouteAccessSchema = z.object({
  requireAuth: z.boolean().default(false),
  requireRole: z.enum(['USER', 'ADMIN']).optional(),
  requireEmailVerified: z.boolean().default(false),
  allowAnonymous: z.boolean().default(true),
});

// Error types
export const AuthErrorSchema = z.object({
  code: z.enum([
    'INVALID_CREDENTIALS',
    'USER_NOT_FOUND',
    'EMAIL_ALREADY_EXISTS',
    'INVALID_TOKEN',
    'TOKEN_EXPIRED',
    'TWO_FACTOR_REQUIRED',
    'INVALID_TWO_FACTOR_CODE',
    'EMAIL_NOT_VERIFIED',
    'INSUFFICIENT_PERMISSIONS',
    'RATE_LIMIT_EXCEEDED',
    'ACCOUNT_LOCKED',
    'INVALID_PASSWORD_RESET_TOKEN',
  ]),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Account = z.infer<typeof AccountSchema>;
export type VerificationToken = z.infer<typeof VerificationTokenSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponseSchema>;
export type TwoFactorVerifyRequest = z.infer<typeof TwoFactorVerifyRequestSchema>;
export type RouteAccess = z.infer<typeof RouteAccessSchema>;
export type AuthError = z.infer<typeof AuthErrorSchema>;

// Authentication state type for client-side stores
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

// OAuth provider configuration
export interface OAuthProvider {
  id: string;
  name: string;
  type: 'oauth';
  authorization: string;
  token: string;
  userinfo: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  checks: ['pkce' | 'state'];
}

// Security configuration
export interface SecurityConfig {
  jwt: {
    accessTokenExpiry: string; // e.g., '15m'
    refreshTokenExpiry: string; // e.g., '7d'
    secret: string;
    algorithm: 'HS256' | 'RS256';
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    saltRounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxAttempts: number;
    skipSuccessfulRequests: boolean;
  };
  session: {
    maxAge: number;
    updateAge: number;
  };
  twoFactor: {
    issuer: string;
    window: number; // Time window for TOTP codes
  };
}