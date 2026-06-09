import type { Database } from "better-sqlite3";

import { config } from "@/lib/config";

export type Migration = {
  id: string;
  up: (db: Database) => void;
};

export const migrations: Migration[] = [
  {
    id: "001_initial_child_site",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS site_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          tenant_id TEXT NOT NULL,
          site_name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          theme_key TEXT NOT NULL,
          nav_json TEXT NOT NULL,
          chat_widget_enabled INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          published_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_pages_status_sort
          ON pages(status, sort_order, title);

        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          original_name TEXT NOT NULL,
          content_type TEXT NOT NULL,
          public_url TEXT NOT NULL,
          label TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS revisions (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_revisions_entity
          ON revisions(entity_type, entity_id, created_at);

        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          meta_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_audit_events_entity
          ON audit_events(entity_type, entity_id, created_at);
      `);

      const now = new Date().toISOString();
      const nav = JSON.stringify([{ label: "Home", slug: "/" }]);

      db.prepare(
        `INSERT OR IGNORE INTO site_config (
          id, tenant_id, site_name, tagline, theme_key, nav_json, chat_widget_enabled, updated_at
        ) VALUES (
          1, @tenantId, @siteName, @tagline, 'docs-default', @navJson, @chatWidgetEnabled, @updatedAt
        )`,
      ).run({
        tenantId: config.tenantId,
        siteName: config.siteName,
        tagline: "A lightweight Prism-managed docs site.",
        navJson: nav,
        chatWidgetEnabled: config.chatWidgetEnabled ? 1 : 0,
        updatedAt: now,
      });

      db.prepare(
        `INSERT OR IGNORE INTO pages (
          id, slug, title, body, status, sort_order, created_at, updated_at, published_at
        ) VALUES (
          'home', '/', @title, @body, 'published', 0, @now, @now, @now
        )`,
      ).run({
        title: config.siteName,
        body: [
          `# ${config.siteName}`,
          "",
          "This child site is online and ready for scoped content updates.",
          "",
          "The parent Prism control plane will update this content through the child content API.",
        ].join("\n"),
        now,
      });
    },
  },
];
