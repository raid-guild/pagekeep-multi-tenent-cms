# Implementation Checklist

This checklist turns the tenant site control plane spec into buildable slices. Keep each slice small enough to test end to end.

## Phase 0: Repo And Project Setup

- [ ] Choose parent app framework and package manager.
- [x] Add base app scaffold.
- [x] Add typecheck and build scripts.
- [ ] Add lint script.
- [x] Add `.env.example` with parent control-plane variables.
- [ ] Add Railway deploy files for the parent Prism instance:
  - [x] `railway.json`
  - [x] Dockerfile or Railpack-compatible build/start scripts
  - [x] health endpoint
  - [x] persistent volume path plan
- [ ] Decide where the canonical child template will live:
  - [ ] same repo under `templates/child-site`
  - [ ] separate sibling repo
  - [ ] package/workspace inside the parent monorepo
- [x] Document local dev flow for parent.
- [ ] Document local dev flow for child.
- [x] Document Railway deploy flow for parent service.
- [ ] Document Railway deploy flow for child services.

## Phase 1: Parent Control Plane Core

- [ ] Implement user auth.
- [x] Create tenant data model.
- [x] Create tenant dashboard shell.
- [ ] Add tenant lifecycle statuses:
  - [ ] `provisioning`
  - [ ] `active`
  - [ ] `suspended`
  - [ ] `deactivated`
  - [ ] `provisioning_failed`
- [x] Store Railway metadata per tenant:
  - [x] project ID
  - [x] environment ID
  - [x] service ID
  - [x] public service URL
- [x] Store child content token references without exposing raw secrets in normal tenant records.
- [x] Add parent audit log table.

## Phase 2: Child Site Runtime

- [x] Build lightweight Next.js child app.
- [x] Add `/health`.
- [x] Add SQLite database on `/data/site.db`.
- [x] Add migrations for:
  - [x] `site_config`
  - [x] `pages`
  - [x] `assets`
  - [x] `revisions`
  - [x] `audit_events`
- [x] Render docs pages from SQLite Markdown/MDX.
- [x] Render portfolio sections from SQLite-backed content.
- [x] Add navigation model.
- [x] Add basic theme presets.
- [ ] Add asset upload and serving path.
- [x] Add route revalidation or cache invalidation after writes.
- [x] Add `/api/site/manifest`.

## Phase 3: Child Content API

- [x] Add token validation for server-to-server writes.
- [ ] Add capability checks.
- [ ] Implement:
  - [x] `GET /api/content/pages`
  - [x] `GET /api/content/pages/{id}`
  - [x] `POST /api/content/pages`
  - [x] `PATCH /api/content/pages/{id}`
  - [x] `DELETE /api/content/pages/{id}`
  - [x] `POST /api/content/nav`
  - [x] `PATCH /api/content/site-config`
  - [ ] `POST /api/content/assets`
  - [ ] `GET /api/content/revisions`
  - [ ] `POST /api/content/revisions/{id}/restore`
  - [x] `POST /api/content/revalidate`
- [x] Record child audit event for every mutation.
- [x] Record revision before every page/config write.
- [ ] Add API tests for tenant token rejection and allowed writes.

## Phase 4: Railway Provisioning

- [x] Decide Railway credential type for parent provisioning.
- [ ] Configure parent `PRISM_HOOK_BASE_URL`.
- [ ] Configure parent `PRISM_HOOK_SERVICE_TOKEN`.
- [x] Scaffold Prism hook trigger endpoint.
- [ ] Implement deterministic provisioning runner in codex-runtime or a hosted skill.
- [ ] Create child content token generator.
- [ ] Create tenant provisioning workflow:
  - [ ] create tenant record
  - [ ] create Railway service from child template source
  - [ ] attach/configure persistent volume
  - [ ] set service variables
  - [ ] create Railway domain
  - [ ] deploy service
  - [ ] poll `/health`
  - [ ] seed initial content through child API
  - [ ] mark tenant `active`
- [ ] Make retry idempotent.
- [ ] Surface provisioning logs/status in parent admin.
- [ ] Add failure cleanup or manual recovery path.

## Phase 5: Scoped Chat

- [ ] Add parent chat endpoint.
- [ ] Resolve tenant from parent admin session.
- [ ] Resolve tenant from child widget/domain.
- [ ] Create or resume tenant-scoped Codex session.
- [ ] Pass only child content API context into the session.
- [ ] Add tenant content skill/tooling instructions:
  - [ ] list pages
  - [ ] read page
  - [ ] upsert page
  - [ ] update nav
  - [ ] update site config
  - [ ] upload/assign asset
  - [ ] revalidate
- [ ] Add parent audit entries for chat actions.
- [ ] Add guardrails that prevent cross-tenant service or token access.

## Phase 6: Child Chat Widget

- [ ] Add embeddable widget to child site.
- [ ] Send browser messages to parent, not directly to child content API.
- [ ] Include tenant/widget identity without exposing write tokens.
- [ ] Show response stream or polling-based message updates.
- [ ] Add disabled/suspended tenant state.

## Phase 7: Onboarding UX

- [ ] Build create-site flow.
- [ ] Add template selector:
  - [ ] docs site
  - [ ] portfolio site
- [ ] Add onboarding checklist state.
- [ ] Add first content seed flow.
- [ ] Add test-chat checklist step.
- [ ] Add publish/complete step.

## Phase 8: Billing And Suspension

- [ ] Add Stripe customer/subscription mapping.
- [ ] Add webhook receiver.
- [ ] On subscription active, allow service creation/resume.
- [ ] On payment failure/cancel, suspend child service or disable writes.
- [ ] Reflect billing state in parent admin.

## Phase 9: Export And Backup

- [ ] Add child SQLite backup process.
- [ ] Add parent-triggered export job.
- [ ] Export pages/config/assets to portable archive.
- [ ] Export docs content to Nextra-compatible MDX.
- [ ] Add future GitHub eject path.

## Phase 10: Hardening

- [ ] Rate-limit parent chat API per tenant.
- [ ] Rate-limit child content API per token.
- [ ] Add token rotation.
- [ ] Add child API request logging without secrets.
- [ ] Add health/status checks in parent.
- [ ] Add smoke test for full tenant provisioning.
- [ ] Add smoke test for scoped chat content update.
- [ ] Add smoke test proving Tenant A cannot mutate Tenant B.

## Open Decisions

- [ ] Should the child template live inside this repo or as a sibling repo?
- [ ] Should parent provisioning create all child services in one Railway project or one project per tenant?
- [ ] What Railway token type is acceptable for automated service creation?
- [ ] Should this repo become a fork/extension of `../prism-railway-template` or a separate app that is later merged into that template?
- [ ] Which auth library should the parent SaaS use?
- [ ] Which SQLite library should the child runtime use?
- [ ] Should MDX rendering allow arbitrary React components, or only safe Markdown plus approved components?
- [ ] What is the first paid tier's service/resource limit?
