/*
 Deprecated: Consider using "mergeGatewayDataSources"
*/
export function addGatewayDataSourceToSubscriptionContext(
  context,
  gatewayDataSource
) {
  gatewayDataSource.initialize({ context, cache: undefined });
  return { dataSources: { gatewayApi: gatewayDataSource } };
}

export function mergeGatewayDataSources(context, dataSources) {
  if (!dataSources) {
    throw new Error(
      "You need to pass at least one dataSource instance to `mergeGatewayDataSources`."
    );
  }
  const gatewayDataSources = dataSources.reduce((acc, ds) => {
    ds.initialize({ context, cache: undefined });
    return { ...acc, [ds.propertyName]: ds };
  }, {});
  return { dataSources: { gatewayApi: gatewayDataSources } };
}
