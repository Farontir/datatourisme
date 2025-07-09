import jwt from 'jsonwebtoken';
import { JWTPayload, JWTPayloadSchema, User } from './types';

export interface JWTConfig {
  secret: string;
  algorithm: 'HS256' | 'RS256';
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
}

export class JWTManager {
  private config: JWTConfig;
  private blacklistedTokens = new Set<string>();

  constructor(config: JWTConfig) {
    this.config = config;
  }

  /**
   * Generate an access token for a user
   */
  generateAccessToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenType: 'access',
    };

    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.accessTokenExpiry,
      issuer: this.config.issuer,
      audience: this.config.audience,
      jwtid: this.generateJwtId(),
    });
  }

  /**
   * Generate a refresh token for a user
   */
  generateRefreshToken(user: User): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokenType: 'refresh',
    };

    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm,
      expiresIn: this.config.refreshTokenExpiry,
      issuer: this.config.issuer,
      audience: this.config.audience,
      jwtid: this.generateJwtId(),
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user: User): { accessToken: string; refreshToken: string; expiresAt: Date } {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    // Calculate expiry time based on access token expiry
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresAt = new Date(decoded.exp * 1000);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as any;

      // Validate the payload structure
      const payload = JWTPayloadSchema.parse(decoded);

      // Check if token is blacklisted
      if (this.isTokenBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active yet');
      }
      throw error;
    }
  }

  /**
   * Verify if a token is valid without throwing errors
   */
  isTokenValid(token: string): boolean {
    try {
      this.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract payload from token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as any;
      return JWTPayloadSchema.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Get the expiry time of a token
   */
  getTokenExpiry(token: string): Date | null {
    const payload = this.decodeToken(token);
    return payload ? new Date(payload.exp * 1000) : null;
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    return expiry ? expiry < new Date() : true;
  }

  /**
   * Check if a token is about to expire (within 5 minutes)
   */
  isTokenExpiringSoon(token: string, bufferMinutes = 5): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    
    const bufferTime = new Date();
    bufferTime.setMinutes(bufferTime.getMinutes() + bufferMinutes);
    
    return expiry < bufferTime;
  }

  /**
   * Blacklist a token (for logout)
   */
  blacklistToken(token: string): void {
    const payload = this.decodeToken(token);
    if (payload?.jti) {
      this.blacklistedTokens.add(payload.jti);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  isTokenBlacklisted(jti: string): boolean {
    return this.blacklistedTokens.has(jti);
  }

  /**
   * Clear expired tokens from blacklist (should be called periodically)
   */
  cleanupBlacklist(): void {
    // In a real implementation, you'd store blacklisted tokens in Redis
    // with automatic expiration based on the token's original expiry time
    // For now, we'll just keep a simple in-memory set
  }

  /**
   * Generate a unique JWT ID
   */
  private generateJwtId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    getUserById: (id: string) => Promise<User | null>
  ): Promise<{ accessToken: string; expiresAt: Date } | null> {
    try {
      const payload = this.verifyToken(refreshToken);
      
      if (payload.tokenType !== 'refresh') {
        throw new Error('Invalid token type for refresh');
      }

      // Get current user data (to handle role changes, etc.)
      const user = await getUserById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);
      const decoded = jwt.decode(accessToken) as JWTPayload;
      const expiresAt = new Date(decoded.exp * 1000);

      return { accessToken, expiresAt };
    } catch {
      return null;
    }
  }

  /**
   * Rotate refresh token (generate new refresh token and blacklist old one)
   */
  async rotateRefreshToken(
    currentRefreshToken: string,
    getUserById: (id: string) => Promise<User | null>
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
    try {
      const payload = this.verifyToken(currentRefreshToken);
      
      if (payload.tokenType !== 'refresh') {
        throw new Error('Invalid token type for refresh');
      }

      // Get current user data
      const user = await getUserById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // Blacklist old refresh token
      this.blacklistToken(currentRefreshToken);

      // Generate new token pair
      return this.generateTokenPair(user);
    } catch {
      return null;
    }
  }
}

// Default configuration
export const defaultJWTConfig: JWTConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  algorithm: 'HS256',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'datatourisme.fr',
  audience: 'datatourisme-app',
};

// Singleton instance
export const jwtManager = new JWTManager(defaultJWTConfig);