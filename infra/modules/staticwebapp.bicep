// ---------------------------------------------------------------------------
// staticwebapp.bicep
// Azure Static Web App (Standard SKU) for the frontend. Standalone hosting with
// the API base URL surfaced as an app setting. A deployment token is minted at
// deploy time and used by CD to publish the built frontend.
// ---------------------------------------------------------------------------

@description('Azure region for the Static Web App (SWA supports a limited set of regions).')
param location string = 'centralus'

@description('Globally-unique name of the Static Web App (stapp-...).')
param staticWebAppName string

@description('SKU for the Static Web App.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Standard'

@description('Public URL of the API the frontend calls.')
param apiUrl string = ''

@description('Tags applied to all resources.')
param tags object = {}

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // Source is wired by CD (SWA CLI / GitHub Action) rather than build-in-place.
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// App settings exposed to the frontend runtime (e.g. the API base URL).
resource appSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    API_URL: apiUrl
  }
}

@description('Resource ID of the Static Web App.')
output id string = staticWebApp.id

@description('Name of the Static Web App.')
output name string = staticWebApp.name

@description('Default hostname of the Static Web App.')
output defaultHostname string = staticWebApp.properties.defaultHostname

@description('Public URL of the Static Web App.')
output url string = 'https://${staticWebApp.properties.defaultHostname}'
