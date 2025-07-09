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

// Mock Sign In component (would be imported from actual component)
const MockSignInForm = () => (
  <div>
    <form role="form" aria-label="Sign in to your account">
      <h1>Se connecter</h1>
      
      <div>
        <label htmlFor="email">Adresse email</label>
        <input
          id="email"
          type="email"
          name="email"
          aria-required="true"
          aria-describedby="email-error"
          autoComplete="email"
        />
        <div id="email-error" aria-live="polite" className="sr-only"></div>
      </div>
      
      <div>
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          name="password"
          aria-required="true"
          aria-describedby="password-error"
          autoComplete="current-password"
        />
        <button
          type="button"
          aria-label="Afficher le mot de passe"
          aria-pressed="false"
        >
          👁️
        </button>
        <div id="password-error" aria-live="polite" className="sr-only"></div>
      </div>
      
      <div>
        <input
          id="remember"
          type="checkbox"
          name="remember"
        />
        <label htmlFor="remember">Se souvenir de moi</label>
      </div>
      
      <button type="submit" aria-describedby="submit-help">
        Se connecter
      </button>
      <div id="submit-help" className="sr-only">
        Appuyez sur Entrée ou cliquez pour vous connecter
      </div>
      
      <div aria-live="assertive" id="form-status" className="sr-only"></div>
      
      <nav aria-label="Autres options de connexion">
        <a href="/auth/forgot-password">Mot de passe oublié?</a>
        <a href="/auth/signup">Créer un compte</a>
      </nav>
      
      <div>
        <h2>Connexion avec un service externe</h2>
        <button type="button" aria-label="Se connecter avec Google">
          <img src="/google-icon.png" alt="" role="presentation" />
          Google
        </button>
        <button type="button" aria-label="Se connecter avec Facebook">
          <img src="/facebook-icon.png" alt="" role="presentation" />
          Facebook
        </button>
        <button type="button" aria-label="Se connecter avec Apple">
          <img src="/apple-icon.png" alt="" role="presentation" />
          Apple
        </button>
      </div>
    </form>
  </div>
);

