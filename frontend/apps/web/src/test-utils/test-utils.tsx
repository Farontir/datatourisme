import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { runAccessibilityAudit, AccessibilityResult } from '../utils/accessibility';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Accessibility testing utilities
export const renderWithA11y = async (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const result = customRender(ui, options);
  
  // Run accessibility audit
  const a11yResults = await runAccessibilityAudit(result.container);
  
  return {
    ...result,
    a11yResults,
  };
};

export const expectNoA11yViolations = (results: AccessibilityResult) => {
  if (results.violations.length > 0) {
    const violationMessages = results.violations.map(
      violation => `${violation.id}: ${violation.description}`
    );
    throw new Error(
      `Accessibility violations found:\n${violationMessages.join('\n')}`
    );
  }
};

// Mock data generators
export const createMockResource = (overrides = {}) => ({
  id: '1',
  name: 'Test Resource',
  description: 'Test description',
  location: {
    name: 'Test Location',
    latitude: 45.7640,
    longitude: 4.8357,
  },
  category: {
    id: 'test-category',
    name: 'Test Category',
  },
  rating: 4.2,
  reviewCount: 100,
  priceRange: 'MEDIUM',
  images: [{
    id: 'img-1',
    url: '/test-image.jpg',
    alt: 'Test image',
    width: 400,
    height: 300,
  }],
  accessibility: {
    wheelchairAccessible: true,
  },
  ...overrides,
});

export const createMockSearchResults = (count = 5) => ({
  results: Array.from({ length: count }, (_, i) => 
    createMockResource({ id: (i + 1).toString(), name: `Test Resource ${i + 1}` })
  ),
  count: count,
  next: count > 10 ? '/api/search?page=2' : null,
  previous: null,
});

// Custom matchers for better test readability
export const customMatchers = {
  toBeAccessible: (received: AccessibilityResult) => {
    const pass = received.violations.length === 0;
    
    if (pass) {
      return {
        message: () => 'Expected accessibility violations but found none',
        pass: true,
      };
    } else {
      return {
        message: () => {
          const violationMessages = received.violations.map(
            violation => `  - ${violation.id}: ${violation.description}`
          );
          return `Expected no accessibility violations but found:\n${violationMessages.join('\n')}`;
        },
        pass: false,
      };
    }
  },
};

// User event utilities for common interactions
export const userActions = {
  async searchFor(user: any, searchInput: HTMLElement, query: string) {
    await user.clear(searchInput);
    await user.type(searchInput, query);
    await user.keyboard('{Enter}');
  },

  async selectFilter(user: any, filterSelect: HTMLElement, value: string) {
    await user.click(filterSelect);
    await user.selectOptions(filterSelect, value);
  },

  async toggleFavorite(user: any, favoriteButton: HTMLElement) {
    await user.click(favoriteButton);
  },
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent } from '@testing-library/user-event';