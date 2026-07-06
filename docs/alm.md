# Pokedeck — ALM / CI-CD

This document describes how Pokedeck is built, tested, and deployed to Azure, and
how to bootstrap the passwordless (OIDC) authentication that the pipelines rely on.

- **Repo:** `leffuejk/Pokedeck`
- **Azure tenant:** `e66faeae-be94-4245-9959-d00be49078ee` (leffuejk@hotmail.com)
- **Azure subscription:** `16fd666c-8dbf-4cc7-b03d-3380cabc610e`
- **Region:** `centralus`
- **Runtime:** Node 22, TypeScript, npm workspaces monorepo

---

## 1. Branch strategy

Pokedeck uses **trunk-based development**:

- `main` is always deployable. It is a protected branch.
- All work happens on short-lived feature branches (`feat/...`, `fix/...`, `chore/...`).
- Changes land via **pull request into `main`**, reviewed per `.github/CODEOWNERS`.
- PRs are merged with **squash merge** — one commit per PR keeps `main` linear and
  makes the SHA that App CD deploys map 1:1 to a reviewed change.
- Direct pushes to `main` are disallowed; CI must be green before merge.

### Which workflow runs when

| Event | Workflow | Purpose |
| --- | --- | --- |
| PR opened / push to non-main branch | `ci.yml` | lint, typecheck, build, test, migration drift |
| PR touching `apps/web/**` | `pr-preview.yml` | ephemeral SWA preview environment |
| PR closed | `pr-preview.yml` | tear down the preview |
| Push to `main` touching `infra/**` | `infra-cd.yml` | deploy Bicep to `centralus` |
| Push to `main` touching `apps/**` or `packages/**` | `app-cd.yml` | build/push API image + migrate + deploy; build + deploy SPA |

All deploy workflows also support **`workflow_dispatch`** for manual runs.

---

## 2. How the three workflows chain on a fresh environment

Because the app pipeline needs infrastructure values (ACR login server, Container
App name, resource group) that only exist *after* infra is deployed, bring-up is a
**two-phase** process the first time:

1. **Bootstrap OIDC** (section 3). Create the app registration, service principal,
   role assignments, and federated credentials. Set the GitHub **variables** and
   **secrets** (sections 4–5).
2. **Deploy infrastructure.** Merge a change under `infra/**` to `main` (or run
   `infra-cd.yml` via *Run workflow*). It runs `az deployment sub create` against
   `centralus` and prints these outputs to the job summary:
   - `resourceGroupName`
   - `containerAppName`
   - `acrLoginServer`
   - `staticWebAppDefaultHostname`
   - `containerAppFqdn`
3. **Copy the infra outputs into GitHub config** (one-time):
   - `AZURE_RESOURCE_GROUP`  ← `resourceGroupName`
   - `CONTAINER_APP_NAME`    ← `containerAppName`
   - `ACR_LOGIN_SERVER`      ← `acrLoginServer`
   - `VITE_API_BASE`         ← `https://<containerAppFqdn>`
   Also grab the **SWA deployment token** from the newly created Static Web App and
   store it as the secret `AZURE_STATIC_WEB_APPS_API_TOKEN`
   (`az staticwebapp secrets list -n <swa-name> -g <rg> --query "properties.apiKey" -o tsv`).
4. **Deploy the apps.** Merge a change under `apps/**` / `packages/**` to `main` (or
   run `app-cd.yml`). The `api` job builds the Docker image, pushes it to ACR tagged
   with the git SHA, runs DB migrations against `DATABASE_URL`, then updates the
   Container App. The `web` job builds the SPA and deploys `apps/web/dist` to SWA.

After bootstrap, steps 2 and 4 happen automatically on every relevant push to `main`.
The infra outputs only need to be re-copied if the infra deployment *renames*
resources (it normally does not, since names are stable).

---

## 3. Bootstrap: OIDC app registration + federated credentials

Run these once, signed in as a user with rights to create app registrations and
assign roles on the subscription (`az login --tenant e66faeae-be94-4245-9959-d00be49078ee`).
These commands create a passwordless identity — **no client secret is ever created
or stored**. GitHub Actions exchanges a short-lived OIDC token for an Azure token.

