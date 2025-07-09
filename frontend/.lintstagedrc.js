module.exports = {
  '**/*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'bash -c tsc --noEmit',
  ],
  '**/*.{json,css,md}': ['prettier --write'],
};