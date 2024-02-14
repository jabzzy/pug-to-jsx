module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'plugin:jest/recommended', 'prettier'],
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: ['jest', 'prettier'],
    rules: {
        'prettier/prettier': [
            'error',
            {
                tagWidth: 4,
                singleQuote: true,
                printWidth: 120,
            },
        ],
        'linebreak-style': ['error', 'unix'],
    },
    overrides: [
        {
            files: ['*.jsx'],
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
    ],
};
