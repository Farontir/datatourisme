import '@testing-library/jest-dom';

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
global.Date = class extends Date {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(mockDate);
    } else {
      super(...args);
    }
  }
  
  static now() {
    return mockDate.getTime();
  }
} as any;

// Mock payment processing
global.stripe = {
  elements: jest.fn(),
  confirmPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
};

// Mock WebSocket for real-time updates
global.WebSocket = class WebSocket {
  constructor(url: string) {}
  send = jest.fn();
  close = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
} as any;