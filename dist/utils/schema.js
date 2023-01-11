"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSubscriptionSchema = exports.getGatewayApolloConfig = void 0;
const crypto_1 = require("crypto");
const schema_1 = require("@graphql-tools/schema");
const graphql_tag_1 = require("graphql-tag");
const graphql_1 = require("graphql");
function getGatewayApolloConfig(key, graphRef) {
    return {
        key,
        graphRef,
        keyHash: (0, crypto_1.createHash)("sha512").update(key).digest("hex"),
    };
}
exports.getGatewayApolloConfig = getGatewayApolloConfig;
function makeSubscriptionSchema({ gatewaySchema, typeDefs, resolvers, }) {
    if (!typeDefs || !resolvers) {
        throw new Error("Both `typeDefs` and `resolvers` are required to make the executable subscriptions schema.");
    }
    const gatewayTypeDefs = gatewaySchema
        ? (0, graphql_tag_1.gql)((0, graphql_1.printSchema)(gatewaySchema))
        : undefined;
    return (0, schema_1.makeExecutableSchema)({
        typeDefs: [
            ...(gatewayTypeDefs && [gatewayTypeDefs]),
            typeDefs,
        ],
        resolvers,
    });
}
exports.makeSubscriptionSchema = makeSubscriptionSchema;
//# sourceMappingURL=schema.js.map