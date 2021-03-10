const { resolve } = require('path');
const { readFile } = require('fs/promises');
const { convert } = require('../../index');

describe('case / https://pugjs.org/language/case.html', () => {
    test.each([
        // FIXME: we don't care about unbuffered `for` statements for now, but we probably should
        // ['unbuffered-1'],
        ['unbuffered-2'],
        ['buffered'],
    ])('%s', async (path) => {
        path = resolve(__dirname, path);

        const actual = convert([`${path}.pug`])[`${path}.pug`];
        const expected = await readFile(`${path}.jsx`, { encoding: 'utf-8' });

        expect(actual).toBe(expected.replace(/\n$/, ''));
    });
});
