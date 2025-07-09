import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { 
  runCompleteAccessibilityTestSuite,
  testKeyboardNavigation,
  testAriaAttributes,
  simulateScreenReaderNavigation,
  testFocusManagement 
} from '../accessibility-helpers';

// Mock Booking Flow components
const MockBookingStepIndicator = ({ currentStep = 1, totalSteps = 4 }) => (
  <nav aria-label="Étapes de réservation" role="navigation">
    <ol>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <li key={step}>
          <div
            aria-current={currentStep === step ? 'step' : undefined}
            aria-label={`Étape ${step}${currentStep === step ? ' (actuelle)' : ''}`}
            className={currentStep === step ? 'current' : currentStep > step ? 'completed' : 'pending'}
          >
            {step}
          </div>
        </li>
      ))}
    </ol>
  </nav>
);

const MockDateTimePicker = () => (
  <div>
    <fieldset>
      <legend>Sélection de date et heure</legend>
      
      <div>
        <label htmlFor="date-picker">Date de visite</label>
        <input
          id="date-picker"
          type="date"
          aria-required="true"
          aria-describedby="date-help"
          min={new Date().toISOString().split('T')[0]}
        />
        <div id="date-help" className="help-text">
          Sélectionnez une date de visite
        </div>
      </div>
      
      <div>
        <fieldset>
          <legend>Créneaux horaires disponibles</legend>
          <div role="radiogroup" aria-labelledby="time-slots-legend">
            <div id="time-slots-legend" className="sr-only">
              Choisissez un créneau horaire
            </div>
            
            <div>
              <input
                type="radio"
                id="time-10"
                name="time"
                value="10:00"
                aria-describedby="time-10-info"
              />
              <label htmlFor="time-10">10:00</label>
              <div id="time-10-info" className="sr-only">
                15 places disponibles
              </div>
            </div>
            
            <div>
              <input
                type="radio"
                id="time-14"
                name="time"
                value="14:00"
                aria-describedby="time-14-info"
              />
              <label htmlFor="time-14">14:00</label>
              <div id="time-14-info" className="sr-only">
                8 places disponibles
              </div>
            </div>
            
            <div>
              <input
                type="radio"
                id="time-16"
                name="time"
                value="16:00"
                aria-describedby="time-16-info"
                disabled
              />
              <label htmlFor="time-16">16:00</label>
              <div id="time-16-info" className="sr-only">
                Complet
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </fieldset>
  </div>
);

const MockGuestDetailsForm = () => (
  <form>
    <h2>Détails des invités</h2>
    
    <div>
      <label htmlFor="adults">Nombre d'adultes</label>
      <select
        id="adults"
        name="adults"
        aria-required="true"
        aria-describedby="adults-help"
      >
        <option value="">Sélectionnez</option>
        <option value="1">1 adulte</option>
        <option value="2">2 adultes</option>
        <option value="3">3 adultes</option>
        <option value="4">4 adultes</option>
      </select>
      <div id="adults-help" className="help-text">
        Nombre d'adultes (18 ans et plus)
      </div>
    </div>
    
    <div>
      <label htmlFor="children">Nombre d'enfants</label>
      <select
        id="children"
        name="children"
        aria-describedby="children-help"
      >
        <option value="0">Aucun enfant</option>
        <option value="1">1 enfant</option>
        <option value="2">2 enfants</option>
        <option value="3">3 enfants</option>
      </select>
      <div id="children-help" className="help-text">
        Nombre d'enfants (moins de 18 ans)
      </div>
    </div>
    
    <fieldset>
      <legend>Informations du responsable</legend>
      
      <div>
        <label htmlFor="first-name">Prénom</label>
        <input
          id="first-name"
          type="text"
          name="firstName"
          aria-required="true"
          aria-describedby="first-name-error"
          autoComplete="given-name"
        />
        <div id="first-name-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="last-name">Nom</label>
        <input
          id="last-name"
          type="text"
          name="lastName"
          aria-required="true"
          aria-describedby="last-name-error"
          autoComplete="family-name"
        />
        <div id="last-name-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          aria-required="true"
          aria-describedby="email-error email-help"
          autoComplete="email"
        />
        <div id="email-help" className="help-text">
          Nous vous enverrons la confirmation à cette adresse
        </div>
        <div id="email-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="phone">Téléphone</label>
        <input
          id="phone"
          type="tel"
          name="phone"
          aria-describedby="phone-help"
          autoComplete="tel"
        />
        <div id="phone-help" className="help-text">
          Numéro de téléphone (optionnel)
        </div>
      </div>
    </fieldset>
    
    <div>
      <button type="button" aria-describedby="save-help">
        Sauvegarder et continuer
      </button>
      <div id="save-help" className="sr-only">
        Sauvegarder les informations et passer à l'étape suivante
      </div>
    </div>
  </form>
);

