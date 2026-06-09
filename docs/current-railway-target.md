# Current Railway Target

The intended Prism Railway project is:

```text
Project ID: 91ce093b-1fed-44da-8dc2-ae88e0031d10
Environment ID: dbcd38e4-6d53-4129-88af-e431d2fd68f3
Referenced service ID: 7ca2a7b5-99d8-472e-8367-e61a0c873d3a
```

Source URL:

```text
https://railway.com/project/91ce093b-1fed-44da-8dc2-ae88e0031d10/service/7ca2a7b5-99d8-472e-8367-e61a0c873d3a/variables?environmentId=dbcd38e4-6d53-4129-88af-e431d2fd68f3
```

## Deployment Decision

Do not deploy this repo over the referenced service unless the intent is to replace that existing Prism service.

Recommended first deployment:

1. Keep this repo separate.
2. Create a new Railway service in project `91ce093b-1fed-44da-8dc2-ae88e0031d10`.
3. Deploy this repo to that new service.
4. Point it at the existing Prism/Codex services through env vars.
5. Merge or replace Prism services later only after the control-plane app is proven.

## Live Control Plane Service

This repo is now deployed as a separate service in the Prism Railway project:

```text
Service name: tenant-control-plane
Service ID: 43cd9e84-678e-47b3-97a8-99ff778fe56a
Public URL: https://tenant-control-plane-production.up.railway.app
Latest verified deployment ID: 68c1ffaf-7adf-482b-9aba-6529c1fd037e
Volume: tenant-control-plane-volume mounted at /data
```

Smoke checks passed:

```text
GET /api/health -> ok: true
GET / -> 200
POST /api/tenants -> created provisioning tenant
```

## Local CLI State

As of the first scaffold pass, this local repo is not linked to Railway:

```bash
railway status
```

originally returned:

```text
No linked project found.
```

The Railway CLI is installed locally. This repo is now linked to:

```text
Project: RaidGuild Playground
Environment: production
Service: tenant-control-plane
```

## Link Command

After authenticating Railway locally, link this repo to the target project/environment if needed:

```bash
railway link \
  --project 91ce093b-1fed-44da-8dc2-ae88e0031d10 \
  --environment dbcd38e4-6d53-4129-88af-e431d2fd68f3
```

Then confirm:

```bash
railway status
```

## Parent Service Variables

Current parent service variables include:

```text
PORT=3100
NODE_ENV=production
CONTROL_PLANE_DATABASE_URL=file:/data/control-plane.db
NEXT_PUBLIC_APP_BASE_URL=https://tenant-control-plane-production.up.railway.app
RAILWAY_PROJECT_ID=91ce093b-1fed-44da-8dc2-ae88e0031d10
RAILWAY_ENVIRONMENT_ID=dbcd38e4-6d53-4129-88af-e431d2fd68f3
PRISM_HOOK_BASE_URL=<Prism site base URL>
PRISM_HOOK_KEY=tenant-provision-requested
PRISM_HOOK_SERVICE_TOKEN=<same internal service token expected by Prism site>
```

Attach a persistent volume at `/data` before relying on SQLite parent state.

Railway provisioning credentials can remain on `codex-runtime`. PageKeep should call the Prism hook `tenant-provision-requested`; the hook creates a workflow-backed request that invokes the `tenant-child-provisioner` skill through codex-runtime.

Do not inject Railway credentials into tenant child services.
