// ---------------------------------------------------------------------------
// main.bicep  (subscription scope)
// Creates the Pokedeck resource group and deploys resources.bicep into it.
// azd / CI friendly: one subscription-scoped deployment provisions everything.
// ---------------------------------------------------------------------------

targetScope = 'subscription'

@description('Azure region for the resource group and all resources.')
param location string = 'centralus'

@description('Short name prefix for all resources.')
@minLength(2)
@maxLength(12)
param namePrefix string = 'pokedeck'

@description('Short environment name (e.g. dev, prod).')
@minLength(2)
@maxLength(8)
param environmentName string = 'dev'

@description('Optional explicit resource group name. Defaults to rg-<namePrefix>-<environmentName>.')
param resourceGroupName string = ''

@description('Tags applied to the resource group and all resources.')
param tags object = {
  application: 'pokedeck'
  environment: 'dev'
}

// --- PostgreSQL ---
@description('PostgreSQL administrator login.')
param postgresAdminLogin string = 'pokedeckadmin'

@description('PostgreSQL administrator password (also stored in Key Vault). Pass via CI, not in source control.')
@secure()
param postgresAdminPassword string

@description('Object ID of an Entra principal to set as the PostgreSQL Entra administrator (optional).')
param entraAdminObjectId string = ''

@description('Display name/UPN of the Entra administrator (required when entraAdminObjectId is set).')
param entraAdminName string = ''

// --- Application secrets ---
@description('Application auth/session signing secret (AUTH_SECRET). Pass via CI.')
@secure()
param authSecret string

@description('Google OAuth client secret placeholder. Optional; injected by CI.')
@secure()
param oauthGoogleClientSecret string = ''

@description('GitHub OAuth client secret placeholder. Optional; injected by CI.')
@secure()
param oauthGithubClientSecret string = ''

// --- Container App ---
@description('Container image for the API. Placeholder for the first deploy; real image pushed by CD.')
param apiContainerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

// --- Foundry ---
@description('Foundry model deployment name.')
param foundryModelDeploymentName string = 'gpt-4o'

@description('Foundry model name.')
param foundryModelName string = 'gpt-4o'

@description('Foundry model version (blank = service default).')
param foundryModelVersion string = ''

@description('Foundry model deployment capacity (thousands of TPM).')
param foundryDeploymentCapacity int = 20

// Deterministic suffix for globally-unique names (ACR, SWA, AI Services, KV).
var resourceToken = toLower(uniqueString(subscription().id, namePrefix, environmentName))
var rgName = empty(resourceGroupName) ? 'rg-${namePrefix}-${environmentName}' : resourceGroupName

// The resource group is created here. (In pure CI/azd setups the pipeline can
// instead pre-create the RG; if so, target resources.bicep at RG scope directly.)
resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'pokedeck-resources'
  scope: resourceGroup
  params: {
    location: location
    namePrefix: namePrefix
    environmentName: environmentName
    resourceToken: resourceToken
    tags: tags
    postgresAdminLogin: postgresAdminLogin
    postgresAdminPassword: postgresAdminPassword
    entraAdminObjectId: entraAdminObjectId
    entraAdminName: entraAdminName
    authSecret: authSecret
    oauthGoogleClientSecret: oauthGoogleClientSecret
    oauthGithubClientSecret: oauthGithubClientSecret
    apiContainerImage: apiContainerImage
    foundryModelDeploymentName: foundryModelDeploymentName
    foundryModelName: foundryModelName
    foundryModelVersion: foundryModelVersion
    foundryDeploymentCapacity: foundryDeploymentCapacity
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('Name of the resource group that was created.')
output resourceGroupName string = resourceGroup.name

@description('FQDN of the API Container App.')
output containerAppFqdn string = resources.outputs.containerAppFqdn

@description('Public URL of the API Container App.')
output containerAppUrl string = resources.outputs.containerAppUrl

@description('Default hostname of the Static Web App. Get its deployment token with: az staticwebapp secrets list -n <name> --query "properties.apiKey" -o tsv')
output staticWebAppDefaultHostname string = resources.outputs.staticWebAppDefaultHostname

@description('Login server of the container registry.')
output acrLoginServer string = resources.outputs.acrLoginServer

@description('PostgreSQL host (FQDN).')
output postgresHost string = resources.outputs.postgresHost

@description('PostgreSQL database name.')
output postgresDatabaseName string = resources.outputs.postgresDatabaseName

@description('Foundry project endpoint.')
output foundryProjectEndpoint string = resources.outputs.foundryProjectEndpoint

@description('Client ID of the user-assigned managed identity.')
output managedIdentityClientId string = resources.outputs.managedIdentityClientId

@description('Name of the Key Vault holding app secrets.')
output keyVaultName string = resources.outputs.keyVaultName
