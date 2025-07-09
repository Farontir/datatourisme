import { NextRequest, NextResponse } from 'next/server';
import { LoginRequestSchema, passwordManager, twoFactorManager } from '@datatourisme/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, twoFactorCode } = LoginRequestSchema.parse(body);

    // Mock user database lookup
    // In a real app, this would query your database
    const user = await findUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await passwordManager.verifyPassword(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled and required
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json(
          { message: 'Two-factor authentication code required', code: 'TWO_FACTOR_REQUIRED' },
          { status: 422 }
        );
      }

      // Verify 2FA code
      const is2FAValid = twoFactorManager.verifyTOTP(twoFactorCode, user.twoFactorSecret);
      
      if (!is2FAValid) {
        return NextResponse.json(
          { message: 'Invalid two-factor authentication code' },
          { status: 401 }
        );
      }
    }

    // Return user data (without sensitive fields)
    const { passwordHash, twoFactorSecret, ...safeUser } = user;
    
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Credential verification error:', error);
    
    return NextResponse.json(
      { message: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Mock user database functions
// In a real app, these would be database queries
async function findUserByEmail(email: string) {
  // Mock user data
  const mockUsers = [
    {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      passwordHash: await passwordManager.hashPassword('password123'),
      twoFactorEnabled: false,
      twoFactorSecret: '',
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        language: 'fr',
        currency: 'EUR',
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
        accessibility: {
          wheelchairAccessible: false,
          hearingImpaired: false,
          visuallyImpaired: false,
        },
      },
    },
  ];

  return mockUsers.find(user => user.email === email) || null;
}