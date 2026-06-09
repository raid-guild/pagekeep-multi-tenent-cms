---
name: tenant-child-provisioner
description: Provision a PageKeep tenant child site in the existing Railway project using the canonical child template, deterministic service naming, Railway direct upload, health checks, and PageKeep provisioning callbacks.
---

# Tenant Child Provisioner

Provision one isolated PageKeep child site service for a tenant-control-plane hook payload.

## Non-Negotiable Behavior

- Use the canonical PageKeep child template from `raid-guild/pagekeep-multi-tenent-cms`, path `templates/child-site`.
- Do not generate an alternate Express/static fallback app.
- Do not use Railway GitHub source connection for this spike.
- Do not deploy from Prism's repo root.
- Do not deploy with `rootDirectory=templates/child-site`.
- Do not run `railway up .` unless the current directory is the child template directory and `--path-as-root` is still supplied.
- The only accepted deploy shape is a direct Railway upload of the child template:

```bash
railway up templates/child-site \
  --path-as-root \
  --service "$SERVICE_NAME" \
  --environment production \
  --detach \
  --yes \
  --json \
  --message "Provision PageKeep child site for tenant $TENANT_ID"
```

If the PageKeep repo or `templates/child-site/package.json` cannot be fetched, fail with `failedStep: "template-fetch"` and call the PageKeep failure callback. Do not create a different app.

## Required Inputs

Read inputs from `hook-payload.json` first. The payload must contain:

- `tenantId`
- `orgName`
- `siteName`
- `templateKey`
- `parentBaseUrl`
- `childContentToken`
- `railwayProjectId`
- `railwayEnvironmentId`

Valid `templateKey` values are `docs-site` and `portfolio-site`.

## Service Name

Compute:

```text
tenant-site-<tenantId slug>
```

Slugify `tenantId` by lowercasing, replacing non-alphanumeric runs with `-`, collapsing repeated `-`, trimming `-`, then taking the first 24 characters.

Example:

```text
5a48f5c4-271c-4e23-8b0b-7532702cc66c
tenant-site-5a48f5c4-271c-4e23-8b
```

Reuse an existing Railway service with this exact name. Never create duplicates.

## Railway Rules

- Use the target project and environment from the hook payload.
- Use the Railway project token already available to codex-runtime.
- Service creation requires a Railway token with permission to add services to the target project.
- Prefer `RAILWAY_API_TOKEN` when it is configured. Fall back to `RAILWAY_PROJECT_TOKEN` only if it can run `railway add`.
- Do not unset `RAILWAY_API_TOKEN` when creating services.
- Always pass explicit `--service`, `--environment`, and `--project` or linked project context.
- Never modify Prism services: `site`, `codex-runtime`, `prism-memory`, `discord-adapter`, `task-runner`, or `Queen-Raida`.
- Ensure the child service has a `/data` volume.

## Child Environment Variables

Set these on the child service before deploy:

```text
PORT=3200
NODE_ENV=production
TENANT_ID=<tenantId>
SITE_NAME=<siteName>
TEMPLATE_KEY=<templateKey>
DATABASE_URL=file:/data/site.db
CHILD_CONTENT_TOKEN=<childContentToken>
PARENT_PRISM_BASE_URL=<parentBaseUrl>
CHAT_WIDGET_ENABLED=true
```

Never print `CHILD_CONTENT_TOKEN` or Railway tokens.

## Template Fetch

Use a temporary directory:

```bash
WORKDIR="/tmp/pagekeep-child-$TENANT_ID"
rm -rf "$WORKDIR"
git clone --depth 1 https://github.com/raid-guild/pagekeep-multi-tenent-cms.git "$WORKDIR"
cd "$WORKDIR"
test -f templates/child-site/package.json
test -f templates/child-site/railway.json
```

If clone fails because the repo is private or unavailable, stop and callback failure:

```json
{
  "status": "provisioning_failed",
  "failedStep": "template-fetch",
  "error": "Could not fetch raid-guild/pagekeep-multi-tenent-cms templates/child-site from codex-runtime."
}
```

## Create Or Reuse Service

Check whether the computed service name already exists:

