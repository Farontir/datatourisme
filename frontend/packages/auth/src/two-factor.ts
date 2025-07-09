import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { TwoFactorSetupResponse } from './types';
import { passwordManager } from './password';

export interface TwoFactorConfig {
  issuer: string;
  window: number; // Time window for TOTP codes (default: 1 = 30 seconds before/after)
  digits: number; // Number of digits in TOTP code
  step: number; // Time step in seconds
}

export class TwoFactorManager {
  private config: TwoFactorConfig;

  constructor(config: TwoFactorConfig) {
    this.config = config;
  }

  /**
   * Generate a new secret for 2FA setup
   */
  generateSecret(userEmail: string, userName?: string): { secret: string; otpauthUrl: string } {
    const secret = speakeasy.generateSecret({
      name: userName || userEmail,
      issuer: this.config.issuer,
      length: 32,
    });

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate OTP auth URL');
    }

    return {
      secret: secret.base32 || '',
      otpauthUrl: secret.otpauth_url,
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Set up 2FA for a user (generate secret, QR code, and backup codes)
   */
  async setupTwoFactor(userEmail: string, userName?: string): Promise<TwoFactorSetupResponse> {
    const { secret, otpauthUrl } = this.generateSecret(userEmail, userName);
    const qrCode = await this.generateQRCode(otpauthUrl);
    const backupCodes = passwordManager.generateRecoveryCodes(10);

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code
   */
  verifyTOTP(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.config.window,
      step: this.config.step,
    });
  }

  /**
   * Generate a TOTP code (for testing purposes)
   */
  generateTOTP(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
      step: this.config.step,
    });
  }

  /**
   * Verify either TOTP code or backup code
   */
  async verifyCode(
    code: string,
    secret: string,
    backupCodes: string[]
  ): Promise<{ isValid: boolean; isBackupCode?: boolean; usedBackupIndex?: number }> {
    // First, try TOTP verification
    if (this.verifyTOTP(code, secret)) {
      return { isValid: true, isBackupCode: false };
    }

    // If TOTP fails, try backup codes
    const backupResult = await passwordManager.verifyRecoveryCode(code, backupCodes);
    if (backupResult.isValid) {
      return {
        isValid: true,
        isBackupCode: true,
        usedBackupIndex: backupResult.usedIndex,
      };
    }

    return { isValid: false };
  }

  /**
   * Get the current time step for TOTP
   */
  getCurrentTimeStep(): number {
    return Math.floor(Date.now() / 1000 / this.config.step);
  }

  /**
   * Get remaining time until next TOTP code
   */
  getRemainingTime(): number {
    const currentStep = this.getCurrentTimeStep();
    const nextStep = (currentStep + 1) * this.config.step;
    const currentTime = Math.floor(Date.now() / 1000);
    return nextStep - currentTime;
  }

  /**
   * Validate secret format
   */
  isValidSecret(secret: string): boolean {
    try {
      // Try to decode the base32 secret
      const buffer = speakeasy.encoding.base32.decode(secret);
      return buffer.length >= 16; // Minimum 128 bits
    } catch {
      return false;
    }
  }

  /**
   * Generate new backup codes (when old ones are used up)
   */
  async regenerateBackupCodes(): Promise<string[]> {
    return passwordManager.generateRecoveryCodes(10);
  }

  /**
   * Remove a used backup code from the list
   */
  removeUsedBackupCode(backupCodes: string[], usedIndex: number): string[] {
    return backupCodes.filter((_, index) => index !== usedIndex);
  }

  /**
   * Check if user has sufficient backup codes remaining
   */
  hasMinimumBackupCodes(backupCodes: string[], minimum = 3): boolean {
    return backupCodes.length >= minimum;
  }

  /**
   * Disable 2FA for a user (clear secret and backup codes)
   */
  disable2FA(): { success: boolean } {
    // In a real implementation, you would clear the secret and backup codes from the database
    return { success: true };
  }

  /**
   * Generate emergency access code (one-time use)
   */
  generateEmergencyCode(): string {
    // Generate a longer, single-use code for emergency access
    return Math.random().toString(36).substr(2, 12).toUpperCase();
  }

  /**
   * Validate emergency access code format
   */
  isValidEmergencyCode(code: string): boolean {
    return /^[A-Z0-9]{12}$/.test(code);
  }
}

// Default configuration
export const defaultTwoFactorConfig: TwoFactorConfig = {
  issuer: 'DataTourisme',
  window: 1,
  digits: 6,
  step: 30,
};

// Singleton instance
export const twoFactorManager = new TwoFactorManager(defaultTwoFactorConfig);