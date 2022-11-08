"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addGatewayDataSourceToSubscriptionContext = void 0;
function addGatewayDataSourceToSubscriptionContext(context, gatewayDataSource) {
    gatewayDataSource.initialize({ context, cache: undefined });
    return { dataSources: { gatewayApi: gatewayDataSource } };
}
exports.addGatewayDataSourceToSubscriptionContext = addGatewayDataSourceToSubscriptionContext;
//# sourceMappingURL=subscriptions.js.map