const { designTokens } = require('@datatourisme/config');

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: designTokens.colors,
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      fontSize: designTokens.fontSize,
      fontWeight: designTokens.fontWeight,
      fontFamily: designTokens.fontFamily,
      boxShadow: designTokens.boxShadow,
      animation: designTokens.animation,
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        ping: {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        pulse: {
          '50%': {
            opacity: '.5',
          },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8,0,1,1)',
          },
          '50%': {
            transform: 'none',
            animationTimingFunction: 'cubic-bezier(0,0,0.2,1)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    function({ addBase, theme }) {
      const variables = {};
      
      // Generate CSS variables from design tokens
      const generateVars = (obj, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const cssVar = prefix ? `${prefix}-${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            generateVars(value, cssVar);
          } else {
            variables[`--${cssVar}`] = String(value);
          }
        });
      };
      
      generateVars(designTokens);
      
      addBase({
        ':root': variables,
        '[data-theme="dark"]': {
          '--primary-50': theme('colors.primary.950'),
          '--primary-100': theme('colors.primary.900'),
          '--primary-200': theme('colors.primary.800'),
          '--primary-300': theme('colors.primary.700'),
          '--primary-400': theme('colors.primary.600'),
          '--primary-500': theme('colors.primary.500'),
          '--primary-600': theme('colors.primary.400'),
          '--primary-700': theme('colors.primary.300'),
          '--primary-800': theme('colors.primary.200'),
          '--primary-900': theme('colors.primary.100'),
          '--primary-950': theme('colors.primary.50'),
          '--neutral-50': theme('colors.neutral.950'),
          '--neutral-100': theme('colors.neutral.900'),
          '--neutral-200': theme('colors.neutral.800'),
          '--neutral-300': theme('colors.neutral.700'),
          '--neutral-400': theme('colors.neutral.600'),
          '--neutral-500': theme('colors.neutral.500'),
          '--neutral-600': theme('colors.neutral.400'),
          '--neutral-700': theme('colors.neutral.300'),
          '--neutral-800': theme('colors.neutral.200'),
          '--neutral-900': theme('colors.neutral.100'),
          '--neutral-950': theme('colors.neutral.50'),
        },
      });
    },
  ],
};