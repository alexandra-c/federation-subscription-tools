"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlias = exports.simplify = exports.parse = exports.simplifyParsedResolveInfoFragmentWithType = exports.parseResolveInfo = exports.getAliasFromResolveInfo = void 0;
const assert_1 = __importDefault(require("assert"));
const graphql_1 = require("graphql");
const values_1 = require("graphql/execution/values");
function getArgVal(resolveInfo, argument) {
    if (argument.kind === "Variable") {
        return resolveInfo.variableValues[argument.name.value];
    }
    else if (argument.kind === "BooleanValue") {
        return argument.value;
    }
}
function argNameIsIf(arg) {
    return arg && arg.name ? arg.name.value === "if" : false;
}
function skipField(resolveInfo, { directives = [] }) {
    let skip = false;
    directives.forEach((directive) => {
        const directiveName = directive.name.value;
        if (Array.isArray(directive.arguments)) {
            const ifArgumentAst = directive.arguments.find(argNameIsIf);
            if (ifArgumentAst) {
                const argumentValueAst = ifArgumentAst.value;
                if (directiveName === "skip") {
                    skip = skip || getArgVal(resolveInfo, argumentValueAst);
                }
                else if (directiveName === "include") {
                    skip = skip || !getArgVal(resolveInfo, argumentValueAst);
                }
            }
        }
    });
    return skip;
}
function getAliasFromResolveInfo(resolveInfo) {
    const asts = resolveInfo.fieldNodes || resolveInfo.fieldASTs;
    for (let i = 0, l = asts.length; i < l; i++) {
        const val = asts[i];
        if (val.kind === "Field") {
            const alias = val.alias ? val.alias.value : val.name && val.name.value;
            if (alias) {
                return alias;
            }
        }
    }
    throw new Error("Could not determine alias?!");
}
exports.getAliasFromResolveInfo = getAliasFromResolveInfo;
function parseResolveInfo(resolveInfo, options = {}) {
    const fieldNodes = resolveInfo.fieldNodes || resolveInfo.fieldASTs;
    const { parentType } = resolveInfo;
    if (!fieldNodes) {
        throw new Error("No fieldNodes provided!");
    }
    if (options.keepRoot == null) {
        options.keepRoot = false;
    }
    if (options.deep == null) {
        options.deep = true;
    }
    const tree = fieldTreeFromAST(fieldNodes, resolveInfo, undefined, options, parentType);
    if (!options.keepRoot) {
        const typeKey = firstKey(tree);
        if (!typeKey) {
            return null;
        }
        const fields = tree[typeKey];
        const fieldKey = firstKey(fields);
        if (!fieldKey) {
            return null;
        }
        return fields[fieldKey];
    }
    return tree;
}
exports.parseResolveInfo = parseResolveInfo;
function getFieldFromAST(ast, parentType) {
    if (ast.kind === "Field") {
        const fieldNode = ast;
        const fieldName = fieldNode.name.value;
        if (!(parentType instanceof graphql_1.GraphQLUnionType)) {
            const type = parentType;
            return type.getFields()[fieldName];
        }
        else {
        }
    }
    return undefined;
}
let iNum = 1;
function fieldTreeFromAST(inASTs, resolveInfo, initTree = {}, options = {}, parentType, depth = "") {
    const instance = iNum++;
    const { variableValues } = resolveInfo;
    const fragments = resolveInfo.fragments || {};
    const asts = Array.isArray(inASTs) ? inASTs : [inASTs];
    if (!initTree[parentType.name]) {
        initTree[parentType.name] = {};
    }
    const outerDepth = depth;
    return asts.reduce((tree, selectionVal, idx) => {
        if (!skipField(resolveInfo, selectionVal) &&
            selectionVal.kind === "Field") {
            const val = selectionVal;
            const name = val.name.value;
            const isReserved = name[0] === "_" && name[1] === "_" && name !== "__id";
            if (!isReserved) {
                const alias = val.alias && val.alias.value ? val.alias.value : name;
                const field = getFieldFromAST(val, parentType);
                if (field == null) {
                    return tree;
                }
                const fieldGqlTypeOrUndefined = (0, graphql_1.getNamedType)(field.type);
                if (!fieldGqlTypeOrUndefined) {
                    return tree;
                }
                const fieldGqlType = fieldGqlTypeOrUndefined;
                const args = (0, values_1.getArgumentValues)(field, val, variableValues) || {};
                if (parentType.name && !tree[parentType.name][alias]) {
                    const newTreeRoot = {
                        name,
                        alias,
                        args,
                        fieldsByTypeName: (0, graphql_1.isCompositeType)(fieldGqlType)
                            ? {
                                [fieldGqlType.name]: {},
                            }
                            : {},
                    };
                    tree[parentType.name][alias] = newTreeRoot;
                }
                const selectionSet = val.selectionSet;
                if (selectionSet != null &&
                    options.deep &&
                    (0, graphql_1.isCompositeType)(fieldGqlType)) {
                    const newParentType = fieldGqlType;
                    fieldTreeFromAST(selectionSet.selections, resolveInfo, tree[parentType.name][alias].fieldsByTypeName, options, newParentType, `${depth}  `);
                }
            }
        }
        else if (selectionVal.kind === "FragmentSpread" && options.deep) {
            const val = selectionVal;
            const name = val.name && val.name.value;
            const fragment = fragments[name];
            (0, assert_1.default)(fragment, 'unknown fragment "' + name + '"');
            let fragmentType = parentType;
            if (fragment.typeCondition) {
                fragmentType = getType(resolveInfo, fragment.typeCondition);
            }
            if (fragmentType && (0, graphql_1.isCompositeType)(fragmentType)) {
                const newParentType = fragmentType;
                fieldTreeFromAST(fragment.selectionSet.selections, resolveInfo, tree, options, newParentType, `${depth}  `);
            }
        }
        else if (selectionVal.kind === "InlineFragment" && options.deep) {
            const val = selectionVal;
            const fragment = val;
            let fragmentType = parentType;
            if (fragment.typeCondition) {
                fragmentType = getType(resolveInfo, fragment.typeCondition);
            }
            if (fragmentType && (0, graphql_1.isCompositeType)(fragmentType)) {
                const newParentType = fragmentType;
                fieldTreeFromAST(fragment.selectionSet.selections, resolveInfo, tree, options, newParentType, `${depth}  `);
            }
        }
        return tree;
    }, initTree);
}
const hasOwnProperty = Object.prototype.hasOwnProperty;
function firstKey(obj) {
    for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            return key;
        }
    }
}
function getType(resolveInfo, typeCondition) {
    const { schema } = resolveInfo;
    const { kind, name } = typeCondition;
    if (kind === "NamedType") {
        const typeName = name.value;
        return schema.getType(typeName);
    }
}
function simplifyParsedResolveInfoFragmentWithType(parsedResolveInfoFragment, type) {
    const { fieldsByTypeName } = parsedResolveInfoFragment;
    const fields = {};
    const strippedType = (0, graphql_1.getNamedType)(type);
    if ((0, graphql_1.isCompositeType)(strippedType)) {
        Object.assign(fields, fieldsByTypeName[strippedType.name]);
        if (strippedType instanceof graphql_1.GraphQLObjectType) {
            const objectType = strippedType;
            for (const anInterface of objectType.getInterfaces()) {
                Object.assign(fields, fieldsByTypeName[anInterface.name]);
            }
        }
    }
    return {
        ...parsedResolveInfoFragment,
        fields,
    };
}
exports.simplifyParsedResolveInfoFragmentWithType = simplifyParsedResolveInfoFragmentWithType;
exports.parse = parseResolveInfo;
exports.simplify = simplifyParsedResolveInfoFragmentWithType;
exports.getAlias = getAliasFromResolveInfo;
//# sourceMappingURL=parsing.js.map