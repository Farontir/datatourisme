'use client';

import { useState, useCallback } from 'react';
import { 
  BookingWizard, 
  SelectionStep,
  DetailsStep,
  PaymentStep,
  ConfirmationStep,
  BookingConfirmation,
  StepIcons
} from '@datatourisme/ui';

// Example booking flow component
export function BookingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [bookingData, setBookingData] = useState<any>({
    selectedResource: null,
    selectedDate: null,
    selectedTimeSlot: null,
    guestCount: 1,
    guests: [],
    primaryContact: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    specialRequirements: '',
    selectedPaymentMethod: null,
    pricing: {
      basePrice: 0,
      discounts: [],
      taxes: [],
      fees: [],
      total: 0
    }
  });
  const [isCompleted, setIsCompleted] = useState(false);

  // Mock data
  const availableTimeSlots = [
    { id: '1', startTime: '09:00', endTime: '11:00', available: 20, price: 25 },
    { id: '2', startTime: '14:00', endTime: '16:00', available: 15, price: 25 },
    { id: '3', startTime: '16:30', endTime: '18:30', available: 10, price: 30 }
  ];

  const savedPaymentMethods = [
    { id: '1', type: 'Visa', last4: '4242', brand: 'visa', expMonth: 12, expYear: 2025 }
  ];

  // Step definitions
  const steps = [
    {
      id: 'selection',
      title: 'Sélection',
      description: 'Choisissez votre date et créneau',
      icon: StepIcons.Selection,
      isValid: !!(bookingData.selectedDate && bookingData.selectedTimeSlot),
      component: SelectionStep,
    },
    {
      id: 'details',
      title: 'Détails',
      description: 'Informations des visiteurs',
      icon: StepIcons.Details,
      isValid: !!(bookingData.primaryContact.firstName && bookingData.primaryContact.lastName && bookingData.primaryContact.email),
      component: DetailsStep,
    },
    {
      id: 'payment',
      title: 'Paiement',
      description: 'Finaliser votre réservation',
      icon: StepIcons.Payment,
      isValid: !!bookingData.selectedPaymentMethod,
      component: PaymentStep,
    },
    {
      id: 'confirmation',
      title: 'Confirmation',
      description: 'Réservation confirmée',
      icon: StepIcons.Confirmation,
      isValid: true,
      component: ConfirmationStep,
    },
  ];

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleComplete = useCallback(() => {
    // Process final booking
    const finalBooking = {
      ...bookingData,
      id: `booking-${Date.now()}`,
      confirmationNumber: `DT${Date.now().toString().slice(-8)}`,
      status: 'confirmed' as const,
      qrCodeData: `booking:${Date.now()}`,
      resourceName: 'Château de Versailles',
      resourceLocation: 'Versailles, France',
      resourceAddress: 'Place d\'Armes, 78000 Versailles',
      date: bookingData.selectedDate || new Date(),
      timeSlot: bookingData.selectedTimeSlot || { startTime: '14:00', endTime: '16:00' }
    };
    
    setBookingData(finalBooking);
    setIsCompleted(true);
  }, [bookingData]);

  // Step-specific handlers
  const updateBookingData = useCallback((updates: any) => {
    setBookingData((prev: any) => ({ ...prev, ...updates }));
  }, []);

  if (isCompleted) {
    return (
      <BookingConfirmation
        booking={bookingData}
        onDownloadPDF={async () => {
          // Implement PDF download
          console.log('Downloading PDF...');
        }}
        onDownloadICS={async () => {
          // Implement ICS download
          console.log('Downloading ICS...');
        }}
        onDownloadQR={async () => {
          // Implement QR download
          console.log('Downloading QR...');
        }}
        onEmailConfirmation={async () => {
          // Resend email confirmation
          console.log('Resending email...');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <BookingWizard
        steps={steps.map(step => ({
          ...step,
          component: (props: any) => {
            const Component = step.component;
            
            switch (step.id) {
              case 'selection':
                return (
                  <Component
                    {...props}
                    selectedResource={bookingData.selectedResource}
                    selectedDate={bookingData.selectedDate}
                    selectedTimeSlot={bookingData.selectedTimeSlot}
                    availableTimeSlots={availableTimeSlots}
                    guestCount={bookingData.guestCount}
                    onDateChange={(date: Date) => updateBookingData({ selectedDate: date })}
                    onTimeSlotChange={(timeSlot: any) => updateBookingData({ selectedTimeSlot: timeSlot })}
                    onGuestCountChange={(count: number) => updateBookingData({ guestCount: count })}
                  />
                );
              case 'details':
                return (
                  <Component
                    {...props}
                    guests={bookingData.guests}
                    primaryContact={bookingData.primaryContact}
                    specialRequirements={bookingData.specialRequirements}
                    onGuestsChange={(guests: any[]) => updateBookingData({ guests })}
                    onPrimaryContactChange={(contact: any) => updateBookingData({ primaryContact: contact })}
                    onSpecialRequirementsChange={(requirements: string) => updateBookingData({ specialRequirements: requirements })}
                  />
                );
              case 'payment':
                return (
                  <Component
                    {...props}
                    pricing={bookingData.pricing}
                    selectedPaymentMethod={bookingData.selectedPaymentMethod}
                    savedPaymentMethods={savedPaymentMethods}
                    onPaymentMethodChange={(method: string) => updateBookingData({ selectedPaymentMethod: method })}
                  />
                );
              case 'confirmation':
                return (
                  <Component
                    {...props}
                    bookingData={bookingData}
                  />
                );
              default:
                return <div>Unknown step</div>;
            }
          }
        }))}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onComplete={handleComplete}
        autoSave={true}
        showProgress={true}
      />
    </div>
  );
}