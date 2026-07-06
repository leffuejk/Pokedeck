// ---------------------------------------------------------------------------
// keyvault.bicep
// RBAC-mode Key Vault holding the Postgres admin password, AUTH_SECRET and
// OAuth client secrets. Grants the managed identity "Key Vault Secrets User".
// Secret values are supplied via @secure() params (placeholders in dev, real
// values injected by CI). No secret values appear in outputs.
// ---------------------------------------------------------------------------

@description('Azure region for the Key Vault.')
param location string

@description('Globally-unique name of the Key Vault (3-24 chars, kv-...).')
param keyVaultName string

@description('Principal ID of the managed identity to grant Key Vault Secrets User.')
param principalId string

@description('Tenant ID for the Key Vault.')
param tenantId string = subscription().tenantId

@description('Tags applied to all resources.')
param tags object = {}

@description('PostgreSQL administrator password to store as a secret.')
@secure()
param postgresAdminPassword string

@description('Application auth/session signing secret (AUTH_SECRET).')
@secure()
param authSecret string

@description('OAuth (Google) client secret placeholder. Leave blank in dev; CI injects the real value.')
@secure()
param oauthGoogleClientSecret string = ''

@description('OAuth (GitHub) client secret placeholder. Leave blank in dev; CI injects the real value.')
@secure()
param oauthGithubClientSecret string = ''

// Key Vault Secrets User role definition ID (built-in).
var secretsUserRoleDefinitionId = '4633458b-17de-408a-b874-0445c86b69e6'

// Secret names (referenced by the Container App as Key Vault secret references).
var postgresPasswordSecretName = 'postgres-admin-password'
var authSecretName = 'auth-secret'
var oauthGoogleSecretName = 'oauth-google-client-secret'
var oauthGithubSecretName = 'oauth-github-client-secret'

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    // RBAC authorization mode - no access policies, permissions via role assignments.
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource postgresPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: postgresPasswordSecretName
  properties: {
    value: postgresAdminPassword
  }
}

resource authSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: authSecretName
  properties: {
    value: authSecret
  }
}

// OAuth secrets are created as placeholders (empty by default). CI updates the
// value out-of-band, or passes non-empty @secure() params at deploy time.
resource oauthGoogleSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: oauthGoogleSecretName
  properties: {
    value: oauthGoogleClientSecret
  }
}

resource oauthGithubSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: oauthGithubSecretName
  properties: {
    value: oauthGithubClientSecret
  }
}

resource secretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, principalId, secretsUserRoleDefinitionId)
  scope: keyVault
  properties: {
    principalId: principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleDefinitionId)
  }
}

@description('Resource ID of the Key Vault.')
output id string = keyVault.id

@description('Name of the Key Vault.')
output name string = keyVault.name

@description('Key Vault base URI (https://<name>.vault.azure.net/).')
output vaultUri string = keyVault.properties.vaultUri

// These outputs are Key Vault *reference URIs* (not secret values); the values
// are resolved at runtime by the Container App via managed identity.
#disable-next-line outputs-should-not-contain-secrets
@description('Key Vault reference URI for the Postgres admin password.')
output postgresPasswordSecretUri string = '${keyVault.properties.vaultUri}secrets/${postgresPasswordSecretName}'

#disable-next-line outputs-should-not-contain-secrets
@description('Key Vault reference URI for AUTH_SECRET.')
output authSecretUri string = '${keyVault.properties.vaultUri}secrets/${authSecretName}'

#disable-next-line outputs-should-not-contain-secrets
@description('Key Vault reference URI for the Google OAuth client secret.')
output oauthGoogleSecretUri string = '${keyVault.properties.vaultUri}secrets/${oauthGoogleSecretName}'

#disable-next-line outputs-should-not-contain-secrets
@description('Key Vault reference URI for the GitHub OAuth client secret.')
output oauthGithubSecretUri string = '${keyVault.properties.vaultUri}secrets/${oauthGithubSecretName}'
