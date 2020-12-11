module.exports = {
    'env': {
        'node': true,
        'es2021': true
    },
    'extends': ['eslint:recommended', 'plugin:jest/recommended'],
    'parserOptions': {
        'ecmaVersion': 12,
        'sourceType': 'module'
    },
    'plugins': ['jest'],
    'rules': {
        'indent': [
            'error',
            4,
            { 'SwitchCase': 1 }
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
    }
};
