/*
https://github.com/facebook/jsx/blob/master/AST.md
https://github.com/estree/estree/blob/master/es5.md
https://github.com/estree/estree/blob/master/es2015.md
https://github.com/benjamn/ast-types
https://github.com/jsx-eslint/jsx-ast-utils

https://astexplorer.net/#/gist/336cefe7aa160d894ecb38868898f389/a9d94ea8bcbfd0ec10b5b513140ba64928b6a64a
https://astexplorer.net/#/gist/6beeac58462e0cf754eaf0599965c6da/435c77abb125380bbb531a28d2642e3bd96db4a3
*/

// const writeFileSync = require('fs').writeFileSync;
const debug = require('debug')('pug-to-jsx');
const generate = require('@babel/generator').default;
const { parse: parseEs, parseExpression } = require('@babel/parser');
const b = require('@babel/types');
const lex = require('pug-lexer');
const load = require('pug-load');
const parsePug = require('pug-parser');
const literalToAst = require('babel-literal-to-ast');

const pugAttrNameToJsx = name => {
    switch (name) {
        case 'class':
            return 'className';
        default:
            return name;
    }
};

const pugAttrValToJsx = (name, val) => {
    if (typeof val === 'boolean') {
        return null;
    }

    // styles as a css string
    if (name === 'style' && !val.includes('{')) {
        console.log('val :>> ', val);
        return b.jsxExpressionContainer(
            literalToAst(
                val.replace(/["\s+]/g, '').split(';').reduce((styles, styleRaw) => {
                    const style = styleRaw.split(':');
                    styles[style[0]] = style[1];
                    return styles;
                }, {})
            )
        );
    }

    // FIXME: try to distinguish simple strings from actual expressions
    // this should result in cleaner string attrs in jsx
    // return b.stringLiteral(val.replace(/'/g, ''));
    return b.jsxExpressionContainer(parseExpression(val));
};

const processArrayForConditional = nodesArr => {
    if (nodesArr.length === 0) return b.nullLiteral();

    // assuming that we'll get only markup here
    return b.jsxFragment(
        b.jsxOpeningFragment(),
        b.jsxClosingFragment(),
        nodesArr.map(child => {
            if (child.expression) {
                return b.jsxExpressionContainer(child.expression);
            }
            return child;
        }),
    );
};

