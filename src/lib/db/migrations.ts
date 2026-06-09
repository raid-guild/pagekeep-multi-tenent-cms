import type { Database } from "better-sqlite3";

export type Migration = {
  id: string;
  up: (db: Database) => void;
};

export const migrations: Migration[] = [
  {
    id: "001_initial_control_plane",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tenants (
          id TEXT PRIMARY KEY,
          org_name TEXT NOT NULL,
          site_name TEXT NOT NULL,
          admin_email TEXT NOT NULL,
          admin_name TEXT,
          status TEXT NOT NULL,
          template_key TEXT NOT NULL,
          railway_project_id TEXT,
          railway_environment_id TEXT,
          railway_service_id TEXT,
          service_url TEXT,
          child_content_token_ref TEXT,
          codex_session_id TEXT,
          onboarding_completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tenants_status
          ON tenants(status, created_at);

        CREATE TABLE IF NOT EXISTS secrets (
          id TEXT PRIMARY KEY,
          scope_type TEXT NOT NULL,
          scope_id TEXT NOT NULL,
          secret_kind TEXT NOT NULL,
          secret_value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          rotated_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_secrets_scope
          ON secrets(scope_type, scope_id, secret_kind);

        CREATE TABLE IF NOT EXISTS audit_log (
          id TEXT PRIMARY KEY,
          actor_user_id TEXT,
          action_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT,
          meta_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_audit_log_target
          ON audit_log(target_type, target_id, created_at);
      `);
    },
  },
  {
    id: "002_tenant_provisioning_result",
    up(db) {
      const columns = db
        .prepare("PRAGMA table_info(tenants)")
        .all() as Array<{ name: string }>;
      const existing = new Set(columns.map((column) => column.name));

      if (!existing.has("railway_service_name")) {
        db.exec("ALTER TABLE tenants ADD COLUMN railway_service_name TEXT;");
      }

      if (!existing.has("latest_deployment_id")) {
        db.exec("ALTER TABLE tenants ADD COLUMN latest_deployment_id TEXT;");
      }

      if (!existing.has("provisioning_error")) {
        db.exec("ALTER TABLE tenants ADD COLUMN provisioning_error TEXT;");
      }
    },
  },
];
