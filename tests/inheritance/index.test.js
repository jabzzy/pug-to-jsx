const { resolve } = require('path');
const { readFile } = require('fs/promises');
const { convert } = require('../../index');

describe('inheritance / https://pugjs.org/language/inheritance.html', () => {
    test.each([
        ['base'],
        ['sub'],
    ])('%s', async (path) => {
        path = resolve(__dirname, path);

        const actual = convert([`${path}.pug`])[`${path}.pug`];
        const expected = await readFile(`${path}.jsx`, { encoding: 'utf-8' });

        expect(actual).toBe(expected.replace(/\n$/, ''));
    });
});
