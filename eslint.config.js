const js = require('@eslint/js');
const cypress = require('eslint-plugin-cypress');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', 'dragster.min.js', 'dragster.min.js.gz', 'template.es6.js'] },
    js.configs.recommended,
    cypress.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            eqeqeq: ['error', 'always'],
            'no-cond-assign': ['error', 'always'],
            'no-console': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'cypress/no-assigning-return-values': 'off',
            'cypress/no-async-tests': 'off',
        },
    },
    prettierRecommended,
];
