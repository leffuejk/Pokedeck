// ---------------------------------------------------------------------------
// registry.bicep
// Azure Container Registry (Basic, admin user disabled) + AcrPull grant to the
// user-assigned managed identity so the Container App can pull images via RBAC.
// ---------------------------------------------------------------------------

@description('Azure region for the container registry.')
param location string

@description('Globally-unique name of the Azure Container Registry (alphanumeric only).')
param registryName string

@description('SKU for the container registry.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param sku string = 'Basic'

@description('Principal ID of the managed identity to grant AcrPull.')
param acrPullPrincipalId string

@description('Tags applied to all resources.')
param tags object = {}

// AcrPull role definition ID (built-in).
var acrPullRoleDefinitionId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  properties: {
    // RBAC only - the admin account is disabled; pulls use the managed identity.
    adminUserEnabled: false
    anonymousPullEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, acrPullPrincipalId, acrPullRoleDefinitionId)
  scope: registry
  properties: {
    principalId: acrPullPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleDefinitionId)
  }
}

@description('Resource ID of the container registry.')
output id string = registry.id

@description('Login server of the container registry (e.g. crpokedeck.azurecr.io).')
output loginServer string = registry.properties.loginServer

@description('Name of the container registry.')
output name string = registry.name
