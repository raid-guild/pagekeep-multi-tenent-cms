# PageKeep Spec

## Overview

This spec defines PageKeep, a Prism-powered SaaS app that lets a user create and manage isolated docs or portfolio sites. The parent app owns users, tenants, Railway provisioning, billing, scoped chat sessions, and operational state. Each tenant gets a lightweight Railway child service that serves the public site, owns its content store, and exposes a narrow content API for scoped updates.

The v1 direction is intentionally not GitHub-per-tenant. Tenant content lives in the child service's own SQLite database on a Railway volume. GitHub export/eject can be added later as a backup, migration, or customer handoff path.

---

## Architecture

```text
Parent Prism SaaS Control Plane
  ../prism-railway-template
  - user auth and tenant records
  - onboarding and billing
  - Railway API integration
  - Codex runtime and scoped chat sessions
  - tenant/service token registry
  - audit logs and admin dashboard

          creates/manages
                |
                v

Child Railway Site Service per Tenant
  lightweight Next.js docs/portfolio app
  - public site
  - light chat widget
  - local SQLite content store on Railway volume
  - narrow content API
  - runtime content rendering and cache invalidation
```

The parent Prism stack is the control plane. It should not be duplicated per tenant. Child services are small, isolated site runtimes created from a canonical child template.

---

## 1. Prism Concept Mapping

| SaaS concept | Prism equivalent |
|---|---|
| Tenant signup | Parent workflow: `tenant-onboard` |
| Site provisioning | Railway service creation from the canonical child template |
| Tenant isolation | One Railway service and one SQLite volume per tenant |
| Admin chat | Parent Prism chat session scoped to one `tenant_id` and one child service |
| Content management | Parent agent calls the child service content API with a tenant-scoped service token |
| Public site | Child Next.js service rendering SQLite-backed docs/portfolio content |
| Chat widget | Embedded child widget that routes to the parent Prism control plane |
| Billing/subscription | Stripe webhook triggers parent workflow to enable, suspend, or disable child service |
| Export/eject | Future job that exports SQLite content to Nextra-compatible MDX or a GitHub repo |

---

## 2. Account Creation

### 2.1 Sign-Up Flow

- Tenant admin visits the parent onboarding portal and selects **Create New Site**.
- Admin provides organization/site name, admin name, email, password, and initial template type.
- Email verification is sent with a confirmation link that expires after 24 hours.
- On confirmation, the parent app creates a tenant record with status `provisioning`.
- The `tenant-onboard` workflow provisions the child Railway service, injects scoped env vars, waits for health, seeds initial content, and marks the tenant `active`.

### 2.2 Tenant Record

| Field | Type | Description |
|---|---|---|
| `tenant_id` | UUID | Unique tenant identifier |
| `org_name` | string | Organization display name |
| `site_name` | string | Public site display name |
| `admin_user_id` | UUID | Primary admin user reference |
| `status` | enum | `provisioning` -> `active` -> `suspended` -> `deactivated` |
| `template_key` | string | Selected child template, such as `docs-site` or `portfolio-site` |
| `railway_project_id` | string | Railway project containing the child service |
| `railway_environment_id` | string | Railway environment for the child service |
| `railway_service_id` | string | Railway service ID for the child site |
| `service_url` | string | Railway public URL or mapped custom domain |
| `child_content_token_ref` | string | Secret reference for the child content API token |
| `codex_session_id` | string | Current or latest scoped Codex session for this tenant |
| `created_at` | timestamp | Account creation time |
| `onboarding_completed_at` | timestamp | When onboarding checklist was finished |

Secrets should not be stored directly in ordinary tenant rows. Store secret values in a secrets table, Railway variables, or another controlled secret store and reference them by ID.

---

## 3. Key Design Decisions

### 3.1 Tenant Isolation Model

**Recommendation: one Railway service per tenant for v1.**

This gives each tenant an isolated runtime, isolated volume, isolated service URL, and a simple operational boundary. It is more expensive than a multi-tenant renderer, but it reduces cross-tenant blast radius and keeps the parent control plane simple.

