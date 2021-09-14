const { resolve } = require('path');
const { readFile } = require('fs/promises');
const { convert } = require('../../index');

describe('misc / doctype,TBD', () => {
    test.each([
        ['doctype'],
    ])('%s', async (path) => {
        path = resolve(__dirname, path);

        const actual = convert([`${path}.pug`])[`${path}.pug`];
        const expected = await readFile(`${path}.jsx`, { encoding: 'utf-8' });

        expect(actual).toBe(expected.replace(/\n$/, ''));
    });

    test('filters', () => {
        const path = resolve(__dirname, 'filters');
        expect(() => {
            convert([`${path}.pug`]);
        }).toThrow('Unsupported pug node type: Filter');
    });
});
