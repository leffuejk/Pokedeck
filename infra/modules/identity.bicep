// ---------------------------------------------------------------------------
// identity.bicep
// User-assigned managed identity used by the Container App to pull from ACR
// and to authenticate (via RBAC) to Key Vault and Azure AI Foundry.
// ---------------------------------------------------------------------------

@description('Azure region for the managed identity.')
param location string

@description('Name of the user-assigned managed identity (id-...).')
param managedIdentityName string

@description('Tags applied to all resources.')
param tags object = {}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
  tags: tags
}

@description('Resource ID of the user-assigned managed identity.')
output id string = managedIdentity.id

@description('Client ID (appId) of the user-assigned managed identity.')
output clientId string = managedIdentity.properties.clientId

@description('Principal (object) ID of the user-assigned managed identity.')
output principalId string = managedIdentity.properties.principalId

@description('Name of the user-assigned managed identity.')
output name string = managedIdentity.name