const MockPaymentForm = () => (
  <form>
    <h2>Paiement</h2>
    
    <div aria-live="polite" id="payment-status" className="sr-only"></div>
    
    <div>
      <h3>Récapitulatif de la commande</h3>
      <table role="table" aria-label="Récapitulatif de la commande">
        <caption className="sr-only">Détails de votre réservation</caption>
        <thead>
          <tr>
            <th scope="col">Article</th>
            <th scope="col">Quantité</th>
            <th scope="col">Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Visite adulte</td>
            <td>2</td>
            <td>20,00 €</td>
          </tr>
          <tr>
            <td>Visite enfant</td>
            <td>1</td>
            <td>10,00 €</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td></td>
            <td><strong>30,00 €</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <fieldset>
      <legend>Informations de paiement</legend>
      
      <div>
        <label htmlFor="card-name">Nom sur la carte</label>
        <input
          id="card-name"
          type="text"
          name="cardName"
          aria-required="true"
          aria-describedby="card-name-error"
          autoComplete="cc-name"
        />
        <div id="card-name-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="card-number">Numéro de carte</label>
        <input
          id="card-number"
          type="text"
          name="cardNumber"
          aria-required="true"
          aria-describedby="card-number-error card-number-help"
          autoComplete="cc-number"
          inputMode="numeric"
        />
        <div id="card-number-help" className="help-text">
          16 chiffres sans espaces
        </div>
        <div id="card-number-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="expiry">Date d'expiration</label>
        <input
          id="expiry"
          type="text"
          name="expiry"
          aria-required="true"
          aria-describedby="expiry-error expiry-help"
          autoComplete="cc-exp"
          placeholder="MM/AA"
        />
        <div id="expiry-help" className="help-text">
          Format: MM/AA
        </div>
        <div id="expiry-error" aria-live="polite" className="error sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="cvv">Code de sécurité</label>
        <input
          id="cvv"
          type="text"
          name="cvv"
          aria-required="true"
          aria-describedby="cvv-error cvv-help"
          autoComplete="cc-csc"
          inputMode="numeric"
        />
        <div id="cvv-help" className="help-text">
          3 chiffres au dos de votre carte
        </div>
        <div id="cvv-error" aria-live="polite" className="error sr-only"></div>
      </div>
    </fieldset>
    
    <div>
      <input
        type="checkbox"
        id="terms"
        name="terms"
        aria-required="true"
        aria-describedby="terms-error"
      />
      <label htmlFor="terms">
        J'accepte les <a href="/terms">conditions générales</a>
      </label>
      <div id="terms-error" aria-live="polite" className="error sr-only"></div>
    </div>
    
    <div>
      <button 
        type="submit"
        aria-describedby="payment-help"
        disabled={false}
      >
        Payer maintenant
      </button>
      <div id="payment-help" className="sr-only">
        Finaliser votre réservation et effectuer le paiement
      </div>
    </div>
  </form>
);

const MockCompleteBookingFlow = () => (
  <div>
    <MockBookingStepIndicator currentStep={1} totalSteps={4} />
    <main>
      <h1>Réservation - Château de Versailles</h1>
      <MockDateTimePicker />
      <MockGuestDetailsForm />
      <MockPaymentForm />
    </main>
  </div>
);

