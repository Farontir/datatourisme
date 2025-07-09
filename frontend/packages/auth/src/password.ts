import bcrypt from 'bcryptjs';
import { SecurityConfig } from './types';

export interface PasswordConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  saltRounds: number;
}

export class PasswordManager {
  private config: PasswordConfig;

  constructor(config: PasswordConfig) {
    this.config = config;
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength according to configuration
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*(),.?":{}|<>';
    
    let chars = '';
    let password = '';

    // Ensure at least one character from each required category
    if (this.config.requireUppercase) {
      chars += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }

    if (this.config.requireLowercase) {
      chars += lowercase;
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }

    if (this.config.requireNumbers) {
      chars += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }

    if (this.config.requireSpecialChars) {
      chars += specials;
      password += specials[Math.floor(Math.random() * specials.length)];
    }

    // Fill the rest of the password length
    for (let i = password.length; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password has been compromised (placeholder for future integration with HaveIBeenPwned)
   */
  async isPasswordCompromised(password: string): Promise<boolean> {
    // In a real implementation, you would check against the HaveIBeenPwned API
    // For now, we'll just check against a basic list of common passwords
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Calculate password strength score (0-100)
   */
  calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character diversity scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;

    // Pattern detection (reduce score for common patterns)
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential characters
    if (/password|admin|user/i.test(password)) score -= 20; // Common words

    // Bonus for long and complex passwords
    if (password.length >= 20 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(score: number): string {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Fair';
    if (score < 80) return 'Good';
    return 'Strong';
  }

  /**
   * Generate recovery codes for 2FA backup
   */
  generateRecoveryCodes(count = 10): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random().toString(36).substr(2, 4).toUpperCase() + 
                   Math.random().toString(36).substr(2, 4).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash recovery codes for secure storage
   */
  async hashRecoveryCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => this.hashPassword(code)));
  }

  /**
   * Verify a recovery code against hashed codes
   */
  async verifyRecoveryCode(code: string, hashedCodes: string[]): Promise<{ isValid: boolean; usedIndex?: number }> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await this.verifyPassword(code, hashedCodes[i]);
      if (isValid) {
        return { isValid: true, usedIndex: i };
      }
    }
    return { isValid: false };
  }
}

// Default configuration
export const defaultPasswordConfig: PasswordConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  saltRounds: 12,
};

// Singleton instance
export const passwordManager = new PasswordManager(defaultPasswordConfig);