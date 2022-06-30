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
const chalk = require('chalk');
const generate = require('@babel/generator').default;
const { parse: parseEs, parseExpression } = require('@babel/parser');
const b = require('@babel/types');
const lex = require('pug-lexer');
const load = require('pug-load');
const parsePug = require('pug-parser');
const literalToAst = require('babel-literal-to-ast');
const utils = require('./utils');

const walkMeta = {};

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
    return wrapInFragment(nodesArr.map(child => {
        if (child.expression) {
            return b.jsxExpressionContainer(child.expression);
        }
        return child;
    }),
    );
};

const fileNameFromPugFileAttr = (file) => {
    const noExtPath = file.path.replace(/.pug$/, '');
    const name = noExtPath.split('/').pop();

    return { name, noExtPath };
};

// valid fragment children: ["JSXText","JSXExpressionContainer","JSXSpreadChild","JSXElement","JSXFragment"]
const isValidJsxFragmentChild = (s) => (
    b.isJSXText(s) ||
    b.isJSXExpressionContainer(s) ||
    b.isJSXSpreadChild(s) ||
    b.isJSXElement(s) ||
    b.isJSXFragment(s)
);

const wrapInFragment = (children) => b.jsxFragment(
    b.jsxOpeningFragment(),
    b.jsxClosingFragment(),
    Array.isArray(children) ? children : [children],
);