describe('Booking Flow Accessibility Tests', () => {
  beforeEach(() => {
    document.body.focus();
  });

  describe('Complete Booking Flow', () => {
    it('should pass comprehensive accessibility tests', async () => {
      const testResult = await runCompleteAccessibilityTestSuite(
        <MockCompleteBookingFlow />,
        {
          includeColorContrast: false,
          timeout: 10000,
        }
      );

      expect(testResult.overall.success).toBe(true);
      expect(testResult.axeResults.violations).toHaveLength(0);
      expect(testResult.keyboardNavigation.success).toBe(true);
      expect(testResult.ariaAttributes.success).toBe(true);
      expect(testResult.screenReaderNavigation.success).toBe(true);
      expect(testResult.focusManagement.success).toBe(true);
    });

    it('should have no axe violations', async () => {
      const { container } = render(<MockCompleteBookingFlow />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Step Indicator Accessibility', () => {
    it('should have accessible step indicator', () => {
      render(<MockBookingStepIndicator currentStep={2} totalSteps={4} />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Étapes de réservation');
      
      const currentStep = screen.getByText('2');
      expect(currentStep).toHaveAttribute('aria-current', 'step');
      expect(currentStep).toHaveAttribute('aria-label', 'Étape 2 (actuelle)');
    });

    it('should support keyboard navigation through steps', async () => {
      const { container } = render(<MockBookingStepIndicator currentStep={1} totalSteps={4} />);
      const navigationResult = await testKeyboardNavigation(container);
      
      expect(navigationResult.success).toBe(true);
    });
  });

  describe('Date/Time Picker Accessibility', () => {
    it('should have accessible date/time picker', () => {
      render(<MockDateTimePicker />);
      
      const fieldset = screen.getByRole('group', { name: /sélection de date et heure/i });
      expect(fieldset).toBeInTheDocument();
      
      const dateInput = screen.getByLabelText(/date de visite/i);
      expect(dateInput).toHaveAttribute('aria-required', 'true');
      expect(dateInput).toHaveAttribute('aria-describedby', 'date-help');
      
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'time-slots-legend');
      
      const timeOptions = screen.getAllByRole('radio');
      expect(timeOptions).toHaveLength(3);
      
      // Check disabled state
      const disabledOption = screen.getByRole('radio', { name: /16:00/i });
      expect(disabledOption).toBeDisabled();
    });

    it('should support screen reader announcements for availability', () => {
      render(<MockDateTimePicker />);
      
      const time10Info = screen.getByText('15 places disponibles');
      expect(time10Info).toHaveClass('sr-only');
      
      const time14Info = screen.getByText('8 places disponibles');
      expect(time14Info).toHaveClass('sr-only');
      
      const time16Info = screen.getByText('Complet');
      expect(time16Info).toHaveClass('sr-only');
    });
  });

  describe('Guest Details Form Accessibility', () => {
    it('should have accessible guest details form', () => {
      render(<MockGuestDetailsForm />);
      
      const adultsSelect = screen.getByLabelText(/nombre d'adultes/i);
      expect(adultsSelect).toHaveAttribute('aria-required', 'true');
      expect(adultsSelect).toHaveAttribute('aria-describedby', 'adults-help');
      
      const childrenSelect = screen.getByLabelText(/nombre d'enfants/i);
      expect(childrenSelect).toHaveAttribute('aria-describedby', 'children-help');
      
      const fieldset = screen.getByRole('group', { name: /informations du responsable/i });
      expect(fieldset).toBeInTheDocument();
      
      // Check required fields
      const firstNameInput = screen.getByLabelText(/prénom/i);
      expect(firstNameInput).toHaveAttribute('aria-required', 'true');
      expect(firstNameInput).toHaveAttribute('autoComplete', 'given-name');
      
      const lastNameInput = screen.getByLabelText(/nom/i);
      expect(lastNameInput).toHaveAttribute('aria-required', 'true');
      expect(lastNameInput).toHaveAttribute('autoComplete', 'family-name');
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error email-help');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      
      const phoneInput = screen.getByLabelText(/téléphone/i);
      expect(phoneInput).toHaveAttribute('autoComplete', 'tel');
      expect(phoneInput).not.toHaveAttribute('aria-required');
    });

    it('should have live error regions', () => {
      render(<MockGuestDetailsForm />);
      
      const firstNameError = screen.getByText('', { selector: '#first-name-error' });
      expect(firstNameError).toHaveAttribute('aria-live', 'polite');
      
      const lastNameError = screen.getByText('', { selector: '#last-name-error' });
      expect(lastNameError).toHaveAttribute('aria-live', 'polite');
      
      const emailError = screen.getByText('', { selector: '#email-error' });
      expect(emailError).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Payment Form Accessibility', () => {
    it('should have accessible payment form', () => {
      render(<MockPaymentForm />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Récapitulatif de la commande');
      
      const caption = screen.getByText('Détails de votre réservation');
      expect(caption).toHaveClass('sr-only');
      
      const fieldset = screen.getByRole('group', { name: /informations de paiement/i });
      expect(fieldset).toBeInTheDocument();
      
      // Check payment fields
      const cardNameInput = screen.getByLabelText(/nom sur la carte/i);
      expect(cardNameInput).toHaveAttribute('aria-required', 'true');
      expect(cardNameInput).toHaveAttribute('autoComplete', 'cc-name');
      
      const cardNumberInput = screen.getByLabelText(/numéro de carte/i);
      expect(cardNumberInput).toHaveAttribute('aria-required', 'true');
      expect(cardNumberInput).toHaveAttribute('autoComplete', 'cc-number');
      expect(cardNumberInput).toHaveAttribute('inputMode', 'numeric');
      
      const expiryInput = screen.getByLabelText(/date d'expiration/i);
      expect(expiryInput).toHaveAttribute('aria-required', 'true');
      expect(expiryInput).toHaveAttribute('autoComplete', 'cc-exp');
      
      const cvvInput = screen.getByLabelText(/code de sécurité/i);
      expect(cvvInput).toHaveAttribute('aria-required', 'true');
      expect(cvvInput).toHaveAttribute('autoComplete', 'cc-csc');
      expect(cvvInput).toHaveAttribute('inputMode', 'numeric');
      
      const termsCheckbox = screen.getByLabelText(/j'accepte les conditions générales/i);
      expect(termsCheckbox).toHaveAttribute('aria-required', 'true');
      
      const submitButton = screen.getByRole('button', { name: /payer maintenant/i });
      expect(submitButton).toHaveAttribute('aria-describedby', 'payment-help');
    });

    it('should have payment status live region', () => {
      render(<MockPaymentForm />);
      
      const paymentStatus = screen.getByText('', { selector: '#payment-status' });
      expect(paymentStatus).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support complete keyboard navigation', async () => {
      const { container } = render(<MockCompleteBookingFlow />);
      const navigationResult = await testKeyboardNavigation(container);
      
      expect(navigationResult.success).toBe(true);
      expect(navigationResult.focusableElements.length).toBeGreaterThan(0);
    });

    it('should handle form submission with Enter key', async () => {
      const user = userEvent.setup();
      render(<MockGuestDetailsForm />);
      
      const firstNameInput = screen.getByLabelText(/prénom/i);
      await user.type(firstNameInput, 'Jean');
      
      const lastNameInput = screen.getByLabelText(/nom/i);
      await user.type(lastNameInput, 'Dupont');
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'jean.dupont@example.com');
      
      // Test Enter key navigation
      await user.keyboard('{Enter}');
      
      const button = screen.getByRole('button', { name: /sauvegarder et continuer/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Screen Reader Navigation', () => {
    it('should support screen reader navigation', async () => {
      const { container } = render(<MockCompleteBookingFlow />);
      const navigationResult = await simulateScreenReaderNavigation(container);
      
      expect(navigationResult.success).toBe(true);
      
      // Check heading structure
      const headings = navigationResult.headingNavigation;
      expect(headings).toHaveLength(4); // h1, h2, h2, h3
      expect(headings[0].level).toBe(1);
      expect(headings[0].text).toBe('Réservation - Château de Versailles');
      
      // Check landmark navigation
      const landmarks = navigationResult.landmarkNavigation;
      expect(landmarks.length).toBeGreaterThan(0);
      
      // Check form navigation
      const formElements = navigationResult.formNavigation;
      expect(formElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle form validation errors accessibly', async () => {
      const user = userEvent.setup();
      render(<MockGuestDetailsForm />);
      
      const button = screen.getByRole('button', { name: /sauvegarder et continuer/i });
      await user.click(button);
      
      // Check error regions are present
      const firstNameError = screen.getByText('', { selector: '#first-name-error' });
      expect(firstNameError).toHaveAttribute('aria-live', 'polite');
      
      const lastNameError = screen.getByText('', { selector: '#last-name-error' });
      expect(lastNameError).toHaveAttribute('aria-live', 'polite');
      
      const emailError = screen.getByText('', { selector: '#email-error' });
      expect(emailError).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus correctly in forms', async () => {
      const { container } = render(<MockGuestDetailsForm />);
      const focusResult = await testFocusManagement(container);
      
      expect(focusResult.success).toBe(true);
      expect(focusResult.focusableElements.length).toBeGreaterThan(0);
    });
  });
});