# Railway Deploy Shape

## Direction

This app should eventually deploy as part of the same Railway project shape as a Prism instance. The existing `../prism-railway-template` stack remains the parent Prism control plane foundation. This repo should be built so it can either be merged into that template or deployed as an additional parent service beside it.

The target is not a local-only prototype. Every major slice should be compatible with Railway from the start.

Current intended Railway project details are tracked in [current-railway-target.md](current-railway-target.md).

## Parent Control Plane Service

The parent service owns:

- tenant records
- user auth
- onboarding
- Railway provisioning
- scoped Codex sessions
- child service token registry
- billing and suspension
- audit logs

Railway requirements:

- health endpoint, probably `/api/health`
- build and start scripts suitable for Railway
- explicit `PORT` handling
- persistent storage plan for parent state if using SQLite
- environment variables documented in `.env.example`
- Railway service config through `railway.json` or equivalent template settings

If parent state uses SQLite, it needs a Railway volume. If parent state uses Postgres, the parent Prism deployment needs a shared Postgres service or Railway database plugin.

## Child Site Service

Each tenant child service owns:

- public docs or portfolio site
- SQLite content database on `/data/site.db`
- token-protected content API
- light chat widget
- health endpoint

Railway requirements:

- one service per tenant
- one persistent volume per child service
- no Railway API credentials in child services
- child write token injected as an env var
- parent base URL injected as an env var
- generated Railway domain stored in the parent tenant record

## Relationship To `prism-railway-template`

`../prism-railway-template` currently represents a full Prism stack with services such as:

- `site`
- `prism-memory`
- `codex-runtime`
- source adapter
- trigger/cron services

Tenant child sites should not duplicate that full stack. The parent Prism instance should use its existing Codex runtime to operate tenant child content through narrow child content APIs.

## Recommended First Deploy Slice

1. Build a minimal parent service with `/api/health`.
2. Deploy it to Railway as an extra service or experimental replacement for the Prism `site` service.
3. Build a minimal child service template with `/health` and SQLite volume support.
4. Manually create one child Railway service from that template.
5. Have the parent call the child content API and update one page.
6. Add Codex/scoped chat only after the parent-to-child write path is proven.

This keeps the deployment surface honest while avoiding a large first implementation.
