// ---------------------------------------------------------------------------
// resources.bicep  (resourceGroup scope)
// Deploys all Pokedeck resources into the resource group created by main.bicep.
// Wires modules together and produces the top-level outputs.
// ---------------------------------------------------------------------------

targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string

@description('Short name prefix for resources.')
param namePrefix string

@description('Short environment name (e.g. dev, prod).')
param environmentName string

@description('Deterministic token appended to globally-unique names.')
param resourceToken string

@description('Tags applied to all resources.')
param tags object = {}

// --- PostgreSQL ---
@description('PostgreSQL administrator login.')
param postgresAdminLogin string

@description('PostgreSQL administrator password.')
@secure()
param postgresAdminPassword string

@description('Object ID of an Entra principal to set as the PostgreSQL Entra administrator (optional).')
param entraAdminObjectId string = ''

@description('Display name/UPN of the Entra administrator (required when entraAdminObjectId is set).')
param entraAdminName string = ''

// --- Application secrets ---
@description('Application auth/session signing secret (AUTH_SECRET).')
@secure()
param authSecret string

@description('Google OAuth client secret placeholder.')
@secure()
param oauthGoogleClientSecret string = ''

@description('GitHub OAuth client secret placeholder.')
@secure()
param oauthGithubClientSecret string = ''

// --- Container App ---
@description('Container image for the API. Placeholder for the first deploy.')
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

// ---------------------------------------------------------------------------
// Names (CAF abbreviations). Globally-unique names include resourceToken.
// ---------------------------------------------------------------------------
var abbrs = loadJsonContent('abbreviations.json')

var logAnalyticsName = '${abbrs.operationalInsightsWorkspaces}${namePrefix}-${environmentName}'
var applicationInsightsName = '${abbrs.insightsComponents}${namePrefix}-${environmentName}'
var managedIdentityName = '${abbrs.managedIdentityUserAssignedIdentities}${namePrefix}-${environmentName}'
var registryName = replace('${abbrs.containerRegistryRegistries}${namePrefix}${resourceToken}', '-', '')
var keyVaultName = take('${abbrs.keyVaultVaults}${namePrefix}${resourceToken}', 24)
var postgresName = '${abbrs.dBforPostgreSQLFlexibleServers}${namePrefix}-${environmentName}-${resourceToken}'
var containerEnvName = '${abbrs.appManagedEnvironments}${namePrefix}-${environmentName}'
var apiContainerAppName = '${abbrs.appContainerApps}api-${namePrefix}-${environmentName}'
var staticWebAppName = '${abbrs.webStaticSites}${namePrefix}-${environmentName}-${resourceToken}'
var foundryAccountName = '${abbrs.cognitiveServicesAccounts}${namePrefix}-${environmentName}-${resourceToken}'
var foundryProjectName = '${namePrefix}-${environmentName}-project'

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    logAnalyticsName: logAnalyticsName
    applicationInsightsName: applicationInsightsName
    tags: tags
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    location: location
    managedIdentityName: managedIdentityName
    tags: tags
  }
}

module registry 'modules/registry.bicep' = {
  name: 'registry'
  params: {
    location: location
    registryName: registryName
    acrPullPrincipalId: identity.outputs.principalId
    tags: tags
  }
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyVault'
  params: {
    location: location
    keyVaultName: keyVaultName
    principalId: identity.outputs.principalId
    postgresAdminPassword: postgresAdminPassword
    authSecret: authSecret
    oauthGoogleClientSecret: oauthGoogleClientSecret
    oauthGithubClientSecret: oauthGithubClientSecret
    tags: tags
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    serverName: postgresName
    administratorLogin: postgresAdminLogin
    administratorPassword: postgresAdminPassword
    entraAdminObjectId: entraAdminObjectId
    entraAdminName: entraAdminName
    tags: tags
  }
}

module foundry 'modules/foundry.bicep' = {
  name: 'foundry'
  params: {
    location: location
    accountName: foundryAccountName
    projectName: foundryProjectName
    modelDeploymentName: foundryModelDeploymentName
    modelName: foundryModelName
    modelVersion: foundryModelVersion
    deploymentCapacity: foundryDeploymentCapacity
    aiPrincipalId: identity.outputs.principalId
    tags: tags
  }
}

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebApp'
  params: {
    location: location
    staticWebAppName: staticWebAppName
    apiUrl: containerApp.outputs.url
    tags: tags
  }
}

// Reference the workspace to obtain its shared key for the Container Apps env.
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: logAnalyticsName
  dependsOn: [
    monitoring
  ]
}

module containerApp 'modules/containerapp.bicep' = {
  name: 'containerApp'
  params: {
    location: location
    environmentName: containerEnvName
    containerAppName: apiContainerAppName
    containerImage: apiContainerImage
    userAssignedIdentityId: identity.outputs.id
    registryLoginServer: registry.outputs.loginServer
    logAnalyticsCustomerId: monitoring.outputs.logAnalyticsCustomerId
    logAnalyticsSharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    databaseHost: postgres.outputs.host
    databaseName: postgres.outputs.databaseName
    databasePort: postgres.outputs.port
    databaseUser: postgresAdminLogin
    databasePasswordSecretUri: keyVault.outputs.postgresPasswordSecretUri
    authSecretUri: keyVault.outputs.authSecretUri
    foundryProjectEndpoint: foundry.outputs.projectEndpoint
    foundryModelDeployment: foundry.outputs.modelDeploymentName
    tags: tags
  }
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

@description('FQDN of the API Container App.')
output containerAppFqdn string = containerApp.outputs.fqdn

@description('Public URL of the API Container App.')
output containerAppUrl string = containerApp.outputs.url

@description('Default hostname of the Static Web App.')
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname

@description('Login server of the container registry.')
output acrLoginServer string = registry.outputs.loginServer

@description('PostgreSQL host (FQDN).')
output postgresHost string = postgres.outputs.host

@description('PostgreSQL database name.')
output postgresDatabaseName string = postgres.outputs.databaseName

@description('Foundry project endpoint.')
output foundryProjectEndpoint string = foundry.outputs.projectEndpoint

@description('Client ID of the user-assigned managed identity.')
output managedIdentityClientId string = identity.outputs.clientId

@description('Name of the Key Vault.')
output keyVaultName string = keyVault.outputs.name
