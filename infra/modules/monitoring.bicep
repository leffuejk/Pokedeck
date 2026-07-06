// ---------------------------------------------------------------------------
// monitoring.bicep
// Log Analytics workspace + workspace-based Application Insights.
// ---------------------------------------------------------------------------

@description('Azure region for the monitoring resources.')
param location string

@description('Name of the Log Analytics workspace (log-...).')
param logAnalyticsName string

@description('Name of the Application Insights component (appi-...).')
param applicationInsightsName string

@description('Tags applied to all resources.')
param tags object = {}

@description('Retention in days for the Log Analytics workspace.')
param retentionInDays int = 30

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    retentionInDays: retentionInDays
    sku: {
      name: 'PerGB2018'
    }
    features: {
      searchVersion: 1
    }
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

@description('Resource ID of the Log Analytics workspace.')
output logAnalyticsWorkspaceId string = logAnalytics.id

@description('Customer ID (workspace GUID) of the Log Analytics workspace.')
output logAnalyticsCustomerId string = logAnalytics.properties.customerId

@description('Resource ID of the Application Insights component.')
output applicationInsightsId string = applicationInsights.id

@description('Application Insights connection string.')
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
