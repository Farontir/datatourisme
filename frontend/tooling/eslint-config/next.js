module.exports = {
  extends: [
    './react.js',
    'plugin:@next/next/recommended',
    'plugin:@next/next/core-web-vitals',
  ],
  plugins: ['@next/next'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};