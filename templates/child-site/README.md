# PageKeep Child Site Template

Lightweight Railway child service for tenant docs and portfolio sites.

The child service owns its content in SQLite on a Railway volume and exposes a narrow token-protected content API for the parent Prism control plane.

## Features

- Next.js public site
- SQLite content store
- seeded homepage on first migration
- docs layout
- portfolio layout presets:
  - `portfolio-classic`
  - `portfolio-editorial`
  - `portfolio-showcase`
- token-protected content API
- `/health`
- `/api/site/manifest`

## Local Development

```bash
npm install
cp .env.example .env.local
npm run migrate
npm run dev
```

Open:

- Site: `http://127.0.0.1:3200`
- Health: `http://127.0.0.1:3200/health`

## Content API

Use `Authorization: Bearer <CHILD_CONTENT_TOKEN>` or `X-Child-Content-Token`.

```bash
TOKEN=dev-child-token

curl http://127.0.0.1:3200/api/content/pages \
  -H "authorization: Bearer $TOKEN"

curl -X POST http://127.0.0.1:3200/api/content/pages \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "slug": "/about",
    "title": "About",
    "body": "# About\n\nThis page was created through the child content API.",
    "status": "published"
  }'

curl -X PATCH http://127.0.0.1:3200/api/content/site-config \
  -H "authorization: Bearer $TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "siteName": "Portfolio Demo",
    "tagline": "Selected work and notes.",
    "themeKey": "portfolio-editorial",
    "nav": [
      { "label": "Home", "slug": "/" },
      { "label": "About", "slug": "/about" }
    ]
  }'
```

## Railway Variables

```text
PORT=3200
NODE_ENV=production
TENANT_ID=<tenant uuid>
SITE_NAME=<site name>
TEMPLATE_KEY=docs-site
DATABASE_URL=file:/data/site.db
CHILD_CONTENT_TOKEN=<generated parent-side secret>
PARENT_PRISM_BASE_URL=<parent control-plane URL>
CHAT_WIDGET_ENABLED=true
```

Attach a Railway volume at `/data`.
