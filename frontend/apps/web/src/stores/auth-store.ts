import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  User, 
  AuthState, 
  AuthError, 
  LoginRequest, 
  RegisterRequest,
  AuthResponse 
} from '@datatourisme/auth';

interface AuthActions {
  // Authentication actions
  signIn: (credentials: LoginRequest) => Promise<void>;
  signUp: (userData: RegisterRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // User data actions
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<User['preferences']>) => void;
  
  // Token management
  setTokens: (accessToken: string, refreshToken: string, expiresAt: Date) => void;
  clearTokens: () => void;
  
  // Error handling
  setError: (error: AuthError | null) => void;
  clearError: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  
  // 2FA actions
  enableTwoFactor: () => Promise<{ secret: string; qrCode: string; backupCodes: string[] }>;
  verifyTwoFactor: (code: string, secret: string) => Promise<void>;
  disableTwoFactor: (code: string) => Promise<void>;
  
  // Session management
  checkSession: () => Promise<void>;
  extendSession: () => Promise<void>;
}

interface AuthStore extends AuthState, AuthActions {}

// Token storage utilities
const TOKEN_STORAGE_KEY = 'auth-tokens';
const REFRESH_TOKEN_KEY = 'refresh-token';

const getStoredTokens = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredTokens = (accessToken: string, refreshToken: string, expiresAt: Date) => {
  if (typeof window === 'undefined') return;
  
  const tokens = {
    accessToken,
    refreshToken,
    expiresAt: expiresAt.toISOString(),
  };
  
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  
  // Store refresh token in httpOnly cookie via API call
  fetch('/api/auth/set-refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  }).catch(console.error);
};

const clearStoredTokens = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  
  // Clear refresh token cookie
  fetch('/api/auth/clear-refresh-token', {
    method: 'POST',
  }).catch(console.error);
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Authentication actions
        signIn: async (credentials: LoginRequest) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await fetch('/api/auth/signin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(credentials),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Sign in failed');
            }

            const authData: AuthResponse = await response.json();
            
            set({
              user: authData.user,
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            setStoredTokens(authData.accessToken, authData.refreshToken, authData.expiresAt);
          } catch (error) {
            const authError: AuthError = {
              code: 'INVALID_CREDENTIALS',
              message: error instanceof Error ? error.message : 'Sign in failed',
            };
            
            set({
              isLoading: false,
              error: authError,
              isAuthenticated: false,
            });
            
            throw error;
          }
        },

        signUp: async (userData: RegisterRequest) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await fetch('/api/auth/signup', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(userData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Sign up failed');
            }

            const authData: AuthResponse = await response.json();
            
            set({
              user: authData.user,
              accessToken: authData.accessToken,
              refreshToken: authData.refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            setStoredTokens(authData.accessToken, authData.refreshToken, authData.expiresAt);
          } catch (error) {
            const authError: AuthError = {
              code: 'EMAIL_ALREADY_EXISTS',
              message: error instanceof Error ? error.message : 'Sign up failed',
            };
            
            set({
              isLoading: false,
              error: authError,
              isAuthenticated: false,
            });
            
            throw error;
          }
        },

        signOut: async () => {
          set({ isLoading: true });
          
          try {
            const { accessToken } = get();
            
            if (accessToken) {
              await fetch('/api/auth/signout', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              });
            }
          } catch (error) {
            console.error('Sign out error:', error);
          } finally {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
            
            clearStoredTokens();
          }
        },

        refreshToken: async () => {
          const { refreshToken } = get();
          
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            set({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || refreshToken,
            });

            setStoredTokens(data.accessToken, data.refreshToken || refreshToken, new Date(data.expiresAt));
          } catch (error) {
            // If refresh fails, sign out the user
            get().signOut();
            throw error;
          }
        },

        // User data actions
        updateUser: (updates: Partial<User>) => {
          set(state => ({
            user: state.user ? { ...state.user, ...updates } : null,
          }));
        },

        updatePreferences: (preferences: Partial<User['preferences']>) => {
          set(state => ({
            user: state.user ? {
              ...state.user,
              preferences: { ...state.user.preferences, ...preferences },
            } : null,
          }));
        },

        // Token management
        setTokens: (accessToken: string, refreshToken: string, expiresAt: Date) => {
          set({ accessToken, refreshToken });
          setStoredTokens(accessToken, refreshToken, expiresAt);
        },

        clearTokens: () => {
          set({ accessToken: null, refreshToken: null });
          clearStoredTokens();
        },

        // Error handling
        setError: (error: AuthError | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Loading states
        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
        },

        // 2FA actions
        enableTwoFactor: async () => {
          const { accessToken } = get();
          
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch('/api/auth/2fa/setup', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to set up 2FA');
          }

          return response.json();
        },

        verifyTwoFactor: async (code: string, secret: string) => {
          const { accessToken } = get();
          
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, secret }),
          });

          if (!response.ok) {
            throw new Error('2FA verification failed');
          }

          // Update user to reflect 2FA enabled
          set(state => ({
            user: state.user ? { ...state.user, twoFactorEnabled: true } : null,
          }));
        },

        disableTwoFactor: async (code: string) => {
          const { accessToken } = get();
          
          if (!accessToken) {
            throw new Error('Not authenticated');
          }
          
          const response = await fetch('/api/auth/2fa/disable', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          if (!response.ok) {
            throw new Error('Failed to disable 2FA');
          }

          // Update user to reflect 2FA disabled
          set(state => ({
            user: state.user ? { ...state.user, twoFactorEnabled: false } : null,
          }));
        },

        // Session management
        checkSession: async () => {
          const stored = getStoredTokens();
          
          if (!stored) {
            return;
          }

          const expiresAt = new Date(stored.expiresAt);
          const now = new Date();

          // If token is expired, try to refresh
          if (expiresAt <= now) {
            try {
              await get().refreshToken();
            } catch {
              get().signOut();
            }
            return;
          }

          // If token is valid, validate with server
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${stored.accessToken}`,
              },
            });

            if (response.ok) {
              const user = await response.json();
              set({
                user,
                accessToken: stored.accessToken,
                refreshToken: stored.refreshToken,
                isAuthenticated: true,
              });
            } else {
              get().signOut();
            }
          } catch {
            get().signOut();
          }
        },

        extendSession: async () => {
          const { accessToken } = get();
          
          if (!accessToken) {
            return;
          }

          try {
            await fetch('/api/auth/extend-session', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
          } catch (error) {
            console.error('Failed to extend session:', error);
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          // Only persist non-sensitive data
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);

// Auto-refresh token before expiry
let refreshTimer: NodeJS.Timeout | null = null;

useAuthStore.subscribe((state) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (state.accessToken && state.isAuthenticated) {
    const stored = getStoredTokens();
    if (stored) {
      const expiresAt = new Date(stored.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      // Refresh 5 minutes before expiry
      const refreshIn = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);
      
      refreshTimer = setTimeout(() => {
        state.refreshToken().catch(() => {
          // If refresh fails, sign out
          state.signOut();
        });
      }, refreshIn);
    }
  }
});

// Initialize session on store creation
if (typeof window !== 'undefined') {
  useAuthStore.getState().checkSession();
}