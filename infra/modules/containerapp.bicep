// ---------------------------------------------------------------------------
// containerapp.bicep
// Azure Container Apps environment (wired to Log Analytics) + the API Container
// App. External ingress on port 3000, 1-3 replicas, system + user-assigned
// identity, ACR pull via the managed identity, and Key Vault secret references
// for the database password / AUTH_SECRET pulled with the same identity.
// ---------------------------------------------------------------------------

@description('Azure region for the Container Apps environment and app.')
param location string

@description('Name of the Container Apps environment (cae-...).')
param environmentName string

@description('Name of the API Container App (ca-api-...).')
param containerAppName string

@description('Container image to deploy. Defaults to the quickstart placeholder for the first deploy.')
param containerImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Resource ID of the user-assigned managed identity (ACR pull + Key Vault).')
param userAssignedIdentityId string

@description('Login server of the Azure Container Registry (e.g. crpokedeck.azurecr.io).')
param registryLoginServer string

@description('Customer ID (workspace GUID) of the Log Analytics workspace.')
param logAnalyticsCustomerId string

@description('Log Analytics shared key.')
@secure()
param logAnalyticsSharedKey string

@description('Application Insights connection string.')
param applicationInsightsConnectionString string

@description('Container port the API listens on.')
param targetPort int = 3000

@description('Minimum replica count.')
param minReplicas int = 1

@description('Maximum replica count.')
param maxReplicas int = 3

@description('NODE_ENV value.')
param nodeEnv string = 'production'

@description('Allowed browser origin (WEB_ORIGIN), e.g. the Static Web App URL.')
param webOrigin string = ''

// --- Database (non-secret parts as plain env; password via Key Vault ref) ---
@description('PostgreSQL host (FQDN).')
param databaseHost string

@description('PostgreSQL database name.')
param databaseName string

@description('PostgreSQL port.')
param databasePort int = 5432

@description('PostgreSQL user (admin login).')
param databaseUser string

// --- Key Vault secret references ---
@description('Key Vault secret URI for the database password.')
param databasePasswordSecretUri string

@description('Key Vault secret URI for AUTH_SECRET.')
param authSecretUri string

// --- Foundry (auth via managed identity - endpoint is not a secret) ---
@description('Foundry project endpoint.')
param foundryProjectEndpoint string

@description('Foundry model deployment name.')
param foundryModelDeployment string

@description('Tags applied to all resources.')
param tags object = {}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsCustomerId
        sharedKey: logAnalyticsSharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    // System-assigned for platform features + user-assigned for ACR/Key Vault.
    type: 'SystemAssigned, UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryLoginServer
          identity: userAssignedIdentityId
        }
      ]
      secrets: [
        {
          name: 'database-password'
          keyVaultUrl: databasePasswordSecretUri
          identity: userAssignedIdentityId
        }
        {
          name: 'auth-secret'
          keyVaultUrl: authSecretUri
          identity: userAssignedIdentityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV', value: nodeEnv }
            { name: 'PORT', value: string(targetPort) }
            { name: 'WEB_ORIGIN', value: webOrigin }
            { name: 'DATABASE_HOST', value: databaseHost }
            { name: 'DATABASE_NAME', value: databaseName }
            { name: 'DATABASE_PORT', value: string(databasePort) }
            { name: 'DATABASE_USER', value: databaseUser }
            { name: 'DATABASE_SSL', value: 'require' }
            // App composes DATABASE_URL from the parts above + the secret below.
            { name: 'DATABASE_PASSWORD', secretRef: 'database-password' }
            { name: 'AUTH_SECRET', secretRef: 'auth-secret' }
            // Foundry auth is via the managed identity (no key). Endpoint + the
            // client ID let the AI SDK acquire a token for the user-assigned MI.
            { name: 'AZURE_CLIENT_ID', value: reference(userAssignedIdentityId, '2023-01-31').clientId }
            { name: 'FOUNDRY_PROJECT_ENDPOINT', value: foundryProjectEndpoint }
            { name: 'FOUNDRY_MODEL_DEPLOYMENT', value: foundryModelDeployment }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

@description('Resource ID of the Container Apps environment.')
output environmentId string = environment.id

@description('Resource ID of the Container App.')
output containerAppId string = containerApp.id

@description('Fully-qualified domain name of the Container App ingress.')
output fqdn string = containerApp.properties.configuration.ingress.fqdn

@description('Public URL of the Container App.')
output url string = 'https://${containerApp.properties.configuration.ingress.fqdn}'

@description('System-assigned principal ID of the Container App.')
output systemAssignedPrincipalId string = containerApp.identity.principalId
