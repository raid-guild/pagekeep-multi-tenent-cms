import path from "node:path";

export type ChildConfig = {
  tenantId: string;
  siteName: string;
  templateKey: string;
  databaseUrl: string;
  databasePath: string;
  childContentToken: string | null;
  parentPrismBaseUrl: string | null;
  chatWidgetEnabled: boolean;
};

function parseSqliteFileUrl(value: string) {
  if (!value.startsWith("file:")) {
    return value;
  }

  return value.slice("file:".length);
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "file:.data/site.db";
  const filePath = parseSqliteFileUrl(databaseUrl);

  return {
    databaseUrl,
    databasePath: path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath),
  };
}

const database = resolveDatabasePath();

export const config: ChildConfig = {
  tenantId: process.env.TENANT_ID?.trim() || "local-tenant",
  siteName: process.env.SITE_NAME?.trim() || "Local Docs",
  templateKey: process.env.TEMPLATE_KEY?.trim() || "docs-site",
  databaseUrl: database.databaseUrl,
  databasePath: database.databasePath,
  childContentToken: process.env.CHILD_CONTENT_TOKEN?.trim() || null,
  parentPrismBaseUrl: process.env.PARENT_PRISM_BASE_URL?.trim() || null,
  chatWidgetEnabled: process.env.CHAT_WIDGET_ENABLED !== "false",
};
