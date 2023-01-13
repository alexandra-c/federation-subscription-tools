"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayDataSource = void 0;
const apollo_server_1 = require("apollo-server");
const core_1 = require("@apollo/client/core");
const apollo_datasource_1 = require("apollo-datasource");
const error_1 = require("@apollo/client/link/error");
const context_1 = require("@apollo/client/link/context");
const node_fetch_1 = __importDefault(require("node-fetch"));
const merge_1 = __importDefault(require("lodash/merge"));
const parsing_1 = require("../../utils/parsing");
class GatewayDataSource extends apollo_datasource_1.DataSource {
    gatewayURL;
    propertyName;
    context;
    constructor(gatewayURL, propertyName) {
        super();
        if (!propertyName)
            console.error(`If you wish to merge an array of gateway data sources to your subscription context using "mergeGatewayDataSources" function, 
          it's mandatory to pass a "propertyName" value when instantiating a dataSource!`);
        this.gatewayURL = gatewayURL;
        this.propertyName = propertyName;
    }
    initialize(config) {
        this.context = config.context;
    }
    composeLinks() {
        const uri = this.resolveUri();
        return (0, core_1.from)([
            this.onErrorLink(),
            this.onRequestLink(),
            (0, core_1.createHttpLink)({ fetch: node_fetch_1.default, uri })
        ]);
    }
    didEncounterError(error) {
        const status = error.statusCode ? error.statusCode : null;
        const message = error.bodyText ? error.bodyText : null;
        let apolloError;
        switch (status) {
            case 401:
                apolloError = new apollo_server_1.AuthenticationError(message);
                break;
            case 403:
                apolloError = new apollo_server_1.ForbiddenError(message);
                break;
            case 502:
                apolloError = new apollo_server_1.ApolloError("Bad Gateway", status);
                break;
            default:
                apolloError = new apollo_server_1.ApolloError(message, status);
        }
        throw apolloError;
    }
    async query(query, options) {
        const link = this.composeLinks();
        try {
            const response = await (0, core_1.toPromise)((0, core_1.execute)(link, { query, ...options }));
            return response;
        }
        catch (error) {
            this.didEncounterError(error);
        }
    }
    resolveUri() {
        const gatewayURL = this.gatewayURL;
        if (!gatewayURL) {
            throw new apollo_server_1.ApolloError("Cannot make request to GraphQL API, missing gatewayURL");
        }
        return gatewayURL;
    }
    onRequestLink() {
        return (0, context_1.setContext)(request => {
            if (typeof this.willSendRequest === "function") {
                this.willSendRequest(request);
            }
            return request;
        });
    }
    onErrorLink() {
        return (0, error_1.onError)(({ graphQLErrors, networkError }) => {
            if (graphQLErrors) {
                graphQLErrors.map(graphqlError => console.error(`[GraphQL error]: ${graphqlError.message}`));
            }
            if (networkError) {
                console.log(`[Network Error]: ${networkError}`);
            }
        });
    }
    addDelimiter(a, b) {
        return a ? `${a}.${b}` : b;
    }
    isObject(val) {
        return typeof val === "object" && !Array.isArray(val) && val !== null;
    }
    isFieldObject(obj) {
        return (this.isObject(obj) &&
            obj.hasOwnProperty("args") &&
            obj.hasOwnProperty("alias") &&
            obj.hasOwnProperty("name"));
    }
    fieldPathsAsStrings(obj) {
        const paths = (obj = {}, head = "") => {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                let fullPath = this.addDelimiter(head, key);
                return this.isObject(value)
                    ? acc.concat(key, paths(value, fullPath))
                    : acc.concat(fullPath);
            }, []);
        };
        return paths(obj);
    }
    fieldPathsAsMapFromResolveInfo(resolveInfo) {
        const paths = (obj = {}, head = "") => {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                let fullPath = this.addDelimiter(head, key);
                if (this.isFieldObject(value) &&
                    Object.keys(value.fieldsByTypeName).length === 0) {
                    const { alias, args, name } = value;
                    return acc.concat([[fullPath, { alias, args, name }]]);
                }
                else if (this.isFieldObject(value)) {
                    const { alias, args, name } = value;
                    return acc.concat([[fullPath, { alias, args, name }]], paths(value, fullPath));
                }
                else if (this.isObject(value)) {
                    return acc.concat(paths(value, fullPath));
                }
                return acc.concat([[fullPath, null]]);
            }, []);
        };
        const resolveInfoFields = paths(resolveInfo);
        return Object.fromEntries(resolveInfoFields
            .filter(([_, options]) => options)
            .map(([path, { alias, args, name }]) => {
            const pathParts = path.split(".");
            const noTypeNames = pathParts.forEach((part, i) => {
                if (pathParts[i - 1] === "fieldsByTypeName") {
                    pathParts.splice(i - 1, 2);
                }
            });
            let keptOptions = {
                ...(name !== alias && { alias }),
                ...(Object.keys(args).length && { args })
            };
            return [
                pathParts.join("."),
                Object.keys(keptOptions).length ? keptOptions : null
            ];
        }));
    }
    buildSelection(selection, pathString, pathParts, fieldPathMap, index) {
        let formattedSelection = selection;
        let options;
        let parentOptions;
        if (pathParts.length > 1 && index < pathParts.length - 1) {
            const parentPathString = pathParts.slice(0, index + 1).join(".");
            parentOptions = fieldPathMap[parentPathString];
        }
        else {
            options = fieldPathMap[pathString];
        }
        if (parentOptions) {
            if (parentOptions.alias) {
                formattedSelection = `${parentOptions.alias}: ${formattedSelection}`;
            }
            if (parentOptions.args) {
                const formattedArgs = JSON.stringify(parentOptions.args)
                    .slice(1, -1)
                    .replace(/"([^"]+)":/g, "$1:");
                formattedSelection = `${formattedSelection}(${formattedArgs})`;
            }
        }
        else if (options) {
            if (options.alias) {
                formattedSelection = `${options.alias}: ${formattedSelection}`;
            }
            if (options.args) {
                const formattedArgs = JSON.stringify(options.args)
                    .slice(1, -1)
                    .replace(/"([^"]+)":/g, "$1:");
                formattedSelection = `${formattedSelection}(${formattedArgs})`;
            }
        }
        return formattedSelection;
    }
    buildNonPayloadSelections(payload, info) {
        const resolveInfo = (0, parsing_1.parseResolveInfo)(info);
        const payloadFieldPaths = this.fieldPathsAsStrings(payload[resolveInfo?.name]);
        const operationFields = resolveInfo
            ? this.fieldPathsAsMapFromResolveInfo(resolveInfo)
            : {};
        const operationFieldPaths = Object.keys(operationFields);
        return operationFieldPaths
            .filter(path => !payloadFieldPaths.includes(path))
            .reduce((acc, curr, i, arr) => {
            const pathParts = curr.split(".");
            let selections = "";
            pathParts.forEach((part, j) => {
                const hasSubFields = !!arr.slice(i + 1).find(item => {
                    const itemParts = item.split(".");
                    itemParts.pop();
                    const rejoinedItem = itemParts.join(".");
                    return rejoinedItem === curr;
                });
                if (hasSubFields) {
                    return;
                }
                const sel = this.buildSelection(part, curr, pathParts, operationFields, j);
                if (j === 0) {
                    selections = `${sel} `;
                }
                else if (j === 1) {
                    selections = `${selections}{ ${sel} } `;
                }
                else {
                    const char = -(j - 2) - j;
                    selections = `${selections.slice(0, char)}{ ${sel} } ${selections.slice(char)}`;
                }
            });
            return acc + selections;
        }, "");
    }
    mergeFieldData(payloadFieldData, nonPayloadFieldData) {
        return (0, merge_1.default)(payloadFieldData, nonPayloadFieldData);
    }
}
exports.GatewayDataSource = GatewayDataSource;
//# sourceMappingURL=index.js.map