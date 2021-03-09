const { resolve } = require('path');
const { convert } = require('../../index');

test('basic.pug', () => {
    const path = resolve(__dirname, 'basic.pug');
    const actual = convert([path]);

    expect(actual[path]).toBe(
        'const basic = (arg1, arg2) => {\n  <div className={\'basic\'}>Text node</div>;\n};'
    );
});

test('extended.pug', () => {
    const path = resolve(__dirname, 'extended.pug');
    const actual = convert([path]);

    expect(actual[path]).toBe(
        'const extended = (arg1, arg2) => {\n  <div className={\'extended\'}>Text node</div>;\n  <div className={\'extended\'}>{arg1.argProp}</div>;\n};'
    );
});

// FIXME:
// eslint-disable-next-line jest/no-disabled-tests
test.skip('header.pug', () => {
    const path = resolve(__dirname, 'header.pug');
    const actual = convert([path]);

    expect(actual[path]).toBe(
        ''
    );
});