```bash
# ---- variables -------------------------------------------------------------
TENANT_ID="e66faeae-be94-4245-9959-d00be49078ee"
SUBSCRIPTION_ID="16fd666c-8dbf-4cc7-b03d-3380cabc610e"
APP_NAME="pokedeck-github-oidc"
GH_ORG="leffuejk"
GH_REPO="Pokedeck"

az account set --subscription "$SUBSCRIPTION_ID"

# ---- 1. Create the app registration ---------------------------------------
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
echo "AZURE_CLIENT_ID = $APP_ID"

# ---- 2. Create the service principal for the app --------------------------
az ad sp create --id "$APP_ID"
SP_OBJECT_ID=$(az ad sp show --id "$APP_ID" --query id -o tsv)

# ---- 3. Role assignments on the subscription ------------------------------
# Contributor: create/deploy all resources.
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# User Access Administrator: needed because the Bicep assigns roles
# (e.g. Container App -> ACR pull) during a subscription-scope deployment.
az role assignment create \
  --assignee-object-id "$SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "User Access Administrator" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# ---- 4. Federated credentials (one per subject) ---------------------------
# 4a. Pull requests (lets CI/preview jobs use OIDC if needed).
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "pokedeck-github-pr",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:leffuejk/Pokedeck:pull_request",
  "description": "GitHub Actions OIDC for pull requests",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 4b. Pushes to the main branch (infra-cd + app-cd deploys).
az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "pokedeck-github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:leffuejk/Pokedeck:ref:refs/heads/main",
  "description": "GitHub Actions OIDC for pushes to main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

> If deploy jobs use a GitHub **Environment** named `production`, also add a
> federated credential with subject
> `repo:leffuejk/Pokedeck:environment:production`. The current workflows request
> the `production` environment; add this subject if you enforce environment
> protection rules that change the OIDC subject claim.

After this, set repo variables `AZURE_CLIENT_ID` (= `$APP_ID`),
`AZURE_TENANT_ID` (= `$TENANT_ID`), and `AZURE_SUBSCRIPTION_ID` (= `$SUBSCRIPTION_ID`).

### Setting the GitHub config via CLI (optional)

```bash
gh variable set AZURE_CLIENT_ID       --repo leffuejk/Pokedeck --body "$APP_ID"
gh variable set AZURE_TENANT_ID       --repo leffuejk/Pokedeck --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --repo leffuejk/Pokedeck --body "$SUBSCRIPTION_ID"
# ...then AZURE_RESOURCE_GROUP / CONTAINER_APP_NAME / ACR_LOGIN_SERVER / VITE_API_BASE
# after the first infra deploy (section 2).
gh secret   set DATABASE_URL --repo leffuejk/Pokedeck
```

---

## 4. Required GitHub repository variables

Set under **Settings → Secrets and variables → Actions → Variables**. Variables are
non-sensitive and are safe to expose in logs.

| # | Variable | Value / source | Used by |
| --- | --- | --- | --- |
| 1 | `AZURE_CLIENT_ID` | App registration `appId` from section 3 | infra-cd, app-cd |
| 2 | `AZURE_TENANT_ID` | `e66faeae-be94-4245-9959-d00be49078ee` | infra-cd, app-cd |
| 3 | `AZURE_SUBSCRIPTION_ID` | `16fd666c-8dbf-4cc7-b03d-3380cabc610e` | infra-cd, app-cd |
| 4 | `AZURE_RESOURCE_GROUP` | infra output `resourceGroupName` | app-cd (api) |
| 5 | `ACR_LOGIN_SERVER` | infra output `acrLoginServer` (e.g. `pokedeckacr.azurecr.io`) | app-cd (api) |
| 6 | `CONTAINER_APP_NAME` | infra output `containerAppName` | app-cd (api) |
| 7 | `VITE_API_BASE` | `https://<containerAppFqdn>` from infra output | app-cd (web), pr-preview |

---

## 5. Required GitHub repository secrets

Set under **Settings → Secrets and variables → Actions → Secrets**. These are
sensitive and are masked in logs.

| # | Secret | Value / source | Used by |
| --- | --- | --- | --- |
| 1 | `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA deployment token (`az staticwebapp secrets list`) | app-cd (web), pr-preview |
| 2 | `DATABASE_URL` | Production Postgres connection string | app-cd (api) migrations |
| 3 | `AUTH_SECRET` | App session/JWT signing secret | api runtime (Container App env) |
| 4 | `POKEMONTCG_API_KEY` | pokemontcg.io API key | api runtime (Container App env) |
| 5 | `OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret (if Google login enabled) | api runtime |
| 6 | `OAUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth client secret (if GitHub login enabled) | api runtime |

> **Note on OIDC:** there is deliberately **no** `AZURE_CLIENT_SECRET`. Azure auth is
> fully passwordless via federated credentials.
>
> **Note on runtime secrets (3–6):** these are consumed by the API *at runtime*, not
> by the build. Set them as Container App secrets/env vars (via Bicep parameters or
> `az containerapp secret set`). They are listed here because a human must provision
> them for the app to actually work end-to-end.

---

## 6. Local development quick reference

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run test

# database (apps/api)
npm run db:generate --workspace apps/api   # regenerate drizzle migrations after schema change
npm run db:migrate  --workspace apps/api    # apply migrations to DATABASE_URL
```

CI fails if `db:generate` produces uncommitted changes — always regenerate and commit
migrations in the same PR as the schema change.