function getEsNode(pugNode, esChildren) {
    let esNode;

    debug(`\ngot node type ${pugNode.type}: %O\n`, pugNode);

    if (pugNode.type === 'Text') {
        esNode = b.jsxText(pugNode.val);
    } else if (pugNode.type === 'Code') {
        esNode = parseEs(pugNode.val).program.body;
    } else if (pugNode.type === 'Block') {
        esNode = esChildren;
    } else if (pugNode.type === 'Comment') {
        esNode = b.jsxText(''); // FIXME: add actual comments
    } else if (pugNode.type === 'Doctype') {
        return;
    } else if (pugNode.type === 'Case') {
        // TODO: this handles cases when Case is used for rendering -- how do we separate these from "regular" switch-case statements' use-cases?
        esNode = wrapInFragment(b.jsxExpressionContainer(
            b.callExpression(
                b.arrowFunctionExpression(
                    [],
                    b.blockStatement([
                        b.switchStatement(
                            parseExpression(pugNode.expr),
                            esChildren,
                        )
                    ]),
                ),
                [],
            ),
        ));
    } else if (pugNode.type === 'When') {
        // break statement is implicit by default, FIXME: handle explicit break statements
        esNode = b.switchCase(
            pugNode.expr === 'default' ? null : parseExpression(pugNode.expr),
            esChildren ? [b.returnStatement(
                wrapInFragment(esChildren.filter(Boolean)),
            )] : [],
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

        esNode = wrapInFragment(
            b.jsxExpressionContainer(
                b.callExpression(
                    b.memberExpression(b.identifier(pugNode.obj), b.identifier('map')),
                    [b.arrowFunctionExpression(
                        [
                            b.identifier(pugNode.val),
                            pugNode.key ? b.identifier(pugNode.key) : undefined,
                        ].filter(Boolean),
                        wrapInFragment(
                            children.map(child => {
                                if (child.expression) {
                                    return child.expression;
                                }
                                return child;
                            })
                        ),
                    )]
                )
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

        esNode = b.jsxElement(
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
                if (!child) {
                    return b.jsxText(''); // FIXME: same as below
                } else if (child.expression) { // passthrough
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
            }) || [],
            pugNode.selfClosing,
        );
    } else if (pugNode.type === 'InterpolatedTag') {
        esNode = b.jsxExpressionContainer(parseExpression(pugNode.expr));
    } else if (pugNode.type === 'Include') {
        if (pugNode.column !== 1) {
            console.warn(chalk.yellow(`Skipping ${pugNode.file.path}.\nPlease convert this include to a mixin (e.g. +myMixin(arg1, arg2, ...)) and move its import to the top of the template file`));
            return;
        }

        const { name, noExtPath } = fileNameFromPugFileAttr(pugNode.file);
        const identifier = b.identifier(name);

        esNode = b.importDeclaration(
            [b.importSpecifier(identifier, identifier)],
            b.stringLiteral(noExtPath),
        );
    } else if (pugNode.type === 'RawInclude') {
        console.warn(chalk.yellow(`Skipping ${pugNode.file.path}. Please handle these files manually.`));
        return;
    } else if (pugNode.type === 'Extends') {
        const { name, noExtPath } = fileNameFromPugFileAttr(pugNode.file);
        const specifier = b.identifier(name);

        esNode = b.importDeclaration(
            [b.importSpecifier(specifier, specifier)],
            b.stringLiteral(noExtPath),
        );
    }

    if (typeof esNode === 'undefined') throw new Error(`Unsupported pug node type: ${pugNode.type}`);

    return esNode;
}

function walk(pugNode, path) {
    if (Array.isArray(pugNode)) {
        return pugNode
            .map((n) => walk(n, path))
            .flat() // flat handles Code block results being arrays, while everything else is b.something() result
            .filter(Boolean);
    }

    const pugChildren = pugNode.nodes || pugNode.block;

    let esChildren;
    if (pugChildren) {
        esChildren = walk(pugChildren, path);
    }

    return getEsNode(pugNode, esChildren, path);
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

        const namedBlock = pugAst.nodes.find((node) => node.type === 'NamedBlock');
        const extendsBlock = pugAst.nodes.find((node) => node.type === 'Extends');
        const identifierName = utils.camelCase(fileNameFromPugFileAttr({ path }).name);

        if (namedBlock) {
            walkMeta[path] || (walkMeta[path] = {});
            walkMeta[path].moduleName = identifierName;

            // if `extends` keyword is present then each `block` is an `as` prop from a base component
            if (extendsBlock) {
                walkMeta[path].baseModuleName = fileNameFromPugFileAttr(extendsBlock.file).name;
            }
        }

        debug('Pug AST: %O', pugAst);
        const walkRes = walk(pugAst, path);
        debug('Pug AST walk result: %O', walkRes);
        const preparedWalkRes = walkRes.map(statement => {
            // probably a hack for cases when we get a "bare" or an empty expression
            // that is not a statement as required by b.program()'s body param,
            // see conditionals/unless test
            if (!statement || b.isEmptyStatement(statement)) return b.jsxText('');

            // edge case for conditionals w\o `alternate` prop
            if (b.isConditional(statement)) return wrapInFragment(b.jsxExpressionContainer(statement));

            return statement;
        });

        const topLevelStatements = [];
        const returnStatements = [];
        const nonReturnStatements = [];
        for (const statement of preparedWalkRes) {
            if (b.isImportDeclaration(statement)) {
                topLevelStatements.push(statement);
            } else if (isValidJsxFragmentChild(statement)) {
                returnStatements.push(statement);
            } else {
                nonReturnStatements.push(statement);
            }
        }

        // return formatting
        let returnBody;
        if (returnStatements.length === 0) {
            returnBody = b.nullLiteral();
        } else if (returnStatements.length === 1) {
            returnBody = returnStatements[0];
        } else {
            returnBody = b.jsxFragment(
                b.jsxOpeningFragment(),
                b.jsxClosingFragment(),
                [
                    b.jsxText('\n'),
                    ...returnStatements,
                    b.jsxText('\n'),
                ]
            );
        }

        const componentBody = [
            b.returnStatement(returnBody),
        ];
        if (nonReturnStatements.length > 0) {
            componentBody.unshift(...nonReturnStatements);
        }

        const declaration = b.exportNamedDeclaration(
            b.variableDeclaration('const', [
                b.variableDeclarator(
                    b.identifier(identifierName),
                    b.arrowFunctionExpression(
                        [/* TODO: parse `block` statements into params */],
                        b.blockStatement(componentBody),
                    ),
                ),
            ]),
        );
        const esAst = b.program([...topLevelStatements, declaration]);
        debug('ES AST: %O', esAst);
        const { code } = generate(esAst);
        debug('resulting code: %o', code);

        // writeFileSync(path.replace(/\.pug$/, '.jsx'), code);
        res[path] = code;
    });

    return res;
};
