import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Input } from './Input';
import { Label } from './Label';
import { Textarea } from './Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  Euro,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  CreditCard,
  Shield
} from 'lucide-react';

// Types for booking steps
export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: number;
  price: number;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: number;
  category: 'adult' | 'child' | 'infant' | 'senior';
}

export interface PricingBreakdown {
  basePrice: number;
  discounts: Array<{ name: string; amount: number }>;
  taxes: Array<{ name: string; amount: number }>;
  fees: Array<{ name: string; amount: number }>;
  total: number;
}

// Step 1: Resource and Date Selection
interface SelectionStepProps {
  selectedResource?: any;
  selectedDate?: Date;
  selectedTimeSlot?: TimeSlot;
  availableTimeSlots: TimeSlot[];
  guestCount: number;
  onResourceChange?: (resource: any) => void;
  onDateChange: (date: Date) => void;
  onTimeSlotChange: (timeSlot: TimeSlot) => void;
  onGuestCountChange: (count: number) => void;
  onValidationChange: (isValid: boolean) => void;
}

export const SelectionStep: React.FC<SelectionStepProps> = ({
  selectedResource,
  selectedDate,
  selectedTimeSlot,
  availableTimeSlots,
  guestCount,
  onDateChange,
  onTimeSlotChange,
  onGuestCountChange,
  onValidationChange
}) => {
  const [localDate, setLocalDate] = useState(selectedDate || new Date());

  useEffect(() => {
    const isValid = !!(selectedDate && selectedTimeSlot && guestCount > 0);
    onValidationChange(isValid);
  }, [selectedDate, selectedTimeSlot, guestCount, onValidationChange]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setLocalDate(date);
    onDateChange(date);
  };

  const incrementGuests = () => {
    onGuestCountChange(guestCount + 1);
  };

  const decrementGuests = () => {
    if (guestCount > 1) {
      onGuestCountChange(guestCount - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resource Summary */}
      {selectedResource && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-neutral-200 rounded-lg flex items-center justify-center">
                <MapPin className="w-8 h-8 text-neutral-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedResource.name}</h3>
                <p className="text-neutral-600">{selectedResource.location}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm ml-1">{selectedResource.rating}</span>
                  </div>
                  <Badge variant="secondary">{selectedResource.category}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="booking-date">Date de visite</Label>
          <Input
            id="booking-date"
            type="date"
            value={localDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1"
          />
        </div>

        {/* Guest Count */}
        <div>
          <Label>Nombre de visiteurs</Label>
          <div className="flex items-center space-x-4 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={decrementGuests}
              disabled={guestCount <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-lg font-medium w-8 text-center">{guestCount}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={incrementGuests}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-sm text-neutral-600">visiteur(s)</span>
          </div>
        </div>

        {/* Time Slot Selection */}
        {availableTimeSlots.length > 0 && (
          <div>
            <Label>Créneaux horaires disponibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {availableTimeSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onTimeSlotChange(slot)}
                  className={cn(
                    'p-3 border rounded-lg text-left transition-colors',
                    selectedTimeSlot?.id === slot.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                      <p className="text-sm text-neutral-600">{slot.available} places</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{slot.price}€</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Step 2: Guest Details
interface DetailsStepProps {
  guests: Guest[];
  primaryContact: Guest;
  specialRequirements?: string;
  onGuestsChange: (guests: Guest[]) => void;
  onPrimaryContactChange: (contact: Guest) => void;
  onSpecialRequirementsChange: (requirements: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  guests,
  primaryContact,
  specialRequirements,
  onGuestsChange,
  onPrimaryContactChange,
  onSpecialRequirementsChange,
  onValidationChange
}) => {
  useEffect(() => {
    const isValid = !!(
      primaryContact.firstName &&
      primaryContact.lastName &&
      primaryContact.email &&
      guests.every(guest => guest.firstName && guest.lastName)
    );
    onValidationChange(isValid);
  }, [guests, primaryContact, onValidationChange]);

  const updateGuest = (index: number, field: keyof Guest, value: any) => {
    const updatedGuests = [...guests];
    updatedGuests[index] = { ...updatedGuests[index], [field]: value };
    onGuestsChange(updatedGuests);
  };

  const updatePrimaryContact = (field: keyof Guest, value: any) => {
    onPrimaryContactChange({ ...primaryContact, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Primary Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Contact principal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-firstname">Prénom *</Label>
              <Input
                id="primary-firstname"
                value={primaryContact.firstName}
                onChange={(e) => updatePrimaryContact('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="primary-lastname">Nom *</Label>
              <Input
                id="primary-lastname"
                value={primaryContact.lastName}
                onChange={(e) => updatePrimaryContact('lastName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="primary-email">Email *</Label>
              <Input
                id="primary-email"
                type="email"
                value={primaryContact.email}
                onChange={(e) => updatePrimaryContact('email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="primary-phone">Téléphone</Label>
              <Input
                id="primary-phone"
                type="tel"
                value={primaryContact.phone || ''}
                onChange={(e) => updatePrimaryContact('phone', e.target.value)}
                placeholder="+33 1 23 45 67 89"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest Details */}
      <Card>
        <CardHeader>
          <CardTitle>Détails des visiteurs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {guests.map((guest, index) => (
            <div key={guest.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Visiteur {index + 1}</h4>
                <Select
                  value={guest.category}
                  onValueChange={(value: any) => updateGuest(index, 'category', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adulte</SelectItem>
                    <SelectItem value="child">Enfant</SelectItem>
                    <SelectItem value="infant">Bébé</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Prénom *</Label>
                  <Input
                    value={guest.firstName}
                    onChange={(e) => updateGuest(index, 'firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Nom *</Label>
                  <Input
                    value={guest.lastName}
                    onChange={(e) => updateGuest(index, 'lastName', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Special Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes spéciales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Indiquez ici toute demande spéciale ou besoin d'accessibilité..."
            value={specialRequirements || ''}
            onChange={(e) => onSpecialRequirementsChange(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Step 3: Payment
interface PaymentStepProps {
  pricing: PricingBreakdown;
  selectedPaymentMethod?: string;
  savedPaymentMethods: Array<{ id: string; type: string; last4: string }>;
  onPaymentMethodChange: (method: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  pricing,
  selectedPaymentMethod,
  savedPaymentMethods,
  onPaymentMethodChange,
  onValidationChange
}) => {
  useEffect(() => {
    const isValid = !!selectedPaymentMethod;
    onValidationChange(isValid);
  }, [selectedPaymentMethod, onValidationChange]);

  return (
    <div className="space-y-6">
      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Euro className="w-5 h-5" />
            <span>Récapitulatif des prix</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Prix de base</span>
              <span>{pricing.basePrice.toFixed(2)} €</span>
            </div>
            
            {pricing.discounts.map((discount, index) => (
              <div key={index} className="flex justify-between text-green-600">
                <span>{discount.name}</span>
                <span>-{discount.amount.toFixed(2)} €</span>
              </div>
            ))}
            
            {pricing.taxes.map((tax, index) => (
              <div key={index} className="flex justify-between text-neutral-600">
                <span>{tax.name}</span>
                <span>{tax.amount.toFixed(2)} €</span>
              </div>
            ))}
            
            {pricing.fees.map((fee, index) => (
              <div key={index} className="flex justify-between text-neutral-600">
                <span>{fee.name}</span>
                <span>{fee.amount.toFixed(2)} €</span>
              </div>
            ))}
            
            <hr className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{pricing.total.toFixed(2)} €</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Méthode de paiement</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Saved Payment Methods */}
          {savedPaymentMethods.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Moyens de paiement enregistrés</h4>
              {savedPaymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={cn(
                    'flex items-center space-x-3 p-3 border rounded-lg cursor-pointer',
                    selectedPaymentMethod === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200'
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedPaymentMethod === method.id}
                    onChange={() => onPaymentMethodChange(method.id)}
                  />
                  <CreditCard className="w-5 h-5" />
                  <span>{method.type} •••• {method.last4}</span>
                </label>
              ))}
            </div>
          )}

          {/* New Payment Method */}
          <div className="space-y-3">
            <h4 className="font-medium">Nouveau moyen de paiement</h4>
            <label
              className={cn(
                'flex items-center space-x-3 p-3 border rounded-lg cursor-pointer',
                selectedPaymentMethod === 'new'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200'
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="new"
                checked={selectedPaymentMethod === 'new'}
                onChange={() => onPaymentMethodChange('new')}
              />
              <CreditCard className="w-5 h-5" />
              <span>Carte bancaire</span>
            </label>

            {/* Wallet Options */}
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  'flex items-center justify-center space-x-2 p-3 border rounded-lg cursor-pointer',
                  selectedPaymentMethod === 'apple-pay'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200'
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="apple-pay"
                  checked={selectedPaymentMethod === 'apple-pay'}
                  onChange={() => onPaymentMethodChange('apple-pay')}
                />
                <span>Apple Pay</span>
              </label>
              
              <label
                className={cn(
                  'flex items-center justify-center space-x-2 p-3 border rounded-lg cursor-pointer',
                  selectedPaymentMethod === 'google-pay'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200'
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="google-pay"
                  checked={selectedPaymentMethod === 'google-pay'}
                  onChange={() => onPaymentMethodChange('google-pay')}
                />
                <span>Google Pay</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="flex items-start space-x-3 p-4 bg-neutral-50 rounded-lg">
        <Shield className="w-5 h-5 text-green-500 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-neutral-900">Paiement sécurisé</p>
          <p className="text-neutral-600">
            Vos informations de paiement sont protégées par un chiffrement SSL et ne sont jamais stockées sur nos serveurs.
          </p>
        </div>
      </div>
    </div>
  );
};

// Step 4: Confirmation
interface ConfirmationStepProps {
  bookingData: any;
  onValidationChange: (isValid: boolean) => void;
}

export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  bookingData,
  onValidationChange
}) => {
  useEffect(() => {
    onValidationChange(true);
  }, [onValidationChange]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Réservation confirmée !
        </h2>
        <p className="text-gray-600">
          Votre réservation a été enregistrée avec succès.
        </p>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif de votre réservation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">Numéro de confirmation</span>
            <span className="font-mono">{bookingData.confirmationNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Lieu</span>
            <span>{bookingData.resourceName}</span>
          </div>
          <div className="flex justify-between">
            <span>Date et heure</span>
            <span>{bookingData.date} à {bookingData.time}</span>
          </div>
          <div className="flex justify-between">
            <span>Nombre de visiteurs</span>
            <span>{bookingData.guestCount}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total payé</span>
            <span>{bookingData.totalAmount} €</span>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Prochaines étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Confirmation envoyée par email</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Rappel 24h avant votre visite</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-purple-500" />
              <span>Itinéraire disponible dans votre email</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};