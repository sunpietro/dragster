module.exports = {
  extends: 'eslint:recommended',
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  rules: {
    eqeqeq: ['error', 'always'],
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'always'],
    'no-cond-assign': ['error', 'always'],
    'no-console': 'off',
    'brace-style': 'error',
  },
};