Future scale options:

- Keep per-service isolation for premium managed sites.
- Move low-tier tenants to a shared renderer if service count or cost becomes the bottleneck.
- Add archive/sleep behavior for inactive tenants.

### 3.2 Child Content Storage

**Recommendation: SQLite in the child service for v1.**

Each child service owns a SQLite database on a Railway volume. The child app reads and writes local content through a small internal API. This avoids requiring Postgres per tenant and avoids rebuilding for every content change.

Core tables:

| Table | Purpose |
|---|---|
| `site_config` | Site title, theme, navigation settings, chat/widget settings |
| `pages` | Docs pages, portfolio pages, slugs, status, ordering, Markdown/MDX body |
| `assets` | Uploaded images/files and metadata |
| `revisions` | Version history for page/config changes |
| `audit_events` | Child-local write log for content changes |

Normal content edits should be runtime writes followed by cache invalidation, not full rebuilds.

### 3.3 Nextra vs Custom Runtime

Nextra is a good reference point for docs UX and an excellent export target because it is simple, MDX-based, and portable. For v1, however, the live child app should probably be a lightweight Next.js docs/portfolio runtime rather than a pure Nextra filesystem site.

Reasoning:

- Nextra is strongest when content is filesystem MDX.
- v1 content lives in SQLite to support instant updates and avoid rebuilds.
- A small custom renderer can store Markdown/MDX in SQLite, render at request time or with ISR, and revalidate paths after writes.
- Export/eject can generate Nextra-compatible MDX files later.

Treat Nextra as:

- design inspiration for docs layout, search, navigation, and MDX conventions
- a future export format
- a possible static/ejected deployment mode

Do not require Nextra as the live CMS runtime in v1.

### 3.4 Payload CMS

Payload CMS is not recommended for the first slice. It supports SQLite, but it brings a larger CMS/admin stack, schema/migration surface, media assumptions, and operational weight that v1 does not need.

Payload becomes worth reconsidering if tenants need:

- rich human editor workflows
- drafts, approvals, and live preview
- fine-grained CMS roles
- broader content modeling
- a full admin UI maintained by an existing CMS framework

### 3.5 Scoped Admin Chat

Admin chat lives in the parent Prism control plane. The child site may embed a light chat widget, but widget messages should route to the parent. The parent resolves the tenant from the child service/domain, resumes or creates a tenant-scoped Codex session, and gives that session access only to the child service's narrow content API.

Required scope fields:

| Field | Purpose |
|---|---|
| `tenant_id` | Tenant boundary for all parent records |
| `railway_service_id` | Child service boundary for Railway operations |
| `child_base_url` | Destination for content API calls |
| `child_content_token` | Secret token scoped to that one child service |
| `codex_session_id` | Durable scoped chat context |
| `allowed_capabilities` | Explicit list of content operations allowed for the session |

The agent should never receive broad Railway or parent-admin credentials when a narrow child content token is enough.

---

## 4. Child Template System

### 4.1 Template Types

```json
{
  "docs-site": {
    "description": "Docs and knowledge base site with Markdown/MDX pages, nav, search, and chat widget.",
    "features": ["pages", "nav", "search", "chat-widget", "assets"]
  },
  "portfolio-site": {
    "description": "Portfolio or lightweight marketing site with structured sections and case studies.",
    "features": ["site-config", "sections", "projects", "assets", "chat-widget"]
  }
}
```

Both template types should use the same child runtime where possible. The template key controls seed content, default layout, theme presets, and enabled content types.

### 4.2 Child Service Responsibilities

- Serve the public docs or portfolio site.
- Store content in local SQLite on a Railway volume.
- Expose a narrow token-protected content API.
- Render Markdown/MDX content at runtime or through ISR.
- Revalidate changed pages after writes.
- Expose `/health` for provisioning checks.
- Expose `/api/site/manifest` for parent introspection.
- Embed a chat widget that routes messages to the parent Prism control plane.