```bash
railway service list --json
```

If the service does not exist, create it with the Railway CLI:

```bash
railway add --service "$SERVICE_NAME" --json
```

Do not use `railway up` as the service creation step. `railway up --service "$SERVICE_NAME"` only deploys to an existing service; if the service does not exist it returns `Service not found`.

If service creation fails with `Not Authorized`, `Forbidden`, `Unauthorized`, or an equivalent permission error:

- Do not attempt deployment.
- Do not generate a fallback app.
- Callback PageKeep with:

```json
{
  "status": "provisioning_failed",
  "failedStep": "service-create",
  "error": "Railway token is not authorized to create services in the target project. Configure codex-runtime with a Railway token that can run railway add --service."
}
```

## Deploy

From the cloned PageKeep repo root, run exactly:

```bash
railway up templates/child-site \
  --path-as-root \
  --service "$SERVICE_NAME" \
  --environment production \
  --detach \
  --yes \
  --json \
  --message "Provision PageKeep child site for tenant $TENANT_ID"
```

Parse the returned `deploymentId`.

Do not start another deployment while that deployment is building.

Poll `railway deployment list --service "$SERVICE_NAME" --json` until that deployment becomes `SUCCESS` or `FAILED`. Timeout after 8 minutes.

If Railway reports `FAILED`, fetch recent logs, callback failure with `failedStep: "deploy"`, and include the `deploymentId`.

## Domain And Health

Ensure the service has a generated Railway public domain. Use the domain Railway reports for the service.

Poll:

```text
GET https://<child-domain>/health
```

until it returns JSON with `ok: true`. Timeout after 4 minutes.

## Initial Content

After health is green, seed content through the child content API with:

```text
Authorization: Bearer <childContentToken>
```

Use only endpoints that the deployed child exposes. If a non-critical seed endpoint returns 404, record it in the result but do not fail provisioning. The health check and callback are the critical completion gates.

## PageKeep Callback

Always callback PageKeep on success or failure when `tenantId` and `parentBaseUrl` are known.

Endpoint:

```text
POST <parentBaseUrl>/api/tenants/<tenantId>/provision/callback
```

Auth header:

```text
x-service-token: <callback token>
```

Find the callback token from the first configured environment variable in this order:

1. `PAGEKEEP_CALLBACK_TOKEN`
2. `PRISM_HOOK_SERVICE_TOKEN`
3. `INTERNAL_SERVICE_TOKEN`
4. `APP_API_SERVICE_TOKEN`
5. `TASK_RUNNER_TOKEN`

Never print the token.

Success payload:

```json
{
  "status": "active",
  "railwayServiceId": "<service id>",
  "railwayServiceName": "tenant-site-<slug>",
  "serviceUrl": "https://<child-domain>",
  "deploymentId": "<deployment id>"
}
```

Failure payload:

```json
{
  "status": "provisioning_failed",
  "error": "<error message>",
  "failedStep": "<step name>",
  "railwayServiceId": "<service id if known>",
  "railwayServiceName": "tenant-site-<slug>",
  "serviceUrl": "https://<child-domain if known>",
  "deploymentId": "<deployment id if known>"
}
```

Treat callback delivery as part of provisioning. If callback fails, return `ok: false` with `failedStep: "callback"`.

## Final Artifact

Write `tenant-child-provision-result.json` as a request artifact.

On success:

```json
{
  "ok": true,
  "tenantId": "<tenant id>",
  "railwayServiceId": "<service id>",
  "railwayServiceName": "tenant-site-<slug>",
  "serviceUrl": "https://<child-domain>",
  "deploymentId": "<deployment id>",
  "callback": "delivered"
}
```

On failure:

```json
{
  "ok": false,
  "tenantId": "<tenant id if known>",
  "failedStep": "<step name>",
  "error": "<error message>",
  "partial": {
    "railwayServiceId": "<service id if known>",
    "railwayServiceName": "tenant-site-<slug>",
    "serviceUrl": "https://<child-domain if known>",
    "deploymentId": "<deployment id if known>"
  },
  "callback": "delivered or failed"
}
```

Keep the final comment concise. Do not include secrets.