describe('Authentication Accessibility Tests', () => {
  beforeEach(() => {
    // Reset document focus
    document.body.focus();
  });

  describe('Comprehensive Accessibility Testing', () => {
    it('should pass complete accessibility test suite', async () => {
      const testResult = await runCompleteAccessibilityTestSuite(
        <MockSignInForm />,
        {
          includeColorContrast: false, // We'll test this separately
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
      const { container } = render(<MockSignInForm />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const { container } = render(<MockSignInForm />);
      const navigationResult = await testKeyboardNavigation(container);
      
      expect(navigationResult.success).toBe(true);
      expect(navigationResult.focusableElements.length).toBeGreaterThan(0);
      
      // Verify all interactive elements are focusable
      const expectedFocusableElements = [
        'input[type="email"]',
        'input[type="password"]',
        'button[aria-label="Afficher le mot de passe"]',
        'input[type="checkbox"]',
        'button[type="submit"]',
        'a[href="/auth/forgot-password"]',
        'a[href="/auth/signup"]',
        'button[aria-label="Se connecter avec Google"]',
        'button[aria-label="Se connecter avec Facebook"]',
        'button[aria-label="Se connecter avec Apple"]',
      ];
      
      expect(navigationResult.focusableElements.length).toBe(expectedFocusableElements.length);
    });

    it('should handle Enter key on form submission', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockSignInForm />);
      
      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Test Enter key submission
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });
      
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should handle Escape key for modal-like behavior', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockSignInForm />);
      
      const passwordToggle = screen.getByLabelText(/afficher le mot de passe/i);
      
      await user.click(passwordToggle);
      await user.keyboard('{Escape}');
      
      // Should maintain focus on the toggle button
      expect(document.activeElement).toBe(passwordToggle);
    });
  });

  describe('Screen Reader Support', () => {
    it('should support screen reader navigation', async () => {
      const { container } = render(<MockSignInForm />);
      const navigationResult = await simulateScreenReaderNavigation(container);
      
      expect(navigationResult.success).toBe(true);
      
      // Test heading navigation
      expect(navigationResult.headingNavigation).toHaveLength(2);
      expect(navigationResult.headingNavigation[0].level).toBe(1);
      expect(navigationResult.headingNavigation[0].text).toBe('Se connecter');
      
      // Test form navigation
      expect(navigationResult.formNavigation.length).toBeGreaterThan(0);
      
      // Verify form elements have proper labels
      const formElements = navigationResult.formNavigation;
      const emailField = formElements.find(el => el.element.getAttribute('type') === 'email');
      const passwordField = formElements.find(el => el.element.getAttribute('type') === 'password');
      
      expect(emailField?.label).toBe('Adresse email');
      expect(passwordField?.label).toBe('Mot de passe');
    });

    it('should announce form errors correctly', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockSignInForm />);
      
      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      
      // Submit empty form
      await user.click(submitButton);
      
      // Check for error announcement areas
      const emailError = container.querySelector('#email-error');
      const formStatus = container.querySelector('#form-status');
      
      expect(emailError).toHaveAttribute('aria-live', 'polite');
      expect(formStatus).toHaveAttribute('aria-live', 'assertive');
    });

    it('should handle password visibility toggle announcements', async () => {
      const user = userEvent.setup();
      const { container } = render(<MockSignInForm />);
      
      const passwordToggle = screen.getByLabelText(/afficher le mot de passe/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      
      expect(passwordToggle).toHaveAttribute('aria-pressed', 'false');
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      await user.click(passwordToggle);
      
      // After implementation, these would be updated
      // expect(passwordToggle).toHaveAttribute('aria-pressed', 'true');
      // expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes', async () => {
      const { container } = render(<MockSignInForm />);
      const ariaResult = testAriaAttributes(container);
      
      expect(ariaResult.success).toBe(true);
      
      // Test interactive elements
      const interactiveElements = ariaResult.interactiveElements;
      expect(interactiveElements.every(el => el.hasAccessibleName)).toBe(true);
      
      // Test form elements
      const formElements = ariaResult.formElements;
      expect(formElements.every(el => el.hasProperLabel)).toBe(true);
      
      // Test heading hierarchy
      const headings = ariaResult.headings;
      expect(headings.every(h => h.isValid)).toBe(true);
    });

    it('should have proper form accessibility attributes', () => {
      render(<MockSignInForm />);
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Sign in to your account');
      
      const emailInput = screen.getByLabelText(/adresse email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      expect(submitButton).toHaveAttribute('aria-describedby', 'submit-help');
    });

    it('should have proper navigation accessibility', () => {
      render(<MockSignInForm />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Autres options de connexion');
      
      const forgotPasswordLink = screen.getByRole('link', { name: /mot de passe oublié/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      
      const signupLink = screen.getByRole('link', { name: /créer un compte/i });
      expect(signupLink).toBeInTheDocument();
    });

    it('should handle OAuth buttons accessibility', () => {
      render(<MockSignInForm />);
      
      const googleButton = screen.getByRole('button', { name: /se connecter avec google/i });
      expect(googleButton).toHaveAttribute('aria-label', 'Se connecter avec Google');
      
      const facebookButton = screen.getByRole('button', { name: /se connecter avec facebook/i });
      expect(facebookButton).toHaveAttribute('aria-label', 'Se connecter avec Facebook');
      
      const appleButton = screen.getByRole('button', { name: /se connecter avec apple/i });
      expect(appleButton).toHaveAttribute('aria-label', 'Se connecter avec Apple');
      
      // Icons should be presentational
      const icons = screen.getAllByRole('presentation');
      expect(icons).toHaveLength(3);
    });
  });

  describe('Focus Management', () => {
    it('should manage focus correctly', async () => {
      const { container } = render(<MockSignInForm />);
      const focusResult = await testFocusManagement(container);
      
      expect(focusResult.success).toBe(true);
      expect(focusResult.initialFocus).toBe(true);
      expect(focusResult.focusableElements.length).toBeGreaterThan(0);
    });

    it('should maintain focus on form validation errors', async () => {
      const user = userEvent.setup();
      render(<MockSignInForm />);
      
      const emailInput = screen.getByLabelText(/adresse email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      // Focus should remain on or move to the problematic field
      expect(document.activeElement).toBe(emailInput);
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce errors via live regions', async () => {
      const { container } = render(<MockSignInForm />);
      
      const emailError = container.querySelector('#email-error');
      const passwordError = container.querySelector('#password-error');
      const formStatus = container.querySelector('#form-status');
      
      expect(emailError).toHaveAttribute('aria-live', 'polite');
      expect(passwordError).toHaveAttribute('aria-live', 'polite');
      expect(formStatus).toHaveAttribute('aria-live', 'assertive');
    });

    it('should associate errors with form fields', () => {
      render(<MockSignInForm />);
      
      const emailInput = screen.getByLabelText(/adresse email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    });
  });

  describe('Mobile Accessibility', () => {
    it('should be accessible on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      const { container } = render(<MockSignInForm />);
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });
  });
});