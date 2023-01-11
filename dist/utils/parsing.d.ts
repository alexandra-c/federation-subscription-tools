import { GraphQLResolveInfo, GraphQLType } from "graphql";
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
export declare function getAliasFromResolveInfo(resolveInfo: GraphQLResolveInfo): string;
export interface ParseOptions {
    keepRoot?: boolean;
    deep?: boolean;
}
export declare function parseResolveInfo(resolveInfo: GraphQLResolveInfo, options?: ParseOptions): ResolveTree | FieldsByTypeName | null | undefined;
export declare function simplifyParsedResolveInfoFragmentWithType(parsedResolveInfoFragment: ResolveTree, type: GraphQLType): {
    fields: {};
    name: string;
    alias: string;
    args: {
        [str: string]: unknown;
    };
    fieldsByTypeName: FieldsByTypeName;
};
export declare const parse: typeof parseResolveInfo;
export declare const simplify: typeof simplifyParsedResolveInfoFragmentWithType;
export declare const getAlias: typeof getAliasFromResolveInfo;
//# sourceMappingURL=parsing.d.ts.map