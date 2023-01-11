import { DataSource, DataSourceConfig } from "apollo-datasource";
import { DocumentNode } from "graphql";
import { GraphQLOptions } from "apollo-server";
import { FieldsByTypeName, ResolveTree } from "../../utils/parsing";
export declare class GatewayDataSource<TContext = any> extends DataSource {
    private gatewayURL;
    private propertyName;
    context: TContext;
    constructor(gatewayURL: string, propertyName: string);
    initialize(config: DataSourceConfig<TContext>): void;
    composeLinks(): import("@apollo/client/core").ApolloLink;
    didEncounterError(error: any): void;
    query(query: DocumentNode, options: GraphQLOptions): Promise<import("@apollo/client/core").FetchResult<Record<string, any>, Record<string, any>, Record<string, any>> | undefined>;
    resolveUri(): any;
    onRequestLink(): import("@apollo/client/core").ApolloLink;
    onErrorLink(): import("@apollo/client/core").ApolloLink;
    addDelimiter(a: string, b: string): string;
    isObject(val: any): boolean;
    isFieldObject(obj: any): any;
    fieldPathsAsStrings(obj: {
        [key: string]: any;
    }): string[];
    fieldPathsAsMapFromResolveInfo(resolveInfo: FieldsByTypeName | ResolveTree): {
        [k: string]: {
            args?: any;
            alias?: any;
        } | null;
    };
    buildSelection(selection: any, pathString: any, pathParts: any, fieldPathMap: any, index: any): any;
    buildNonPayloadSelections(payload: any, info: any): string;
    mergeFieldData(payloadFieldData: any, nonPayloadFieldData: any): any;
}
//# sourceMappingURL=index.d.ts.map