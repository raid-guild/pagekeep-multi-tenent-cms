# PageKeep

Railway-ready parent control plane for managing isolated docs and portfolio child services.

PageKeep owns tenant records, Railway service metadata, scoped chat sessions, billing state, and child content API credentials. Child services are lightweight Next.js apps with their own SQLite content store on Railway volumes.

## Current Slice

Implemented:

- Next.js parent app scaffold
- Railway `railway.json`
- `/api/health`
- SQLite control-plane migrations
- tenant record create/list/read API skeleton
- local `.env.example`

Not implemented yet:

- Railway service creation
- child site runtime
- scoped Codex chat
- billing/suspension

## Local Development

```bash
npm install
cp .env.example .env.local
npm run migrate
npm run dev
```

Open:

- App: `http://127.0.0.1:3100`
- Health: `http://127.0.0.1:3100/api/health`

Create a test tenant:

```bash
curl -X POST http://127.0.0.1:3100/api/tenants \
  -H 'content-type: application/json' \
  -d '{
    "org_name": "Example Guild",
    "site_name": "Example Docs",
    "admin_email": "admin@example.com",
    "template_key": "docs-site"
  }'
```

## Railway Notes

The service is configured for Railpack through `railway.json`.

Current target project notes live in [docs/current-railway-target.md](docs/current-railway-target.md).

Recommended parent service variables:

```text
PORT=3100
NODE_ENV=production
CONTROL_PLANE_DATABASE_URL=file:/data/control-plane.db
NEXT_PUBLIC_APP_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
```

Attach a Railway volume at `/data` if using SQLite for parent state.

Future Railway provisioning credentials should be set only on the parent service. Child services should not receive Railway API credentials.

Provisioning is expected to flow through the Prism hook:

```text
POST /agent/hooks/tenant-provision-requested/trigger
```

PageKeep sends this request with `x-service-token`. The hook should invoke the `tenant-child-provisioner` skill through codex-runtime, where the Railway project token already lives.
