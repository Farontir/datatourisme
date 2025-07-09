import { z } from 'zod';

// Payment method types
export const PaymentMethodTypeSchema = z.enum([
  'card',
  'sepa_debit',
  'ideal',
  'sofort',
  'bancontact',
  'giropay',
  'p24',
  'eps',
  'apple_pay',
  'google_pay',
  'link',
  'paypal'
]);

export const PaymentStatusSchema = z.enum([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'requires_capture',
  'canceled',
  'succeeded'
]);

export const PaymentIntentStatusSchema = z.enum([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'requires_capture',
  'canceled',
  'succeeded'
]);

// Card details
export const CardDetailsSchema = z.object({
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number(),
  expYear: z.number(),
  fingerprint: z.string().optional(),
  funding: z.enum(['credit', 'debit', 'prepaid', 'unknown']).optional(),
  country: z.string().optional(),
});

// Payment method
export const PaymentMethodSchema = z.object({
  id: z.string(),
  type: PaymentMethodTypeSchema,
  card: CardDetailsSchema.optional(),
  billingDetails: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),
  created: z.number(),
  customer: z.string().optional(),
});

// Payment intent
export const PaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: PaymentIntentStatusSchema,
  clientSecret: z.string(),
  paymentMethodId: z.string().optional(),
  customerId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  receiptEmail: z.string().email().optional(),
  setupFutureUsage: z.enum(['on_session', 'off_session']).optional(),
  created: z.number(),
  lastPaymentError: z.object({
    code: z.string(),
    message: z.string(),
    type: z.string(),
  }).optional(),
});

// Customer
export const CustomerSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  defaultPaymentMethod: z.string().optional(),
  created: z.number(),
});

// Payment request
export const PaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('eur'),
  paymentMethodTypes: z.array(PaymentMethodTypeSchema).default(['card']),
  customerId: z.string().optional(),
  receiptEmail: z.string().email().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  setupFutureUsage: z.enum(['on_session', 'off_session']).optional(),
  
  // 3D Secure settings
  confirmationMethod: z.enum(['automatic', 'manual']).default('automatic'),
  
  // Billing details
  billingDetails: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),
});

// Payment confirmation
export const PaymentConfirmationSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
  returnUrl: z.string().url().optional(),
});

// Refund
export const RefundSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentIntentId: z.string(),
  status: z.enum(['pending', 'succeeded', 'failed', 'canceled']),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  metadata: z.record(z.string()).optional(),
  created: z.number(),
});

// Webhook event
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  livemode: z.boolean(),
  pendingWebhooks: z.number(),
  request: z.object({
    id: z.string().optional(),
    idempotencyKey: z.string().optional(),
  }).optional(),
});

// Payment error
export const PaymentErrorSchema = z.object({
  type: z.enum([
    'authentication_error',
    'api_connection_error',
    'api_error',
    'card_error',
    'idempotency_error',
    'invalid_request_error',
    'rate_limit_error'
  ]),
  code: z.string().optional(),
  message: z.string(),
  param: z.string().optional(),
  paymentIntent: z.object({
    id: z.string(),
    status: PaymentIntentStatusSchema,
  }).optional(),
});

// Billing address
export const BillingAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2, 'Country must be a 2-letter code'),
});

// Card element options
export const CardElementOptionsSchema = z.object({
  hidePostalCode: z.boolean().default(false),
  style: z.object({
    base: z.record(z.string()).optional(),
    complete: z.record(z.string()).optional(),
    empty: z.record(z.string()).optional(),
    invalid: z.record(z.string()).optional(),
  }).optional(),
  disabled: z.boolean().default(false),
});

// Payment element options
export const PaymentElementOptionsSchema = z.object({
  layout: z.enum(['tabs', 'accordion']).default('tabs'),
  paymentMethodOrder: z.array(z.string()).optional(),
  fields: z.object({
    billingDetails: z.enum(['auto', 'never']).default('auto'),
  }).optional(),
  terms: z.object({
    auBecsDebit: z.enum(['auto', 'always', 'never']).default('auto'),
    bancontact: z.enum(['auto', 'always', 'never']).default('auto'),
    card: z.enum(['auto', 'always', 'never']).default('auto'),
    ideal: z.enum(['auto', 'always', 'never']).default('auto'),
    sepaDebit: z.enum(['auto', 'always', 'never']).default('auto'),
    sofort: z.enum(['auto', 'always', 'never']).default('auto'),
    usBankAccount: z.enum(['auto', 'always', 'never']).default('auto'),
  }).optional(),
});

// Apple Pay/Google Pay options
export const WalletOptionsSchema = z.object({
  applePay: z.object({
    merchantIdentifier: z.string(),
    merchantCapabilities: z.array(z.enum(['3DS', 'EMV', 'debit', 'credit'])).optional(),
    supportedNetworks: z.array(z.string()).optional(),
  }).optional(),
  googlePay: z.object({
    merchantId: z.string(),
    merchantOrigin: z.string().url(),
    buttonColor: z.enum(['default', 'black', 'white']).default('default'),
    buttonType: z.enum(['book', 'buy', 'checkout', 'donate', 'order', 'pay', 'plain', 'subscribe']).default('pay'),
  }).optional(),
});

// Type exports
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>;
export type CardDetails = z.infer<typeof CardDetailsSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
export type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>;
export type Refund = z.infer<typeof RefundSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type PaymentError = z.infer<typeof PaymentErrorSchema>;
export type BillingAddress = z.infer<typeof BillingAddressSchema>;
export type CardElementOptions = z.infer<typeof CardElementOptionsSchema>;
export type PaymentElementOptions = z.infer<typeof PaymentElementOptionsSchema>;
export type WalletOptions = z.infer<typeof WalletOptionsSchema>;

// Payment form state
export interface PaymentFormState {
  isProcessing: boolean;
  error: PaymentError | null;
  paymentIntent: PaymentIntent | null;
  billingDetails: {
    name: string;
    email: string;
    address: BillingAddress;
  };
  savePaymentMethod: boolean;
  selectedPaymentMethod: PaymentMethodType;
}

// Payment flow events
export interface PaymentFlowEvent {
  type: 'payment_started' | 'payment_processing' | 'payment_succeeded' | 'payment_failed' | 'payment_canceled';
  paymentIntentId: string;
  amount: number;
  currency: string;
  error?: PaymentError;
  timestamp: Date;
}

// Stripe configuration
export interface StripeConfig {
  publishableKey: string;
  webhookSecret: string;
  apiVersion: string;
  appearance: {
    theme: 'stripe' | 'night' | 'flat';
    variables: Record<string, string>;
  };
  paymentMethodTypes: PaymentMethodType[];
  currency: string;
  locale: string;
}