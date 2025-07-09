import type { Preview } from '@storybook/react';
import '../../../tooling/tailwind-config/base.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    
    // Layout configuration
    layout: 'centered',
    
    // Viewport configuration for responsive testing
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
        wide: {
          name: 'Wide',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
      defaultViewport: 'desktop',
    },
    
    // Background configuration
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'gray',
          value: '#f5f5f5',
        },
        {
          name: 'blue',
          value: '#0570de',
        },
      ],
    },
    
    // Accessibility configuration
    a11y: {
      element: '#root',
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
      options: {
        checks: { 'color-contrast': { options: { noScroll: true } } },
        restoreScroll: true,
      },
    },
    
    // Chromatic configuration
    chromatic: {
      // Pause animations at end for consistent snapshots
      pauseAnimationsAtEnd: true,
      
      // Disable animations for visual testing
      disableAnimations: true,
      
      // Set delay before taking screenshot
      delay: 300,
      
      // Configure viewports for visual testing
      viewports: [375, 768, 1440, 1920],
      
      // Diff threshold for visual changes
      diffThreshold: 0.05,
      
      // Threshold for considering a change significant
      threshold: 0.2,
      
      // Force color scheme for consistency
      forcedColors: 'none',
      
      // Enable interaction testing
      interactionTests: true,
      
      // Enable accessibility testing
      a11y: true,
      
      // Modes for testing different states
      modes: {
        mobile: {
          viewport: { width: 375, height: 667 },
          chromatic: { viewports: [375] },
        },
        tablet: {
          viewport: { width: 768, height: 1024 },
          chromatic: { viewports: [768] },
        },
        desktop: {
          viewport: { width: 1440, height: 900 },
          chromatic: { viewports: [1440] },
        },
        wide: {
          viewport: { width: 1920, height: 1080 },
          chromatic: { viewports: [1920] },
        },
        dark: {
          backgrounds: { default: 'dark' },
          chromatic: { modes: { dark: true } },
        },
      },
    },
    
    // Docs configuration
    docs: {
      toc: true,
      autodocs: 'tag',
      story: {
        inline: true,
        height: '400px',
      },
    },
    
    // Options configuration
    options: {
      storySort: {
        order: [
          'Introduction',
          'Design System',
          ['Colors', 'Typography', 'Spacing', 'Breakpoints'],
          'Components',
          ['Basic', 'Forms', 'Navigation', 'Layout', 'Feedback'],
          'Features',
          'Examples',
        ],
      },
    },
  },
  
  // Global decorators
  decorators: [
    (Story) => (
      <div 
        style={{ 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          lineHeight: '1.6',
        }}
        data-chromatic="ready"
      >
        <Story />
      </div>
    ),
  ],
  
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;