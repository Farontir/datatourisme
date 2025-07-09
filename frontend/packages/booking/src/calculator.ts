import { 
  PricingBreakdown, 
  BookingGuest, 
  Discount, 
  Tax, 
  Fee,
  PriceCalculationRequest,
  TimeSlot
} from './types';

export interface PricingRule {
  id: string;
  name: string;
  type: 'base' | 'guest_category' | 'time_slot' | 'seasonal' | 'group';
  conditions: {
    guestCategory?: string;
    minGuests?: number;
    maxGuests?: number;
    dateRange?: { start: Date; end: Date };
    timeSlotIds?: string[];
    dayOfWeek?: number[];
  };
  pricing: {
    type: 'fixed' | 'percentage' | 'per_guest';
    value: number;
    currency?: string;
  };
}

export interface ResourcePricing {
  resourceId: string;
  basePrices: {
    adult: number;
    child: number;
    infant: number;
    senior: number;
  };
  rules: PricingRule[];
  taxes: Omit<Tax, 'amount'>[];
  fees: Fee[];
  currency: string;
}

export class PriceCalculator {
  private taxRates: Map<string, number> = new Map();
  private discountCodes: Map<string, Discount> = new Map();

  constructor() {
    // Initialize default tax rates
    this.taxRates.set('FR', 20); // France VAT
    this.taxRates.set('DE', 19); // Germany VAT
    this.taxRates.set('ES', 21); // Spain VAT
    // Add more countries as needed
  }

  /**
   * Calculate the total price for a booking
   */
  calculatePrice(
    resourcePricing: ResourcePricing,
    guests: BookingGuest[],
    date: Date,
    timeSlot?: TimeSlot,
    discountCodes: string[] = [],
    countryCode: string = 'FR'
  ): PricingBreakdown {
    // Step 1: Calculate base price
    const basePrice = this.calculateBasePrice(resourcePricing, guests);

    // Step 2: Apply pricing rules (time slots, seasonal, group discounts)
    const adjustedPrice = this.applyPricingRules(
      basePrice,
      resourcePricing.rules,
      guests,
      date,
      timeSlot
    );

    // Step 3: Calculate subtotal
    let subtotal = adjustedPrice;

    // Step 4: Apply discount codes
    const discounts = this.applyDiscounts(subtotal, discountCodes, guests);
    const totalDiscountAmount = discounts.reduce((sum, discount) => sum + discount.value, 0);
    subtotal = Math.max(0, subtotal - totalDiscountAmount);

    // Step 5: Add mandatory fees
    const fees = resourcePricing.fees.filter(fee => fee.mandatory);
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
    subtotal += totalFees;

    // Step 6: Calculate taxes
    const taxes = this.calculateTaxes(subtotal, resourcePricing.taxes, countryCode);
    const totalTaxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);

    // Step 7: Calculate final total
    const total = subtotal + totalTaxAmount;

