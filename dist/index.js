"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSubscriptionSchema = exports.getGatewayApolloConfig = exports.GatewayDataSource = exports.addGatewayDataSourceToSubscriptionContext = void 0;
var subscriptions_1 = require("./utils/subscriptions");
Object.defineProperty(exports, "addGatewayDataSourceToSubscriptionContext", { enumerable: true, get: function () { return subscriptions_1.addGatewayDataSourceToSubscriptionContext; } });
var GatewayDataSource_1 = require("./datasources/GatewayDataSource");
Object.defineProperty(exports, "GatewayDataSource", { enumerable: true, get: function () { return GatewayDataSource_1.GatewayDataSource; } });
var schema_1 = require("./utils/schema");
Object.defineProperty(exports, "getGatewayApolloConfig", { enumerable: true, get: function () { return schema_1.getGatewayApolloConfig; } });
Object.defineProperty(exports, "makeSubscriptionSchema", { enumerable: true, get: function () { return schema_1.makeSubscriptionSchema; } });
//# sourceMappingURL=index.js.map