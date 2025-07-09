import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  PaymentRequest,
  PaymentConfirmation,
  PaymentIntent,
  PaymentError,
  PaymentFormState,
  StripeConfig,
  PaymentElementOptions,
  WalletOptions
} from './types';

export class StripePaymentManager {
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.initializeStripe();
  }

  private async initializeStripe() {
    try {
      this.stripe = await loadStripe(this.config.publishableKey, {
        apiVersion: this.config.apiVersion as any,
        locale: this.config.locale as any,
      });

      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      throw error;
    }
  }

  /**
   * Create payment intent on the server
   */
  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Initialize Stripe Elements with payment intent
   */
  async initializeElements(
    clientSecret: string,
    options?: PaymentElementOptions
  ): Promise<StripeElements> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    const defaultOptions: PaymentElementOptions = {
      layout: 'tabs',
      fields: {
        billingDetails: 'auto',
      },
      terms: {
        card: 'auto',
        ideal: 'never',
        sofort: 'never',
        bancontact: 'never',
        auBecsDebit: 'never',
        sepaDebit: 'never',
        usBankAccount: 'never',
      },
      ...options,
    };

    this.elements = this.stripe.elements({
      clientSecret,
      appearance: this.config.appearance,
      ...defaultOptions,
    });

    return this.elements;
  }

  /**
   * Create Payment Element
   */
  createPaymentElement(options?: PaymentElementOptions) {
    if (!this.elements) {
      throw new Error('Elements not initialized. Call initializeElements first.');
    }

    return this.elements.create('payment', {
      layout: options?.layout || 'tabs',
      fields: options?.fields,
      terms: options?.terms,
    });
  }

  /**
   * Create Express Checkout Element (Apple Pay, Google Pay, etc.)
   */
  createExpressCheckoutElement(options?: WalletOptions) {
    if (!this.elements) {
      throw new Error('Elements not initialized. Call initializeElements first.');
    }

    return this.elements.create('expressCheckout' as any, {
      buttonTheme: {
        applePay: 'black',
        googlePay: 'black',
      },
      ...options,
    } as any);
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(
    confirmation: PaymentConfirmation,
    returnUrl?: string
  ): Promise<{ error?: PaymentError; paymentIntent?: PaymentIntent }> {
    if (!this.stripe || !this.elements) {
      throw new Error('Stripe or Elements not initialized');
    }

    try {
      const result = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/payment/confirmation`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        return { error: result.error as PaymentError };
      }

      return { paymentIntent: result.paymentIntent as unknown as PaymentIntent };
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Handle 3D Secure authentication
   */
  async handleNextAction(
    clientSecret: string
  ): Promise<{ error?: PaymentError; paymentIntent?: PaymentIntent }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.handleNextAction({
        clientSecret,
      });

      if (result.error) {
        return { error: result.error as PaymentError };
      }

      return { paymentIntent: result.paymentIntent as unknown as PaymentIntent };
    } catch (error) {
      console.error('3D Secure authentication failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve payment intent
   */
  async retrievePaymentIntent(
    clientSecret: string
  ): Promise<{ error?: PaymentError; paymentIntent?: PaymentIntent }> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.retrievePaymentIntent(clientSecret);

      if (result.error) {
        return { error: result.error as PaymentError };
      }

      return { paymentIntent: result.paymentIntent as unknown as PaymentIntent };
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error);
      throw error;
    }
  }

  /**
   * Save payment method for future use
   */
  async savePaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<{ error?: PaymentError; success?: boolean }> {
    try {
      const response = await fetch('/api/payments/save-payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          customerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error as PaymentError };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save payment method:', error);
      throw error;
    }
  }

  /**
   * Get saved payment methods for customer
   */
  async getSavedPaymentMethods(customerId: string) {
    try {
      const response = await fetch(`/api/payments/payment-methods?customerId=${customerId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Delete saved payment method
   */
  async deletePaymentMethod(
    paymentMethodId: string
  ): Promise<{ error?: PaymentError; success?: boolean }> {
    try {
      const response = await fetch('/api/payments/delete-payment-method', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error as PaymentError };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ error?: PaymentError; refund?: any }> {
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error as PaymentError };
      }

      const refund = await response.json();
      return { refund };
    } catch (error) {
      console.error('Failed to process refund:', error);
      throw error;
    }
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(): Promise<{ error?: PaymentError; valid?: boolean }> {
    if (!this.elements) {
      throw new Error('Elements not initialized');
    }

    try {
      const { error } = await this.elements.submit();

      if (error) {
        return { error: error as PaymentError };
      }

      return { valid: true };
    } catch (error) {
      console.error('Payment method validation failed:', error);
      throw error;
    }
  }

  /**
   * Check if Apple Pay is available
   */
  async canMakeApplePayPayment(): Promise<boolean> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      return false;
    }

    try {
      const result = await this.stripe.paymentRequest({
        country: 'FR',
        currency: this.config.currency,
        total: {
          label: 'Test',
          amount: 1000,
        },
      });

      const canMake = await result.canMakePayment();
      return !!canMake;
    } catch {
      return false;
    }
  }

  /**
   * Check if Google Pay is available
   */
  async canMakeGooglePayPayment(): Promise<boolean> {
    if (!this.stripe) {
      await this.initializeStripe();
    }

    if (!this.stripe) {
      return false;
    }

    try {
      const result = await this.stripe.paymentRequest({
        country: 'FR',
        currency: this.config.currency,
        total: {
          label: 'Test',
          amount: 1000,
        },
      });

      const canMake = await result.canMakePayment();
      return !!canMake;
    } catch {
      return false;
    }
  }

  /**
   * Get Stripe instance
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * Get Elements instance
   */
  getElements(): StripeElements | null {
    return this.elements;
  }

  /**
   * Destroy elements
   */
  destroyElements(): void {
    if (this.elements) {
      // Elements will be automatically destroyed when the component unmounts
      this.elements = null;
    }
  }
}

// Default configuration
export const defaultStripeConfig: StripeConfig = {
  publishableKey: (typeof window !== 'undefined' ? (window as any).process?.env?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : '') || '',
  webhookSecret: (typeof window !== 'undefined' ? (window as any).process?.env?.STRIPE_WEBHOOK_SECRET : '') || '',
  apiVersion: '2023-10-16',
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Ideal Sans, system-ui, sans-serif',
      spacingUnit: '2px',
      borderRadius: '4px',
    },
  },
  paymentMethodTypes: ['card', 'apple_pay', 'google_pay'],
  currency: 'eur',
  locale: 'fr',
};

// Singleton instance
export const stripePaymentManager = new StripePaymentManager(defaultStripeConfig);