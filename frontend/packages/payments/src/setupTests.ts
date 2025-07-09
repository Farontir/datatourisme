import '@testing-library/jest-dom';

// Mock Stripe
global.Stripe = jest.fn(() => ({
  elements: jest.fn(() => ({
    create: jest.fn(() => ({
      mount: jest.fn(),
      unmount: jest.fn(),
      on: jest.fn(),
      update: jest.fn(),
    })),
    getElement: jest.fn(),
  })),
  confirmPayment: jest.fn(),
  confirmSetup: jest.fn(),
  retrievePaymentIntent: jest.fn(),
  retrieveSetupIntent: jest.fn(),
  createPaymentMethod: jest.fn(),
  createToken: jest.fn(),
}));

// Mock Stripe Elements
global.StripeElements = jest.fn();

// Mock fetch for payment API calls
global.fetch = jest.fn();

beforeEach(() => {
  (fetch as jest.Mock).mockClear();
  jest.clearAllMocks();
});

// Mock payment processing responses
export const mockPaymentIntent = {
  id: 'pi_test_1234567890',
  status: 'succeeded',
  amount: 2000,
  currency: 'eur',
  client_secret: 'pi_test_1234567890_secret_test',
};

export const mockPaymentMethod = {
  id: 'pm_test_1234567890',
  type: 'card',
  card: {
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2025,
  },
};