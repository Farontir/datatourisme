import '@testing-library/jest-dom';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options && typeof options === 'object') {
        let result = key;
        Object.keys(options).forEach(optionKey => {
          result = result.replace(`{{${optionKey}}}`, options[optionKey]);
        });
        return result;
      }
      return key;
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'fr',
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock Intl API
Object.defineProperty(global, 'Intl', {
  value: {
    NumberFormat: jest.fn(() => ({
      format: jest.fn((num) => num.toString()),
    })),
    DateTimeFormat: jest.fn(() => ({
      format: jest.fn((date) => date.toISOString()),
    })),
    RelativeTimeFormat: jest.fn(() => ({
      format: jest.fn((value, unit) => `${value} ${unit}`),
    })),
  },
});