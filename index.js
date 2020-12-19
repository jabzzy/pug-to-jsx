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
const generate = require('@babel/generator').default;
const parseExpression = require('@babel/parser').parseExpression;
const b = require('@babel/types');
const lex = require('pug-lexer');
const load = require('pug-load');
const parse = require('pug-parser');

const pugAttrNameToJsx = name => {
    switch (name) {
        case 'class':
            return 'className';
        default:
            return name;
    }
};

const pugAttrValToJsx = (attrName, val) => {
    switch (attrName) {
        case 'class':
            try {
                const exprVal = parseExpression(val);
                return b.jsxExpressionContainer(exprVal);
            } catch (error) {
                return b.stringLiteral(val.replace(/'/g, ''));
            }
        default:
            return b.stringLiteral(val);
    }
};

function getEsNode(pugNode, esChildren) {
    let esNode;

    if (pugNode.type === 'Text') {
        // intentionally streamlining this case for now since formatting is done by the `generator` anyway
        if (pugNode.val.replace(/\s|\n/g, '').length === 0) esNode = b.emptyStatement();
        else esNode = b.jsxText(pugNode.val); // string
    } else if (pugNode.type === 'Code') { // prop access
        esNode = parseExpression(pugNode.val);
    } else if (pugNode.type === 'Block') {
        esNode = esChildren;
    } else if (pugNode.type === 'Comment') {
        esNode = b.emptyStatement(); // FIXME: add actual comments
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
        esNode = b.expressionStatement(
            b.jsxElement(
                b.jsxOpeningElement(
                    b.jsxIdentifier(pugNode.name),
                    pugNode.attrs.map(attr => b.jsxAttribute(
                        b.jsxIdentifier(pugAttrNameToJsx(attr.name)),
                        pugAttrValToJsx(attr.name, attr.val)
                    ))
                ),
                b.jsxClosingElement(b.jsxIdentifier(pugNode.name)),
                esChildren,
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
            parse,
            resolve: function (filename, source, options) {
                console.log('"' + filename + '" file requested from "' + source + '".');
                return load.resolve(filename, source, options);
            }
        });

        const walkRes = walk(pugAst);
        const esAst = b.program(walkRes);
        const { code } = generate(esAst);

        // writeFileSync(path.replace(/\.pug$/, '.jsx'), code);
        res[path] = code;
    });

    return res;
};
