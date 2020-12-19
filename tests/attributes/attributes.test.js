const { resolve } = require('path');
const { readFile } = require('fs/promises');
const { convert } = require('../../index');

describe('attributes / https://pugjs.org/language/attributes.html', () => {
    test.each([
        // ['./attributes'],
        ['./attributes-expr'],
    ])('%s', async (path) => {
        path = resolve(__dirname, path);

        const actual = convert([`${path}.pug`])[`${path}.pug`];
        const expected = await readFile(`${path}.jsx`, { encoding: 'utf-8' });

        expect(actual).toStrictEqual(expect.stringMatching(expected.replace(/\n$/, '')));
    });
});
