# Pokedeck — Azure Infrastructure (Bicep)

Infrastructure-as-Code for **Pokedeck**, an AI-assisted Pokémon TCG deck builder.
Everything is provisioned by a single **subscription-scoped** deployment that
creates the resource group and then deploys all resources into it.

## What gets deployed

| Resource | Type | Name pattern | Notes |
| --- | --- | --- | --- |
| Resource group | `Microsoft.Resources/resourceGroups` | `rg-<prefix>-<env>` | Created by `main.bicep` |
| Log Analytics | `Microsoft.OperationalInsights/workspaces` | `log-<prefix>-<env>` | PerGB2018 |
| Application Insights | `Microsoft.Insights/components` | `appi-<prefix>-<env>` | Workspace-based |
| Managed identity | `Microsoft.ManagedIdentity/userAssignedIdentities` | `id-<prefix>-<env>` | ACR pull + KV + Foundry auth |
| Container Registry | `Microsoft.ContainerRegistry/registries` | `cr<prefix><token>` | Basic, **admin disabled** (RBAC) |
| Key Vault | `Microsoft.KeyVault/vaults` | `kv-<prefix><token>` | **RBAC mode**, holds app secrets |
| PostgreSQL Flexible Server | `Microsoft.DBforPostgreSQL/flexibleServers` | `psql-<prefix>-<env>-<token>` | PG16, B1ms, SSL required, Entra auth |
| Container Apps env | `Microsoft.App/managedEnvironments` | `cae-<prefix>-<env>` | Wired to Log Analytics |
| Container App (API) | `Microsoft.App/containerApps` | `ca-api-<prefix>-<env>` | External ingress :3000, 1–3 replicas |
| Static Web App | `Microsoft.Web/staticSites` | `stapp-<prefix>-<env>-<token>` | Standard SKU (frontend) |
| AI Foundry account | `Microsoft.CognitiveServices/accounts` (AIServices) | `ai-<prefix>-<env>-<token>` | + project + model deployment |

`<token>` is a deterministic `uniqueString(subscription().id, namePrefix, environmentName)`
used only where a globally-unique name is required (ACR, Key Vault, Postgres, SWA, AI Foundry).

## RBAC assignments (all granted to the user-assigned managed identity)

| Role | Scope | Why |
| --- | --- | --- |
| **AcrPull** | Container Registry | Container App pulls its image without registry credentials |
| **Key Vault Secrets User** | Key Vault | Container App reads secret references at runtime |
| **Azure AI Developer** | AI Foundry account | App uses Foundry project / agents |
| **Cognitive Services OpenAI User** | AI Foundry account | App calls model deployments |

No credentials or API keys are stored in code — all service-to-service auth uses the
managed identity. The **only** secrets that exist are in Key Vault (Postgres password,
`AUTH_SECRET`, OAuth client secrets), and they are supplied via `@secure()` parameters.

## Files

```
infra/
  main.bicep              # targetScope=subscription: creates RG, deploys resources.bicep
  resources.bicep         # targetScope=resourceGroup: wires all modules + outputs
  main.parameters.json    # dev defaults + secret placeholders
  abbreviations.json      # CAF resource-name abbreviations
  README.md
  modules/
    monitoring.bicep      # Log Analytics + Application Insights
    identity.bicep        # user-assigned managed identity
    registry.bicep        # ACR + AcrPull role assignment
    keyvault.bicep        # Key Vault + secrets + Secrets User role assignment
    postgres.bicep        # PostgreSQL Flexible Server + db + firewall + SSL + Entra admin
    foundry.bicep         # AIServices account + project + model deployment + roles
    containerapp.bicep    # Container Apps environment + API Container App
    staticwebapp.bicep    # Static Web App
```

## Parameters (main.bicep)

