const { resolve } = require('path');
const { readFile } = require('fs/promises');
const { convert } = require('../../index');

describe('attributes / https://pugjs.org/language/attributes.html', () => {
    test.each([
        ['./attributes'],
        ['./attributes-expr'],
        ['./template-strings-attributes'],
        // ['./quoted-attributes'], // FIXME: https://pugjs.org/language/attributes.html#quoted-attributes never used this stuff
        ['./attribute-interpolation-1'],
        ['./attribute-interpolation-2'],
        ['./boolean-attributes-1'],
        ['./boolean-attributes-2'],
    ])('%s', async (path) => {
        path = resolve(__dirname, path);

        const actual = convert([`${path}.pug`])[`${path}.pug`];
        const expected = await readFile(`${path}.jsx`, { encoding: 'utf-8' });

        expect(actual).toBe(expected.replace(/\n$/, ''));
    });
});