### 4.3 Canonical Child Template Source

The child services should be created from one canonical child template source, not from the full `../prism-railway-template` stack.

The full Prism Railway template remains the parent control plane. It includes services such as `site`, `prism-memory`, `codex-runtime`, adapters, and crons. A tenant child service should be much smaller and should not run its own Prism memory, Codex runtime, source adapters, or cron stack unless a future product tier explicitly needs that.

---

## 5. Railway Provisioning

### 5.1 Provisioning Steps

1. **Create tenant record** in the parent DB with status `provisioning`.
2. **Generate child content token** and store it as a secret.
3. **Create Railway service** from the canonical child template source.
4. **Attach or configure persistent volume** for child SQLite data.
5. **Set child variables**, including:
   - `TENANT_ID`
   - `SITE_NAME`
   - `TEMPLATE_KEY`
   - `DATABASE_URL=file:/data/site.db`
   - `CHILD_CONTENT_TOKEN`
   - `PARENT_PRISM_BASE_URL`
   - `CHAT_WIDGET_ENABLED=true`
6. **Create Railway domain** for the child service.
7. **Deploy service** and poll `/health`.
8. **Seed initial content** through the child content API.
9. **Store Railway IDs and service URL** in the tenant record.
10. **Mark tenant active** when health and seed checks pass.

### 5.2 Railway API Notes

Railway source connection, variables, domains, volumes, and deployments are distinct API operations. Do not model source connection as generic `RAILWAY_REPO_URL` or `RAILWAY_REPO_BRANCH` variables.

Token choice needs to be explicit:

- Project tokens are scoped to one project/environment and use Railway's project-token auth path.
- Workspace or account tokens may be needed if the parent app creates services or projects beyond the scope of a single project token.
- The parent control plane should keep Railway credentials private. Child services do not need Railway API credentials for normal content changes.

### 5.3 Failure Handling

- If provisioning fails before service creation, mark tenant `provisioning_failed`.
- If service creation succeeds but health fails, keep Railway IDs and surface logs/retry controls.
- Retry should be idempotent: reuse the existing child service when possible.
- On partial failure, do not leak child content tokens in logs or user-facing errors.
- Parent audit logs should record each provisioning step and failure reason.

---

## 6. Child Content API

The child API is the mutation boundary for tenant content. Every write validates `CHILD_CONTENT_TOKEN` and should be scoped to the single child service.

### 6.1 Suggested Endpoints

```text
GET /health
GET /api/site/manifest
GET /api/content/pages
GET /api/content/pages/{slug}
POST /api/content/pages
PATCH /api/content/pages/{id}
DELETE /api/content/pages/{id}
POST /api/content/nav
PATCH /api/content/site-config
POST /api/content/assets
GET /api/content/revisions
POST /api/content/revisions/{id}/restore
POST /api/content/revalidate
```

### 6.2 Capability Scopes

| Capability | Allowed operations |
|---|---|
| `content:read` | Read pages, nav, config, assets |
| `content:write` | Create and update content |
| `content:delete` | Delete pages or assets |
| `assets:write` | Upload and assign media |
| `site:configure` | Theme, nav, metadata, chat settings |
| `revisions:restore` | Restore previous versions |

The parent should issue or select the narrowest capability set needed for each session or workflow.

---

## 7. Scoped Chat Flow

```text
1. User opens chat from parent admin or child widget.
2. Parent resolves tenant from authenticated user, domain, or widget token.
3. Parent loads tenant service metadata and allowed capabilities.
4. Parent starts/resumes a Codex session with tenant context.
5. Codex reads or writes content only through the child content API.
6. Child records revisions and audit events.
7. Parent records the high-level chat/action audit trail.
8. Child revalidates affected routes so changes appear without full rebuild.
```

The child widget should not expose child write tokens to the browser. Browser messages go to the parent. Parent-to-child content writes happen server-side.

---

## 8. Onboarding Checklist

After provisioning, the admin is guided through:

1. **Verify email** - Confirm the admin email address.
2. **Select site type** - Choose docs or portfolio.
3. **Name site** - Set title, tagline, and metadata.
4. **Choose theme** - Select an approved theme preset.
5. **Create first page** - Use the editor or chat to create homepage/docs content.
6. **Configure navigation** - Confirm page order and labels.
7. **Test chat** - Send a scoped chat request and verify it updates only this site.
8. **Publish** - Mark initial content live.

Each checklist item updates parent onboarding state. Child content changes should also create child revisions.

---

## 9. Parent API Surface

### 9.1 Tenant Provisioning API

```text
POST /api/tenants
  Body: { org_name, site_name, admin_email, admin_name, template_key }
  Response: { tenant_id, status: "provisioning" }

GET /api/tenants/{tenant_id}
  Response: { tenant_id, org_name, site_name, status, service_url, template_key, onboarding_completed_at }

POST /api/tenants/{tenant_id}/retry-provisioning
  Response: { tenant_id, status: "provisioning" }
```

### 9.2 Chat API

```text
POST /api/tenants/{tenant_id}/chat
  Body: { message, source: "admin" | "widget" }
  Response: { message_id, session_id, status }

GET /api/tenants/{tenant_id}/chat/sessions/{session_id}
  Response: { session, messages, latest_actions }
```

### 9.3 Tenant Operations API

```text
POST /api/tenants/{tenant_id}/suspend
POST /api/tenants/{tenant_id}/resume
POST /api/tenants/{tenant_id}/rotate-child-token
GET /api/tenants/{tenant_id}/railway/status
GET /api/tenants/{tenant_id}/audit-log
```

---

## 10. What Needs to Be Built

1. **Parent SaaS app foundation** - users, tenant records, auth, admin dashboard, onboarding state.
2. **Railway provisioning workflow** - create child service, volume, variables, domain, deploy, health check, seed.
3. **Child Next.js runtime** - docs/portfolio renderer, SQLite schema, migrations, content API, health route.
4. **Scoped chat routing** - parent chat endpoint that resolves tenant and constrains Codex to one child API.
5. **Tenant content skill/tooling** - Codex instructions or tools for `list_pages`, `upsert_page`, `update_nav`, `upload_asset`, and `revalidate`.
6. **Audit and revisions** - parent audit trail plus child content revision history.
7. **Billing integration** - Stripe webhook to suspend/resume child services.
8. **Export/eject job** - later feature that exports SQLite content to Nextra-compatible MDX or a GitHub repository.

---

## 11. Non-Functional Requirements

- **Provisioning time**: Child service should be active in under 3 minutes on the happy path.
- **Content update latency**: Normal text/page edits should appear within seconds, without a full rebuild.
- **Isolation**: Each tenant has a distinct Railway service, SQLite database, volume, content token, and chat scope.
- **Audit trail**: Parent chat/actions retained for at least 90 days; child content revisions retained according to plan limits.
- **Rate limiting**: Chat and content APIs rate-limited per tenant.
- **Token safety**: Child content tokens are never exposed to browsers or logged.
- **Recovery**: Child SQLite database can be exported or backed up from the Railway volume.

---

## 12. Cost Considerations

Railway per-service pricing may become expensive at higher tenant counts. The v1 per-service model is still useful because it buys operational isolation and simpler tenant boundaries.

Mitigations:

- Use small child runtimes with no per-tenant Postgres.
- Keep child services single-process where possible.
- Add sleep/archive behavior for inactive sites.
- Offer per-service isolation as a premium tier.
- Consider a shared renderer for low-tier tenants after the product shape is proven.

---

## 13. Out of Scope for v1

- GitHub repo per tenant.
- Full Payload CMS integration.
- Full Prism stack per tenant.
- Custom domains beyond basic Railway-generated domains.
- SSO/SAML.
- Multi-tenant shared renderer.
- Public export/eject UI.
- Per-tenant source adapters, Prism Memory, or Codex runtimes.
