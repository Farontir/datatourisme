import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import { jwtManager, passwordManager } from '@datatourisme/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Authenticate user with your backend
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/verify-credentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              twoFactorCode: credentials.twoFactorCode,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Authentication failed');
          }

          const user = await response.json();
          return user;
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],
  
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/welcome',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.userId = user.id;
        token.role = user.role || 'USER';
        
        // Generate our own JWT tokens for internal use
        const { accessToken, refreshToken } = jwtManager.generateTokenPair(user as any);
        token.internalAccessToken = accessToken;
        token.internalRefreshToken = refreshToken;
      }

      // Check if token needs refresh
      if (token.internalAccessToken && jwtManager.isTokenExpiringSoon(token.internalAccessToken as string)) {
        try {
          const refreshed = await jwtManager.refreshAccessToken(
            token.internalRefreshToken as string,
            async (id: string) => {
              // Fetch user from your database
              const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/${id}`);
              return response.ok ? response.json() : null;
            }
          );

          if (refreshed) {
            token.internalAccessToken = refreshed.accessToken;
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.accessToken = token.internalAccessToken as string;
        session.refreshToken = token.internalRefreshToken as string;
      }
      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      // OAuth sign-ins
      if (account?.provider !== 'credentials') {
        try {
          // Check if user exists in your database
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/oauth-signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: account?.provider,
              providerAccountId: account?.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });

          if (!response.ok) {
            console.error('OAuth sign-in failed');
            return false;
          }

          const userData = await response.json();
          user.id = userData.id;
          user.role = userData.role;
          
          return true;
        } catch (error) {
          console.error('OAuth sign-in error:', error);
          return false;
        }
      }

      // Credentials sign-in
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('User signed in:', { userId: user.id, provider: account?.provider });
      
      // Track sign-in event
      // await analytics.track('User Signed In', {
      //   userId: user.id,
      //   provider: account?.provider,
      //   isNewUser,
      // });
    },

    async signOut({ token }) {
      console.log('User signed out:', { userId: token?.userId });
      
      // Blacklist JWT token
      if (token?.internalAccessToken) {
        jwtManager.blacklistToken(token.internalAccessToken as string);
      }
    },

    async createUser({ user }) {
      console.log('New user created:', { userId: user.id });
      
      // Send welcome email, set up onboarding, etc.
    },
  },

  debug: process.env.NODE_ENV === 'development',

  secret: process.env.NEXTAUTH_SECRET,
};