    return {
      basePrice,
      subtotal,
      discounts,
      taxes,
      fees,
      total,
      currency: resourcePricing.currency,
    };
  }

  /**
   * Calculate base price based on guest categories
   */
  private calculateBasePrice(resourcePricing: ResourcePricing, guests: BookingGuest[]): number {
    return guests.reduce((total, guest) => {
      const categoryPrice = resourcePricing.basePrices[guest.category] || 0;
      return total + categoryPrice;
    }, 0);
  }

  /**
   * Apply pricing rules (time slots, seasonal pricing, group discounts)
   */
  private applyPricingRules(
    basePrice: number,
    rules: PricingRule[],
    guests: BookingGuest[],
    date: Date,
    timeSlot?: TimeSlot
  ): number {
    let adjustedPrice = basePrice;

    // Apply time slot modifier first
    if (timeSlot) {
      adjustedPrice *= timeSlot.priceModifier;
    }

    // Apply other pricing rules
    for (const rule of rules) {
      if (this.ruleApplies(rule, guests, date, timeSlot)) {
        adjustedPrice = this.applyPricingRule(adjustedPrice, rule, guests);
      }
    }

    return adjustedPrice;
  }

  /**
   * Check if a pricing rule applies to the current booking
   */
  private ruleApplies(
    rule: PricingRule,
    guests: BookingGuest[],
    date: Date,
    timeSlot?: TimeSlot
  ): boolean {
    const conditions = rule.conditions;

    // Check guest count
    if (conditions.minGuests && guests.length < conditions.minGuests) return false;
    if (conditions.maxGuests && guests.length > conditions.maxGuests) return false;

    // Check date range
    if (conditions.dateRange) {
      const { start, end } = conditions.dateRange;
      if (date < start || date > end) return false;
    }

    // Check day of week
    if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(date.getDay())) return false;

    // Check time slot
    if (conditions.timeSlotIds && timeSlot && !conditions.timeSlotIds.includes(timeSlot.id)) {
      return false;
    }

    // Check guest category
    if (conditions.guestCategory) {
      const hasCategory = guests.some(guest => guest.category === conditions.guestCategory);
      if (!hasCategory) return false;
    }

    return true;
  }

  /**
   * Apply a specific pricing rule
   */
  private applyPricingRule(price: number, rule: PricingRule, guests: BookingGuest[]): number {
    const { type, value } = rule.pricing;

    switch (type) {
      case 'fixed':
        return price + value;
      case 'percentage':
        return price * (1 + value / 100);
      case 'per_guest':
        return price + (value * guests.length);
      default:
        return price;
    }
  }

  /**
   * Apply discount codes
   */
  private applyDiscounts(
    subtotal: number,
    discountCodes: string[],
    guests: BookingGuest[]
  ): Discount[] {
    const appliedDiscounts: Discount[] = [];

    for (const code of discountCodes) {
      const discount = this.discountCodes.get(code);
      if (!discount) continue;

      // Check if discount is valid
      if (!this.isDiscountValid(discount, subtotal, guests)) continue;

      // Calculate discount amount
      let discountAmount = 0;
      switch (discount.type) {
        case 'percentage':
          discountAmount = subtotal * (discount.value / 100);
          break;
        case 'fixed':
          discountAmount = discount.value;
          break;
        case 'freeShipping':
          // This would apply to shipping fees if any
          discountAmount = 0;
          break;
      }

      // Apply discount amount limits
      if (discount.conditions?.maxAmount) {
        discountAmount = Math.min(discountAmount, discount.conditions.maxAmount);
      }

      appliedDiscounts.push({
        ...discount,
        value: discountAmount,
      });
    }

    return appliedDiscounts;
  }

  /**
   * Check if discount is valid for current booking
   */
  private isDiscountValid(discount: Discount, subtotal: number, guests: BookingGuest[]): boolean {
    const conditions = discount.conditions;
    if (!conditions) return true;

    // Check minimum amount
    if (conditions.minAmount && subtotal < conditions.minAmount) return false;

    // Check date validity
    const now = new Date();
    if (conditions.validFrom && now < conditions.validFrom) return false;
    if (conditions.validTo && now > conditions.validTo) return false;

    // Check usage limit
    if (conditions.usageLimit && conditions.usageCount >= conditions.usageLimit) return false;

    return true;
  }

  /**
   * Calculate taxes
   */
  private calculateTaxes(
    subtotal: number,
    taxDefinitions: Omit<Tax, 'amount'>[],
    countryCode: string
  ): Tax[] {
    const taxes: Tax[] = [];

    for (const taxDef of taxDefinitions) {
      let taxRate = taxDef.rate;
      
      // Use country-specific tax rate if available
      if (this.taxRates.has(countryCode)) {
        taxRate = this.taxRates.get(countryCode)!;
      }

      const taxAmount = taxDef.inclusive 
        ? subtotal * (taxRate / (100 + taxRate)) // Tax is included in price
        : subtotal * (taxRate / 100); // Tax is added to price

      taxes.push({
        ...taxDef,
        rate: taxRate,
        amount: taxAmount,
      });
    }

    return taxes;
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  calculateRefund(
    originalAmount: number,
    cancellationDate: Date,
    eventDate: Date,
    cancellationPolicy: any
  ): { refundAmount: number; fee: number; refundPercentage: number } {
    const hoursUntilEvent = (eventDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);

    // Find applicable rule
    const applicableRule = cancellationPolicy.rules
      .filter((rule: any) => hoursUntilEvent >= rule.hoursBeforeStart)
      .sort((a: any, b: any) => a.hoursBeforeStart - b.hoursBeforeStart)[0];

    if (!applicableRule) {
      // No refund if cancelling too late
      return { refundAmount: 0, fee: originalAmount, refundPercentage: 0 };
    }

    const refundPercentage = applicableRule.refundPercentage;
    const fee = applicableRule.fee;
    const refundAmount = Math.max(0, (originalAmount * refundPercentage / 100) - fee);

    return { refundAmount, fee, refundPercentage };
  }

  /**
   * Add discount code
   */
  addDiscountCode(code: string, discount: Discount): void {
    this.discountCodes.set(code, discount);
  }

  /**
   * Remove discount code
   */
  removeDiscountCode(code: string): void {
    this.discountCodes.delete(code);
  }

  /**
   * Get available discount codes
   */
  getAvailableDiscounts(): Discount[] {
    return Array.from(this.discountCodes.values());
  }

  /**
   * Validate discount code
   */
  validateDiscountCode(code: string, subtotal: number, guests: BookingGuest[]): {
    isValid: boolean;
    discount?: Discount;
    reason?: string;
  } {
    const discount = this.discountCodes.get(code);
    
    if (!discount) {
      return { isValid: false, reason: 'Discount code not found' };
    }

    if (!this.isDiscountValid(discount, subtotal, guests)) {
      return { isValid: false, reason: 'Discount code is not valid for this booking' };
    }

    return { isValid: true, discount };
  }
}

// Singleton instance
export const priceCalculator = new PriceCalculator();