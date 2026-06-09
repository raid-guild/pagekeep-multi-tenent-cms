import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

import { config } from "@/lib/config";
import { migrations } from "@/lib/db/migrations";

let db: Database.Database | null = null;

export function getDb() {
  if (db) {
    return db;
  }

  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function runMigrations() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = database
    .prepare("SELECT id FROM schema_migrations")
    .all() as Array<{ id: string }>;
  const applied = new Set(appliedRows.map((row) => row.id));
  const appliedNow: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    const transaction = database.transaction(() => {
      migration.up(database);
      database
        .prepare(
          "INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)",
        )
        .run(migration.id, new Date().toISOString());
    });

    transaction();
    appliedNow.push(migration.id);
  }

  return appliedNow;
}

export function countAppliedMigrations() {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
    .get() as { count: number } | undefined;

  return row?.count ?? 0;
}
