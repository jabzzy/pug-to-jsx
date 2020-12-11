const { convert } = require('.');

test('basic.pug', () => {
    const actual = convert(['./testFiles/basic.pug']);

    expect(actual['./testFiles/basic.pug']).toBe(
        'const basic = (arg1, arg2) => {\n  <div className="basic">Text node</div>;\n};'
    );
});

test('extended.pug', () => {
    const actual = convert(['./testFiles/extended.pug']);

    expect(actual['./testFiles/extended.pug']).toBe(
        'const extended = (arg1, arg2) => {\n  <div className="extended">Text node</div>;\n  <div className="extended">{arg1.argProp}</div>;\n};'
    );
});

test('header.pug', () => {
    const actual = convert(['./testFiles/header.pug']);

    expect(actual['./testFiles/header.pug']).toBe(
        ''
    );
});
