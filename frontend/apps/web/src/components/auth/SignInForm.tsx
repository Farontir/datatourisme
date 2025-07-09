'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequest, LoginRequestSchema } from '@datatourisme/auth';
import { useAuthStore } from '../../stores/auth-store';
import { Button } from '@datatourisme/ui';
import { Eye, EyeOff, AlertCircle } from '@datatourisme/ui/icons';

interface SignInFormProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function SignInForm({ redirectTo = '/dashboard', onSuccess }: SignInFormProps) {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      remember: false,
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      clearError();
      await signIn(data);
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    } catch (error: any) {
      // Check if 2FA is required
      if (error.message?.includes('2FA') || error.code === 'TWO_FACTOR_REQUIRED') {
        setShowTwoFactor(true);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    window.location.href = '/api/auth/signin/google';
  };

  const handleFacebookSignIn = async () => {
    window.location.href = '/api/auth/signin/facebook';
  };

  const handleAppleSignIn = async () => {
    window.location.href = '/api/auth/signin/apple';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Adresse email
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="votre@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Votre mot de passe"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* 2FA Code Field - Show only when required */}
        {showTwoFactor && (
          <div>
            <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
              Code de vérification à deux facteurs
            </label>
            <input
              {...register('twoFactorCode')}
              id="twoFactorCode"
              type="text"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="123456"
            />
            {errors.twoFactorCode && (
              <p className="mt-1 text-sm text-red-600">{errors.twoFactorCode.message}</p>
            )}
          </div>
        )}

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              {...register('remember')}
              id="remember"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
              Se souvenir de moi
            </label>
          </div>

          <div className="text-sm">
            <a
              href="/auth/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
          </div>
        </div>

        {/* Social Sign-In Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="sr-only">Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleFacebookSignIn}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="sr-only">Facebook</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C6.624 0 2.246 4.377 2.246 9.771s4.378 9.771 9.771 9.771 9.771-4.377 9.771-9.771S17.41 0 12.017 0zm4.31 14.402c-.274 0-.509-.124-.662-.317-.22-.277-.165-.678.122-.925.632-.545 1.02-1.328 1.02-2.198 0-.87-.388-1.653-1.02-2.198-.287-.247-.342-.648-.122-.925.22-.277.621-.342.925-.122.917.787 1.48 1.928 1.48 3.245s-.563 2.458-1.48 3.245c-.165.141-.374.195-.553.195z" />
            </svg>
            <span className="sr-only">Apple</span>
          </Button>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <span className="text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <a
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Créer un compte
            </a>
          </span>
        </div>
      </form>
    </div>
  );
}