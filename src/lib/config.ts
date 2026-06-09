import path from "node:path";

export type AppConfig = {
  appBaseUrl: string;
  databasePath: string;
  databaseUrl: string;
  railwayProjectId: string | null;
  railwayEnvironmentId: string | null;
};

function parseSqliteFileUrl(value: string) {
  if (!value.startsWith("file:")) {
    return value;
  }

  return value.slice("file:".length);
}

function resolveDatabasePath() {
  const databaseUrl =
    process.env.CONTROL_PLANE_DATABASE_URL?.trim() ||
    "file:.data/control-plane.db";
  const filePath = parseSqliteFileUrl(databaseUrl);

  return {
    databaseUrl,
    databasePath: path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath),
  };
}

const database = resolveDatabasePath();

export const config: AppConfig = {
  appBaseUrl:
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim() || "http://127.0.0.1:3100",
  databasePath: database.databasePath,
  databaseUrl: database.databaseUrl,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID?.trim() || null,
  railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID?.trim() || null,
};
