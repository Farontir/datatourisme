import { z } from 'zod';
import { TouristResourceId } from '@datatourisme/types';

// Booking flow types
export const BookingStepSchema = z.enum([
  'selection',    // Resource and date selection
  'details',      // Guest details and special requirements
  'payment',      // Payment information
  'confirmation'  // Booking confirmation
]);

export const BookingStatusSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded'
]);

export const PaymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'cancelled',
  'refunded'
]);

// Guest information
export const GuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  nationality: z.string().optional(),
  specialRequirements: z.string().optional(),
});

export const BookingGuestSchema = GuestSchema.extend({
  isPrimary: z.boolean().default(false),
  age: z.number().min(0).max(120).optional(),
  category: z.enum(['adult', 'child', 'infant', 'senior']).default('adult'),
});

// Pricing and discounts
export const DiscountSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(['percentage', 'fixed', 'freeShipping']),
  value: z.number(),
  description: z.string(),
  conditions: z.object({
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    validFrom: z.date().optional(),
    validTo: z.date().optional(),
    usageLimit: z.number().optional(),
    usageCount: z.number().default(0),
    eligibleCategories: z.array(z.string()).optional(),
  }).optional(),
});

export const TaxSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(), // As percentage (e.g., 20 for 20%)
  amount: z.number(),
  inclusive: z.boolean().default(false),
});

export const FeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(['booking', 'service', 'cancellation', 'processing']),
  mandatory: z.boolean().default(true),
});

export const PricingBreakdownSchema = z.object({
  basePrice: z.number(),
  subtotal: z.number(),
  discounts: z.array(DiscountSchema).default([]),
  taxes: z.array(TaxSchema).default([]),
  fees: z.array(FeeSchema).default([]),
  total: z.number(),
  currency: z.string().default('EUR'),
});

// Availability and slots
export const TimeSlotSchema = z.object({
  id: z.string(),
  startTime: z.string(), // ISO time string (e.g., "14:00")
  endTime: z.string(),
  duration: z.number(), // Duration in minutes
  capacity: z.number(),
  available: z.number(),
  priceModifier: z.number().default(1), // Multiplier for base price
});

export const AvailabilitySlotSchema = z.object({
  date: z.date(),
  timeSlots: z.array(TimeSlotSchema),
  isAvailable: z.boolean(),
  reason: z.string().optional(), // Reason if not available
  minimumNotice: z.number().default(0), // Minimum hours notice required
  maximumAdvance: z.number().default(365), // Maximum days in advance
});

// Main booking types
export const BookingItemSchema = z.object({
  id: z.string(),
  resourceId: z.string().transform(id => id as TouristResourceId),
  resourceName: z.string(),
  resourceDescription: z.string().optional(),
  date: z.date(),
  timeSlot: TimeSlotSchema.optional(),
  guests: z.array(BookingGuestSchema),
  guestCount: z.number().min(1),
  specialRequirements: z.string().optional(),
  pricing: PricingBreakdownSchema,
  cancellationPolicy: z.string().optional(),
});

export const BookingSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  status: BookingStatusSchema,
  step: BookingStepSchema,
  items: z.array(BookingItemSchema),
  totalAmount: z.number(),
  currency: z.string().default('EUR'),
  
  // Contact information
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  
  // Payment information
  paymentStatus: PaymentStatusSchema,
  paymentIntentId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  
  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  confirmedAt: z.date().optional(),
  cancelledAt: z.date().optional(),
  
  // Additional data
  notes: z.string().optional(),
  source: z.string().default('web'),
  locale: z.string().default('fr'),
  
  // References
  confirmationNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  
  // Progress tracking
  progressData: z.record(z.unknown()).optional(),
});

// Booking flow state
export const BookingFlowStateSchema = z.object({
  currentStep: BookingStepSchema,
  completedSteps: z.array(BookingStepSchema),
  booking: BookingSchema.partial(),
  
  // Form validation
  stepValidation: z.record(z.boolean()).default({}),
  errors: z.record(z.array(z.string())).default({}),
  
  // UI state
  isLoading: z.boolean().default(false),
  isSaving: z.boolean().default(false),
  lastSaved: z.date().optional(),
});

// Availability check request/response
export const AvailabilityCheckRequestSchema = z.object({
  resourceId: z.string().transform(id => id as TouristResourceId),
  date: z.date(),
  guestCount: z.number().min(1),
  timeSlotId: z.string().optional(),
});

export const AvailabilityCheckResponseSchema = z.object({
  isAvailable: z.boolean(),
  reason: z.string().optional(),
  availableSlots: z.array(TimeSlotSchema).optional(),
  suggestedDates: z.array(z.date()).optional(),
  pricing: PricingBreakdownSchema.optional(),
});

// Price calculation request
export const PriceCalculationRequestSchema = z.object({
  resourceId: z.string().transform(id => id as TouristResourceId),
  date: z.date(),
  timeSlotId: z.string().optional(),
  guests: z.array(BookingGuestSchema),
  discountCodes: z.array(z.string()).default([]),
});

// Booking actions
export const BookingActionSchema = z.enum([
  'create',
  'update',
  'confirm',
  'cancel',
  'refund',
  'modify',
  'extend',
  'transfer'
]);

export const BookingActionRequestSchema = z.object({
  action: BookingActionSchema,
  bookingId: z.string(),
  reason: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

// Cancellation and refund
export const CancellationPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  rules: z.array(z.object({
    hoursBeforeStart: z.number(),
    refundPercentage: z.number().min(0).max(100),
    fee: z.number().default(0),
  })),
  gracePeriod: z.number().default(24), // Hours
});

export const RefundSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  amount: z.number(),
  currency: z.string().default('EUR'),
  reason: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  processedAt: z.date().optional(),
  refundReference: z.string().optional(),
});

// Type exports
export type BookingStep = z.infer<typeof BookingStepSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type Guest = z.infer<typeof GuestSchema>;
export type BookingGuest = z.infer<typeof BookingGuestSchema>;
export type Discount = z.infer<typeof DiscountSchema>;
export type Tax = z.infer<typeof TaxSchema>;
export type Fee = z.infer<typeof FeeSchema>;
export type PricingBreakdown = z.infer<typeof PricingBreakdownSchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
export type BookingItem = z.infer<typeof BookingItemSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type BookingFlowState = z.infer<typeof BookingFlowStateSchema>;
export type AvailabilityCheckRequest = z.infer<typeof AvailabilityCheckRequestSchema>;
export type AvailabilityCheckResponse = z.infer<typeof AvailabilityCheckResponseSchema>;
export type PriceCalculationRequest = z.infer<typeof PriceCalculationRequestSchema>;
export type BookingAction = z.infer<typeof BookingActionSchema>;
export type BookingActionRequest = z.infer<typeof BookingActionRequestSchema>;
export type CancellationPolicy = z.infer<typeof CancellationPolicySchema>;
export type Refund = z.infer<typeof RefundSchema>;

// Event types for real-time updates
export interface BookingEvent {
  type: 'availability_changed' | 'price_updated' | 'booking_confirmed' | 'booking_cancelled';
  resourceId: TouristResourceId;
  data: any;
  timestamp: Date;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'booking_update' | 'availability_update' | 'price_update';
  payload: BookingEvent;
}