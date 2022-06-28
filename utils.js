module.exports = {
    camelCase: (str) => {
        return str
            .replace(/_/g, '-')
            .split('-')
            .map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
            .join('');
    },
};