function getEsNode(pugNode, esChildren) {
    let esNode;

    debug(`\ngot node type ${pugNode.type}: %O\n`, pugNode);

    if (pugNode.type === 'Text') {
        // intentionally streamlining this case for now since formatting is done by the `generator` anyway
        if (pugNode.val.replace(/\s|\n/g, '').length === 0) esNode = b.emptyStatement();
        else esNode = b.jsxText(pugNode.val); // string
    } else if (pugNode.type === 'Code') {
        esNode = parseEs(pugNode.val).program.body;
    } else if (pugNode.type === 'Block') {
        esNode = esChildren;
    } else if (pugNode.type === 'Comment') {
        esNode = b.emptyStatement(); // FIXME: add actual comments
    } else if (pugNode.type === 'Doctype') {
        esNode = b.emptyStatement();
    } else if (pugNode.type === 'Case') {
        esNode = b.switchStatement(
            parseExpression(pugNode.expr),
            esChildren,
        );
    } else if (pugNode.type === 'When') {
        esNode = b.switchCase(
            pugNode.expr === 'default' ? null : parseExpression(pugNode.expr),
            esChildren ?
                // break statement is implicit by default, FIXME: handle explicit break statements
                [...[].concat(esChildren), b.breakStatement()] :
                [],
        );
    } else if (pugNode.type === 'Conditional') {
        let consequent = walk(pugNode.consequent);
        if (Array.isArray(consequent)) consequent = processArrayForConditional(consequent);
        debug('consequent %O', consequent);

        let alternate = pugNode.alternate && walk(pugNode.alternate) || b.nullLiteral();
        if (Array.isArray(alternate)) alternate = processArrayForConditional(alternate);
        debug('alternate %O', alternate);

        esNode = b.conditionalExpression(
            parseExpression(pugNode.test),
            consequent,
            alternate,
        );
    } else if (pugNode.type === 'Each') {
        let children = Array.isArray(esChildren) ? esChildren.flat() : [esChildren];

        esNode = b.expressionStatement(
            b.callExpression(
                b.memberExpression(b.identifier(pugNode.obj), b.identifier('map')),
                [b.arrowFunctionExpression(
                    [
                        b.identifier(pugNode.val),
                        pugNode.key ? b.identifier(pugNode.key) : undefined,
                    ].filter(Boolean),
                    b.blockStatement([
                        b.returnStatement(
                            b.jsxFragment(
                                b.jsxOpeningFragment(),
                                b.jsxClosingFragment(),
                                children.map(child => {
                                    if (child.expression) {
                                        return child.expression;
                                    }
                                    return child;
                                }),
                            ),
                        ),
                    ]),
                )]
            )
        );
    } else if (pugNode.type === 'Mixin' && pugNode.call === false) { // component declaration
        esNode = b.variableDeclaration(
            'const',
            [b.variableDeclarator(
                b.identifier(pugNode.name),
                b.arrowFunctionExpression(
                    pugNode.args.split(', ').map(arg => b.identifier(arg)), // TODO: generate props destructuring for easier refactoring?
                    b.blockStatement(esChildren),
                )
            )]
        );
    } else if (pugNode.type === 'Mixin' && pugNode.call === true) { // component call

    } else if (pugNode.type === 'Tag') {
        let children = Array.isArray(esChildren) ? esChildren.flat() : [esChildren];

        esNode = b.expressionStatement(
            b.jsxElement(
                b.jsxOpeningElement(
                    b.jsxIdentifier(pugNode.name),
                    [
                        ...pugNode.attrs.map(attr => b.jsxAttribute(
                            b.jsxIdentifier(pugAttrNameToJsx(attr.name)),
                            pugAttrValToJsx(attr.name, attr.val)
                        )),
                        ...pugNode.attributeBlocks.map(attrBlock => b.jsxSpreadAttribute(parseExpression(attrBlock.val)))
                    ]
                ),
                b.jsxClosingElement(b.jsxIdentifier(pugNode.name)),
                children.map(child => {
                    if (child.expression) { // passthrough
                        return b.jsxExpressionContainer(child.expression);
                    } else if (b.isEmptyStatement(child)) {
                        return b.jsxText(' '); // FIXME: hack to override the Text node handler behavior -- ES `program`'s `body` doesn't like jsxText as its children, so I return EmptyExpression there, but have to make this hack here
                    } else if (!(
                        b.isJSXText(child) ||
                        b.isJSXSpreadChild(child) ||
                        b.isJSXElement(child) ||
                        b.isJSXFragment(child)
                    )) {
                        return b.jsxExpressionContainer(child);
                    }

                    return child;
                }),
                pugNode.selfClosing,
            )
        );
    } else if (pugNode.type === 'InterpolatedTag') {
        esNode = b.jsxExpressionContainer(parseExpression(pugNode.expr));
    } else if (pugNode.type === 'Include') {
        const name = pugNode.file.path.split('/').pop().replace(/.pug$/, '').replace('-', ''); // TODO: camel case names
        const specifier = b.identifier(name);

        esNode = b.importDeclaration(
            [b.importSpecifier(specifier, specifier)],
            b.stringLiteral(pugNode.file.path.replace(/\.pug$/, '')),
        );
    }

    if (typeof esNode === 'undefined') throw new Error(`Unsupported pug node type: ${pugNode.type}`);

    return esNode;
}

function walk(pugNode) {
    if (Array.isArray(pugNode)) {
        return pugNode.map(n => walk(n));
    }

    const pugChildren = pugNode.nodes || pugNode.block;

    let esChildren;
    if (pugChildren) {
        esChildren = walk(pugChildren);
    }

    return getEsNode(pugNode, esChildren);
}

/**
 * @param {String[]} paths
 */
module.exports.convert = function convert(paths) {
    const res = {};

    paths.forEach(path => {
        const pugAst = load.file(path, {
            lex,
            parse: parsePug,
            resolve: function (filename, source, options) {
                console.log('"' + filename + '" file requested from "' + source + '".');
                return load.resolve(filename, source, options);
            }
        });

        debug('Pug AST: %O', pugAst);
        const walkRes = walk(pugAst);
        debug('Pug AST walk: %O', walkRes);
        const esAst = b.program([].concat(...walkRes));
        debug('ES AST: %O', esAst);
        const { code } = generate(esAst);
        debug('resulting code: %o', code);

        // writeFileSync(path.replace(/\.pug$/, '.jsx'), code);
        res[path] = code;
    });

    return res;
};
