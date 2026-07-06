// ---------------------------------------------------------------------------
// postgres.bicep
// Azure Database for PostgreSQL Flexible Server (Burstable B1ms for dev),
// PostgreSQL 16, a 'pokedeck' database, SSL enforced, Entra (AAD) auth enabled,
// plus a firewall rule allowing Azure services. The admin password is NOT
// stored here - it lives in Key Vault (see keyvault.bicep).
// ---------------------------------------------------------------------------

@description('Azure region for the PostgreSQL flexible server.')
param location string

@description('Name of the PostgreSQL flexible server (psql-...).')
param serverName string

@description('Name of the application database.')
param databaseName string = 'pokedeck'

@description('PostgreSQL major version.')
param postgresVersion string = '16'

@description('Compute tier / SKU name for the server.')
param skuName string = 'Standard_B1ms'

@description('Compute tier.')
@allowed([
  'Burstable'
  'GeneralPurpose'
  'MemoryOptimized'
])
param skuTier string = 'Burstable'

@description('Storage size in GB.')
param storageSizeGB int = 32

@description('Administrator login name (SQL auth).')
param administratorLogin string

@description('Administrator password (SQL auth). Also stored in Key Vault.')
@secure()
param administratorPassword string

@description('Tenant ID for Entra (Azure AD) authentication.')
param tenantId string = subscription().tenantId

@description('Object ID of an Entra principal to set as the PostgreSQL Entra administrator. Leave blank to skip.')
param entraAdminObjectId string = ''

@description('Display name/UPN of the Entra administrator. Required when entraAdminObjectId is set.')
param entraAdminName string = ''

@description('Principal type of the Entra administrator.')
@allowed([
  'User'
  'Group'
  'ServicePrincipal'
])
param entraAdminPrincipalType string = 'User'

@description('Tags applied to all resources.')
param tags object = {}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuTier
  }
  properties: {
    version: postgresVersion
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorPassword
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    authConfig: {
      // Both Entra and password auth enabled; Entra used by the managed identity.
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Enabled'
      tenantId: tenantId
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Allow other Azure services (e.g. the Container App) to reach the server.
// The 0.0.0.0 -> 0.0.0.0 special rule means "Allow Azure services".
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServicesAndResources'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Enforce SSL / TLS on connections.
resource requireSsl 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'require_secure_transport'
  properties: {
    value: 'ON'
    source: 'user-override'
  }
  dependsOn: [
    database
  ]
}

// Optional Entra administrator (only created when an object ID is supplied).
resource entraAdmin 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2024-08-01' = if (!empty(entraAdminObjectId)) {
  parent: postgres
  name: entraAdminObjectId
  properties: {
    principalName: entraAdminName
    principalType: entraAdminPrincipalType
    tenantId: tenantId
  }
  dependsOn: [
    requireSsl
  ]
}

@description('Fully-qualified domain name of the PostgreSQL server.')
output host string = postgres.properties.fullyQualifiedDomainName

@description('Name of the application database.')
output databaseName string = database.name

@description('PostgreSQL port.')
output port int = 5432

@description('Administrator login name.')
output administratorLogin string = administratorLogin

@description('Resource ID of the PostgreSQL flexible server.')
output id string = postgres.id
