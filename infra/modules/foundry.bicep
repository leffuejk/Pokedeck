// ---------------------------------------------------------------------------
// foundry.bicep
// Azure AI Foundry: a Cognitive Services account of kind AIServices with a
// project (2025 AIServices/projects model) and a model deployment. Grants the
// managed identity "Azure AI Developer" and "Cognitive Services OpenAI User"
// at the account scope so it can call the models via RBAC (no API keys).
// ---------------------------------------------------------------------------

@description('Azure region for the AI Foundry account.')
param location string

@description('Globally-unique name of the AIServices account (ai-...).')
param accountName string

@description('Name of the Foundry project.')
param projectName string

@description('Display name for the Foundry project.')
param projectDisplayName string = 'Pokedeck'

@description('Model deployment name (also the name apps use to target the model).')
param modelDeploymentName string = 'gpt-4o'

@description('Model format/publisher.')
param modelFormat string = 'OpenAI'

@description('Model name to deploy.')
param modelName string = 'gpt-4o'

@description('Model version. Leave blank to let Azure pick the default for the model.')
param modelVersion string = ''

@description('Deployment SKU name (e.g. GlobalStandard, Standard, DataZoneStandard).')
param deploymentSkuName string = 'GlobalStandard'

@description('Deployment capacity (thousands of tokens-per-minute).')
param deploymentCapacity int = 20

@description('Principal ID of the managed identity to grant Foundry roles.')
param aiPrincipalId string

@description('Tags applied to all resources.')
param tags object = {}

// Built-in role definition IDs.
var aiDeveloperRoleId = '64702f94-c441-49e6-a78b-ef80e0188fee' // Azure AI Developer
var openAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd' // Cognitive Services OpenAI User

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: accountName
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // Custom subdomain is required for token-based (Entra) authentication and
    // to enable Foundry projects on the account.
    customSubDomainName: accountName
    // Enables the Foundry project management surface on this account.
    allowProjectManagement: true
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: false
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  parent: account
  name: projectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: projectDisplayName
    description: 'Pokedeck AI-assisted deck builder project.'
  }
}

resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: account
  name: modelDeploymentName
  sku: {
    name: deploymentSkuName
    capacity: deploymentCapacity
  }
  properties: {
    model: union(
      {
        format: modelFormat
        name: modelName
      },
      empty(modelVersion) ? {} : { version: modelVersion }
    )
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
    raiPolicyName: 'Microsoft.DefaultV2'
  }
}

resource aiDeveloperAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, aiPrincipalId, aiDeveloperRoleId)
  scope: account
  properties: {
    principalId: aiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', aiDeveloperRoleId)
  }
}

resource openAiUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(account.id, aiPrincipalId, openAiUserRoleId)
  scope: account
  properties: {
    principalId: aiPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', openAiUserRoleId)
  }
}

@description('Resource ID of the AIServices account.')
output accountId string = account.id

@description('Name of the AIServices account.')
output accountName string = account.name

@description('Account (Cognitive Services) endpoint.')
output accountEndpoint string = account.properties.endpoint

@description('Foundry project name.')
output projectName string = project.name

@description('Foundry project endpoint (used by the AI Projects SDK).')
output projectEndpoint string = '${account.properties.endpoint}api/projects/${project.name}'

@description('Deployed model deployment name.')
output modelDeploymentName string = modelDeployment.name