| Param | Default | Description |
| --- | --- | --- |
| `location` | `centralus` | Region for RG and all resources |
| `namePrefix` | `pokedeck` | Prefix for resource names (2–12 chars) |
| `environmentName` | `dev` | Short env name (2–8 chars) |
| `resourceGroupName` | `''` | Override; defaults to `rg-<prefix>-<env>` |
| `tags` | `{application, environment}` | Applied to every resource |
| `postgresAdminLogin` | `pokedeckadmin` | SQL admin login |
| `postgresAdminPassword` | — (**required, @secure**) | SQL admin password; stored in Key Vault |
| `entraAdminObjectId` | `''` | Optional Postgres Entra admin (object ID) |
| `entraAdminName` | `''` | UPN/display name for the Entra admin |
| `authSecret` | — (**required, @secure**) | App session/signing secret |
| `oauthGoogleClientSecret` | `''` (@secure) | OAuth secret placeholder |
| `oauthGithubClientSecret` | `''` (@secure) | OAuth secret placeholder |
| `apiContainerImage` | `mcr.microsoft.com/k8se/quickstart:latest` | Placeholder image; CD pushes the real one |
| `foundryModelDeploymentName` | `gpt-4o` | Deployment name apps target |
| `foundryModelName` | `gpt-4o` | Model to deploy |
| `foundryModelVersion` | `''` | Blank = service default version |
| `foundryDeploymentCapacity` | `20` | Capacity (thousands of TPM) |

## Outputs

`resourceGroupName`, `containerAppFqdn`, `containerAppUrl`,
`staticWebAppDefaultHostname`, `acrLoginServer`, `postgresHost`,
`postgresDatabaseName`, `foundryProjectEndpoint`, `managedIdentityClientId`,
`keyVaultName`.

> The Postgres admin password is intentionally **not** an output — it lives only in Key Vault.

## Deploy

Validate:

```bash
az bicep build --file infra/main.bicep
```

Deploy to **centralus** (subscription scope). Secrets are passed on the command line
(from your secret store), never committed:

```bash
az deployment sub create \
  --name pokedeck-dev \
  --location centralus \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters postgresAdminPassword="$POSTGRES_ADMIN_PASSWORD" \
               authSecret="$AUTH_SECRET" \
               oauthGoogleClientSecret="$OAUTH_GOOGLE_CLIENT_SECRET" \
               oauthGithubClientSecret="$OAUTH_GITHUB_CLIENT_SECRET"
```

### How CI passes secrets

In GitHub Actions / Azure Pipelines, store the secrets as pipeline/environment
secrets and forward them as inline `--parameters` (they override the empty
placeholders in `main.parameters.json`). Example (GitHub Actions):

```yaml
- uses: azure/cli@v2
  with:
    inlineScript: |
      az deployment sub create \
        --name pokedeck-${{ github.run_number }} \
        --location centralus \
        --template-file infra/main.bicep \
        --parameters infra/main.parameters.json \
        --parameters postgresAdminPassword='${{ secrets.POSTGRES_ADMIN_PASSWORD }}' \
                     authSecret='${{ secrets.AUTH_SECRET }}' \
                     oauthGoogleClientSecret='${{ secrets.OAUTH_GOOGLE_CLIENT_SECRET }}' \
                     oauthGithubClientSecret='${{ secrets.OAUTH_GITHUB_CLIENT_SECRET }}'
```

## Post-deploy notes

- **Static Web App deployment token** (used by the frontend CD job):

  ```bash
  az staticwebapp secrets list --name <staticWebAppName> --query "properties.apiKey" -o tsv
  ```

- **Container App image**: the first deploy uses the quickstart placeholder. CD builds
  and pushes the real image to ACR, then updates the app:

  ```bash
  az containerapp update -n <ca-api-...> -g <rg-...> --image <acrLoginServer>/pokedeck-api:<tag>
  ```

- **Foundry auth**: the app authenticates to the Foundry project with the user-assigned
  managed identity (`AZURE_CLIENT_ID` is injected). No API key is stored.

- **DATABASE_URL**: the app composes it from `DATABASE_HOST/NAME/PORT/USER/SSL` (plain env)
  plus `DATABASE_PASSWORD` (a Key Vault secret reference). The password is never placed in
  a plain env var.
