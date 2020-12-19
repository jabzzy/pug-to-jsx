const { convert } = require('..');

test('basic.pug', () => {
    const actual = convert(['./fixtures/basic.pug']);

    expect(actual['./fixtures/basic.pug']).toBe(
        'const basic = (arg1, arg2) => {\n  <div className="basic">Text node</div>;\n};'
    );
});

test('extended.pug', () => {
    const actual = convert(['./fixtures/extended.pug']);

    expect(actual['./fixtures/extended.pug']).toBe(
        'const extended = (arg1, arg2) => {\n  <div className="extended">Text node</div>;\n  <div className="extended">{arg1.argProp}</div>;\n};'
    );
});

test('header.pug', () => {
    const actual = convert(['./fixtures/header.pug']);

    expect(actual['./fixtures/header.pug']).toBe(
        ''
    );
});
