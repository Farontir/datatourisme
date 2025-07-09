import React, { useState, useEffect, useCallback } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Alert, AlertDescription } from './Alert';
import { Badge } from './Badge';
import { 
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Lock,
  Smartphone,
  Loader2
} from 'lucide-react';

// Types
export interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  currency?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
  onProcessing?: (isProcessing: boolean) => void;
  returnUrl?: string;
  savePaymentMethod?: boolean;
  showSavedMethods?: boolean;
  className?: string;
}

export interface WalletPaymentProps {
  paymentRequest: any;
  onWalletClick: (wallet: 'apple' | 'google') => void;
  canPayApple: boolean;
  canPayGoogle: boolean;
  isProcessing: boolean;
}

export interface SavedPaymentMethodsProps {
  methods: Array<{
    id: string;
    type: string;
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  }>;
  selectedMethod?: string;
  onMethodSelect: (methodId: string) => void;
  onMethodDelete: (methodId: string) => void;
  className?: string;
}

// Stripe configuration
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0570de',
    colorBackground: '#ffffff',
    colorText: '#30313d',
    colorDanger: '#df1b41',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '6px',
  },
  rules: {
    '.Tab': {
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: 'none',
    },
    '.Input': {
      border: '1px solid #d1d5db',
      borderRadius: '6px',
    },
    '.Input:focus': {
      borderColor: '#0570de',
      boxShadow: '0 0 0 2px rgba(5, 112, 222, 0.1)',
    },
  },
};

// Wallet Payment Buttons Component
export const WalletPayment: React.FC<WalletPaymentProps> = ({
  onWalletClick,
  canPayApple,
  canPayGoogle,
  isProcessing
}) => {
  if (!canPayApple && !canPayGoogle) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-neutral-500">Ou payez avec</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {canPayApple && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onWalletClick('apple')}
            disabled={isProcessing}
            className="h-12 bg-black text-white hover:bg-gray-800 border-black"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Apple Pay
          </Button>
        )}
        
        {canPayGoogle && (
          <Button
            type="button"
            variant="outline"
            onClick={() => onWalletClick('google')}
            disabled={isProcessing}
            className="h-12"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Google Pay
          </Button>
        )}
      </div>
    </div>
  );
};

