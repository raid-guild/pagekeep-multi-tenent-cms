import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

export type PageStatus = "draft" | "published";

export type SiteConfig = {
  tenantId: string;
  siteName: string;
  tagline: string;
  themeKey: string;
  nav: Array<{ label: string; slug: string }>;
  chatWidgetEnabled: boolean;
  updatedAt: string;
};

export type PageRecord = {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: PageStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type PageRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

type SiteConfigRow = {
  tenant_id: string;
  site_name: string;
  tagline: string;
  theme_key: string;
  nav_json: string;
  chat_widget_enabled: number;
  updated_at: string;
};

type UpsertPageInput = {
  id?: string | null;
  slug: string;
  title: string;
  body: string;
  status?: PageStatus;
  sortOrder?: number;
};

type UpdateSiteConfigInput = {
  siteName?: string;
  tagline?: string;
  themeKey?: string;
  nav?: Array<{ label: string; slug: string }>;
  chatWidgetEnabled?: boolean;
};

function normalizeSlug(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function toPage(row: PageRow): PageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    status: row.status as PageStatus,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function parseNav(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const label = typeof record.label === "string" ? record.label : "";
        const slug = typeof record.slug === "string" ? record.slug : "";
        return label && slug ? { label, slug } : null;
      })
      .filter((item): item is { label: string; slug: string } => Boolean(item));
  } catch {
    return [];
  }
}

function recordRevision(entityType: string, entityId: string, snapshot: unknown) {
  getDb()
    .prepare(
      `INSERT INTO revisions (
        id, entity_type, entity_id, snapshot_json, created_at
      ) VALUES (
        @id, @entityType, @entityId, @snapshotJson, @createdAt
      )`,
    )
    .run({
      id: randomUUID(),
      entityType,
      entityId,
      snapshotJson: JSON.stringify(snapshot),
      createdAt: new Date().toISOString(),
    });
}

export function createAuditEvent(
  actionType: string,
  entityType: string,
  entityId: string | null,
  meta: Record<string, unknown> = {},
) {
  getDb()
    .prepare(
      `INSERT INTO audit_events (
        id, action_type, entity_type, entity_id, meta_json, created_at
      ) VALUES (
        @id, @actionType, @entityType, @entityId, @metaJson, @createdAt
      )`,
    )
    .run({
      id: randomUUID(),
      actionType,
      entityType,
      entityId,
      metaJson: JSON.stringify(meta),
      createdAt: new Date().toISOString(),
    });
}

export function getSiteConfig(): SiteConfig {
  const row = getDb()
    .prepare("SELECT * FROM site_config WHERE id = 1")
    .get() as SiteConfigRow;

  return {
    tenantId: row.tenant_id,
    siteName: row.site_name,
    tagline: row.tagline,
    themeKey: row.theme_key,
    nav: parseNav(row.nav_json),
    chatWidgetEnabled: Boolean(row.chat_widget_enabled),
    updatedAt: row.updated_at,
  };
}

export function updateSiteConfig(input: UpdateSiteConfigInput) {
  const current = getSiteConfig();
  recordRevision("site_config", "1", current);

  const updated = {
    siteName: input.siteName?.trim() || current.siteName,
    tagline: input.tagline?.trim() || current.tagline,
    themeKey: input.themeKey?.trim() || current.themeKey,
    navJson: JSON.stringify(input.nav ?? current.nav),
    chatWidgetEnabled:
      input.chatWidgetEnabled === undefined
        ? current.chatWidgetEnabled
        : input.chatWidgetEnabled,
    updatedAt: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `UPDATE site_config
       SET site_name = @siteName,
           tagline = @tagline,
           theme_key = @themeKey,
           nav_json = @navJson,
           chat_widget_enabled = @chatWidgetEnabled,
           updated_at = @updatedAt
       WHERE id = 1`,
    )
    .run({
      ...updated,
      chatWidgetEnabled: updated.chatWidgetEnabled ? 1 : 0,
    });

  createAuditEvent("site_config.update", "site_config", "1");
  return getSiteConfig();
}

export function listPages({ includeDrafts = false } = {}) {
  const rows = getDb()
    .prepare(
      includeDrafts
        ? "SELECT * FROM pages ORDER BY sort_order, title"
        : "SELECT * FROM pages WHERE status = 'published' ORDER BY sort_order, title",
    )
    .all() as PageRow[];

  return rows.map(toPage);
}

export function getPageBySlug(slug: string, { includeDrafts = false } = {}) {
  const normalized = normalizeSlug(slug);
  const row = getDb()
    .prepare(
      includeDrafts
        ? "SELECT * FROM pages WHERE slug = ?"
        : "SELECT * FROM pages WHERE slug = ? AND status = 'published'",
    )
    .get(normalized) as PageRow | undefined;

  return row ? toPage(row) : null;
}

export function getPageById(id: string) {
  const row = getDb()
    .prepare("SELECT * FROM pages WHERE id = ?")
    .get(id) as PageRow | undefined;

  return row ? toPage(row) : null;
}

export function upsertPage(input: UpsertPageInput) {
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug);
  const existing = input.id
    ? getPageById(input.id)
    : getPageBySlug(slug, { includeDrafts: true });
  const status = input.status ?? existing?.status ?? "published";
  const publishedAt =
    status === "published" ? existing?.publishedAt ?? now : existing?.publishedAt ?? null;

  if (existing) {
    recordRevision("page", existing.id, existing);
    getDb()
      .prepare(
        `UPDATE pages
         SET slug = @slug,
             title = @title,
             body = @body,
             status = @status,
             sort_order = @sortOrder,
             updated_at = @updatedAt,
             published_at = @publishedAt
         WHERE id = @id`,
      )
      .run({
        id: existing.id,
        slug,
        title: input.title.trim(),
        body: input.body,
        status,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        updatedAt: now,
        publishedAt,
      });
    createAuditEvent("page.update", "page", existing.id, { slug });
    return getPageById(existing.id);
  }

  const id = input.id || randomUUID();
  getDb()
    .prepare(
      `INSERT INTO pages (
        id, slug, title, body, status, sort_order, created_at, updated_at, published_at
      ) VALUES (
        @id, @slug, @title, @body, @status, @sortOrder, @createdAt, @updatedAt, @publishedAt
      )`,
    )
    .run({
      id,
      slug,
      title: input.title.trim(),
      body: input.body,
      status,
      sortOrder: input.sortOrder ?? 100,
      createdAt: now,
      updatedAt: now,
      publishedAt,
    });
  createAuditEvent("page.create", "page", id, { slug });
  return getPageById(id);
}

export function deletePage(id: string) {
  const existing = getPageById(id);
  if (!existing) {
    return false;
  }

  recordRevision("page", existing.id, existing);
  getDb().prepare("DELETE FROM pages WHERE id = ?").run(id);
  createAuditEvent("page.delete", "page", id, { slug: existing.slug });
  return true;
}
