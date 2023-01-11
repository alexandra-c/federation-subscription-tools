import assert from "assert";
import {
  getNamedType,
  isCompositeType,
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLResolveInfo,
  GraphQLField,
  GraphQLCompositeType,
  GraphQLInterfaceType,
  GraphQLType,
  GraphQLNamedType,
  ASTNode,
  FieldNode,
  SelectionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  NamedTypeNode,
} from "graphql";
import { getArgumentValues } from "graphql/execution/values";

type mixed = Record<string, any> | string | number | boolean | undefined | null;

export interface FieldsByTypeName {
  [str: string]: {
    [str: string]: ResolveTree;
  };
}

export interface ResolveTree {
  name: string;
  alias: string;
  args: {
    [str: string]: unknown;
  };
  fieldsByTypeName: FieldsByTypeName;
}

function getArgVal(resolveInfo: GraphQLResolveInfo, argument: any) {
  if (argument.kind === "Variable") {
    return resolveInfo.variableValues[argument.name.value];
  } else if (argument.kind === "BooleanValue") {
    return argument.value;
  }
}

function argNameIsIf(arg: any): boolean {
  return arg && arg.name ? arg.name.value === "if" : false;
}

function skipField(
  resolveInfo: GraphQLResolveInfo,
  { directives = [] }: SelectionNode
) {
  let skip = false;
  directives.forEach((directive) => {
    const directiveName = directive.name.value;
    if (Array.isArray(directive.arguments)) {
      const ifArgumentAst = directive.arguments.find(argNameIsIf);
      if (ifArgumentAst) {
        const argumentValueAst = ifArgumentAst.value;
        if (directiveName === "skip") {
          skip = skip || getArgVal(resolveInfo, argumentValueAst);
        } else if (directiveName === "include") {
          skip = skip || !getArgVal(resolveInfo, argumentValueAst);
        }
      }
    }
  });
  return skip;
}

// Originally based on https://github.com/tjmehta/graphql-parse-fields