// Saved Payment Methods Component
export const SavedPaymentMethods: React.FC<SavedPaymentMethodsProps> = ({
  methods,
  selectedMethod,
  onMethodSelect,
  onMethodDelete,
  className
}) => {
  if (methods.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium text-neutral-900">
        Moyens de paiement enregistrés
      </h3>
      
      <div className="space-y-2">
        {methods.map((method) => (
          <div
            key={method.id}
            className={cn(
              'flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors',
              selectedMethod === method.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300'
            )}
            onClick={() => onMethodSelect(method.id)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-neutral-100 rounded flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {method.brand} •••• {method.last4}
                </p>
                <p className="text-xs text-neutral-500">
                  Expire {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedMethod === method.id && (
                <CheckCircle className="w-4 h-4 text-primary-500" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMethodDelete(method.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Payment Form Component (Internal)
const PaymentFormInner: React.FC<Omit<PaymentFormProps, 'clientSecret'>> = ({
  amount,
  currency = 'eur',
  onSuccess,
  onError,
  onProcessing,
  returnUrl,
  savePaymentMethod = false,
  className
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threeDSecureRequired, setThreeDSecureRequired] = useState(false);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    onProcessing?.(true);

    try {
      // Submit the form to validate inputs
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || 'Erreur de validation');
        return;
      }

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/payment/success`,
          save_payment_method: savePaymentMethod,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setErrorMessage(error.message || 'Erreur de paiement');
        } else {
          setErrorMessage('Une erreur inattendue s\'est produite');
        }
        onError(error);
      } else if (paymentIntent) {
        // Handle different payment intent statuses
        switch (paymentIntent.status) {
          case 'succeeded':
            onSuccess(paymentIntent);
            break;
          case 'requires_action':
            setThreeDSecureRequired(true);
            // The payment will be handled by Stripe's 3D Secure flow
            break;
          case 'requires_payment_method':
            setErrorMessage('Votre paiement n\'a pas pu être traité. Veuillez réessayer.');
            break;
          default:
            setErrorMessage('Le paiement est en cours de traitement.');
        }
      }
    } catch (err: any) {
      setErrorMessage('Une erreur inattendue s\'est produite');
      onError(err);
    } finally {
      setIsProcessing(false);
      onProcessing?.(false);
    }
  }, [stripe, elements, onSuccess, onError, onProcessing, returnUrl, savePaymentMethod]);

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Payment Element */}
      <div className="space-y-4">
        <div className="p-4 border border-neutral-200 rounded-lg">
          <PaymentElement 
            options={{
              layout: 'tabs',
              fields: {
                billingDetails: 'auto',
              },
              terms: {
                card: 'auto',
              },
            }}
          />
        </div>

        {/* Save Payment Method Option */}
        {savePaymentMethod && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="save-payment-method"
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="save-payment-method" className="text-sm text-neutral-700">
              Enregistrer ce moyen de paiement pour les prochains achats
            </label>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* 3D Secure Notice */}
      {threeDSecureRequired && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Authentification 3D Secure requise. Suivez les instructions de votre banque.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <div className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-lg">
        <Lock className="w-4 h-4 text-green-600 mt-0.5" />
        <div className="text-xs text-neutral-600">
          <p className="font-medium">Paiement 100% sécurisé</p>
          <p>Vos données sont protégées par un chiffrement SSL et ne sont jamais stockées.</p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full h-12 text-base font-medium"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Payer {amount.toFixed(2)} {currency.toUpperCase()}
          </>
        )}
      </Button>
    </form>
  );
};

// Main Payment Form Component (with Stripe Provider)
export const PaymentForm: React.FC<PaymentFormProps> = ({
  clientSecret,
  ...props
}) => {
  const options = {
    clientSecret,
    appearance,
    loader: 'auto' as const,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner {...props} />
    </Elements>
  );
};

// Express Checkout Component
export interface ExpressCheckoutProps {
  onExpressPayment: (paymentMethod: any) => void;
  amount: number;
  currency?: string;
  className?: string;
}

export const ExpressCheckout: React.FC<ExpressCheckoutProps> = ({
  onExpressPayment,
  amount,
  currency = 'eur',
  className
}) => {
  const [canPayApple, setCanPayApple] = useState(false);
  const [canPayGoogle, setCanPayGoogle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkWalletAvailability = async () => {
      try {
        const stripe = await stripePromise;
        if (!stripe) return;

        const paymentRequest = stripe.paymentRequest({
          country: 'FR',
          currency,
          total: {
            label: 'Total',
            amount: Math.round(amount * 100),
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const canMakePayment = await paymentRequest.canMakePayment();
        
        if (canMakePayment) {
          setCanPayApple(canMakePayment.applePay || false);
          setCanPayGoogle(canMakePayment.googlePay || false);
        }
      } catch (error) {
        console.error('Error checking wallet availability:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletAvailability();
  }, [amount, currency]);

  const handleWalletClick = async (wallet: 'apple' | 'google') => {
    try {
      const stripe = await stripePromise;
      if (!stripe) return;

      const paymentRequest = stripe.paymentRequest({
        country: 'FR',
        currency,
        total: {
          label: 'Total',
          amount: Math.round(amount * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      paymentRequest.on('paymentmethod', async (event) => {
        onExpressPayment(event.paymentMethod);
        event.complete('success');
      });

      paymentRequest.show();
    } catch (error) {
      console.error('Express payment error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex justify-center p-4', className)}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <WalletPayment
      paymentRequest={null}
      onWalletClick={handleWalletClick}
      canPayApple={canPayApple}
      canPayGoogle={canPayGoogle}
      isProcessing={false}
    />
  );
};

PaymentForm.displayName = 'PaymentForm';
ExpressCheckout.displayName = 'ExpressCheckout';