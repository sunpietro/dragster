import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            'dist/',
            'coverage/',
            'playwright-report/',
            'test-results/',
            // Legacy 2.x files — deleted in PR 9
            'dragster-script.js',
            'dragster.js',
            'dragster.min.js',
            'dragster.min.js.gz',
            'dragster-comment.js',
            'template.es6.js',
            'module-generator.js',
            'cypress.config.js',
            'cypress/',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ['**/*.config.{js,ts,mjs}', 'scripts/**/*.{js,mjs}'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        rules: {
            eqeqeq: ['error', 'always'],
            'no-cond-assign': ['error', 'always'],
            'no-console': 'off',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    prettierRecommended,
);