export function getAliasFromResolveInfo(
  resolveInfo: GraphQLResolveInfo
): string {
  const asts: ReadonlyArray<FieldNode> =
    // @ts-ignore Property 'fieldASTs' does not exist on type 'GraphQLResolveInfo'.
    resolveInfo.fieldNodes || resolveInfo.fieldASTs;
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

export interface ParseOptions {
  keepRoot?: boolean;
  deep?: boolean;
}

export function parseResolveInfo(
  resolveInfo: GraphQLResolveInfo,
  options: ParseOptions = {}
): ResolveTree | FieldsByTypeName | null | undefined {
  const fieldNodes: ReadonlyArray<FieldNode> =
    // @ts-ignore Property 'fieldASTs' does not exist on type 'GraphQLResolveInfo'.
    resolveInfo.fieldNodes || resolveInfo.fieldASTs;

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
  const tree = fieldTreeFromAST(
    fieldNodes,
    resolveInfo,
    undefined,
    options,
    parentType
  );
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

function getFieldFromAST<TContext>(
  ast: ASTNode,
  parentType: GraphQLCompositeType
): GraphQLField<unknown, TContext> | undefined {
  if (ast.kind === "Field") {
    const fieldNode: FieldNode = ast;
    const fieldName = fieldNode.name.value;
    if (!(parentType instanceof GraphQLUnionType)) {
      const type: GraphQLObjectType | GraphQLInterfaceType = parentType;
      return type.getFields()[fieldName];
    } else {
      // XXX: TODO: Handle GraphQLUnionType
    }
  }
  return undefined;
}

let iNum = 1;
function fieldTreeFromAST<T extends SelectionNode>(
  inASTs: ReadonlyArray<T> | T,
  resolveInfo: GraphQLResolveInfo,
  initTree: FieldsByTypeName = {},
  options: ParseOptions = {},
  parentType: GraphQLCompositeType,
  depth = ""
): FieldsByTypeName {
  const instance = iNum++;
  const { variableValues } = resolveInfo;
  const fragments = resolveInfo.fragments || {};
  const asts: ReadonlyArray<T> = Array.isArray(inASTs) ? inASTs : [inASTs];
  if (!initTree[parentType.name]) {
    initTree[parentType.name] = {};
  }
  const outerDepth = depth;
  return asts.reduce((tree, selectionVal: SelectionNode, idx) => {
    if (
      !skipField(resolveInfo, selectionVal) &&
      selectionVal.kind === "Field"
    ) {
      const val: FieldNode = selectionVal;
      const name = val.name.value;
      const isReserved = name[0] === "_" && name[1] === "_" && name !== "__id";
      if (!isReserved) {
        const alias: string =
          val.alias && val.alias.value ? val.alias.value : name;
        const field = getFieldFromAST(val, parentType);
        if (field == null) {
          return tree;
        }
        const fieldGqlTypeOrUndefined = getNamedType(field.type);
        if (!fieldGqlTypeOrUndefined) {
          return tree;
        }
        const fieldGqlType: GraphQLNamedType = fieldGqlTypeOrUndefined;
        const args = getArgumentValues(field, val, variableValues) || {};
        if (parentType.name && !tree[parentType.name][alias]) {
          const newTreeRoot: ResolveTree = {
            name,
            alias,
            args,
            fieldsByTypeName: isCompositeType(fieldGqlType)
              ? {
                  [fieldGqlType.name]: {},
                }
              : {},
          };
          tree[parentType.name][alias] = newTreeRoot;
        }
        const selectionSet = val.selectionSet;
        if (
          selectionSet != null &&
          options.deep &&
          isCompositeType(fieldGqlType)
        ) {
          const newParentType: GraphQLCompositeType = fieldGqlType;
          fieldTreeFromAST(
            selectionSet.selections,
            resolveInfo,
            tree[parentType.name][alias].fieldsByTypeName,
            options,
            newParentType,
            `${depth}  `
          );
        }
      }
    } else if (selectionVal.kind === "FragmentSpread" && options.deep) {
      const val: FragmentSpreadNode = selectionVal;
      const name = val.name && val.name.value;
      const fragment = fragments[name];
      assert(fragment, 'unknown fragment "' + name + '"');
      let fragmentType: GraphQLNamedType | null | undefined = parentType;
      if (fragment.typeCondition) {
        fragmentType = getType(resolveInfo, fragment.typeCondition);
      }
      if (fragmentType && isCompositeType(fragmentType)) {
        const newParentType: GraphQLCompositeType = fragmentType;
        fieldTreeFromAST(
          fragment.selectionSet.selections,
          resolveInfo,
          tree,
          options,
          newParentType,
          `${depth}  `
        );
      }
    } else if (selectionVal.kind === "InlineFragment" && options.deep) {
      const val: InlineFragmentNode = selectionVal;
      const fragment = val;
      let fragmentType: GraphQLNamedType | null | undefined = parentType;
      if (fragment.typeCondition) {
        fragmentType = getType(resolveInfo, fragment.typeCondition);
      }
      if (fragmentType && isCompositeType(fragmentType)) {
        const newParentType: GraphQLCompositeType = fragmentType;
        fieldTreeFromAST(
          fragment.selectionSet.selections,
          resolveInfo,
          tree,
          options,
          newParentType,
          `${depth}  `
        );
      }
    }
    // Ref: https://github.com/graphile/postgraphile/pull/342/files#diff-d6702ec9fed755c88b9d70b430fda4d8R148
    return tree;
  }, initTree);
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
function firstKey(obj: Record<string, unknown>) {
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return key;
    }
  }
}

function getType(
  resolveInfo: GraphQLResolveInfo,
  typeCondition: NamedTypeNode
) {
  const { schema } = resolveInfo;
  const { kind, name } = typeCondition;
  if (kind === "NamedType") {
    const typeName = name.value;
    return schema.getType(typeName);
  }
}

export function simplifyParsedResolveInfoFragmentWithType(
  parsedResolveInfoFragment: ResolveTree,
  type: GraphQLType
) {
  const { fieldsByTypeName } = parsedResolveInfoFragment;
  const fields = {};
  const strippedType = getNamedType(type);
  if (isCompositeType(strippedType)) {
    Object.assign(fields, fieldsByTypeName[strippedType.name]);
    if (strippedType instanceof GraphQLObjectType) {
      const objectType: GraphQLObjectType = strippedType;
      // GraphQL ensures that the subfields cannot clash, so it's safe to simply overwrite them
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

export const parse = parseResolveInfo;
export const simplify = simplifyParsedResolveInfoFragmentWithType;
export const getAlias = getAliasFromResolveInfo;
