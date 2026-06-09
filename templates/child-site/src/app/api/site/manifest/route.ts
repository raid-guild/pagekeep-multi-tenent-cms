import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { getSiteConfig, listPages } from "@/lib/content";
import { runMigrations } from "@/lib/db";

export function GET() {
  runMigrations();
  const site = getSiteConfig();

  return NextResponse.json({
    ok: true,
    tenantId: config.tenantId,
    templateKey: config.templateKey,
    site,
    capabilities: [
      "content:read",
      "content:write",
      "content:delete",
      "site:configure",
      "revalidate",
    ],
    pages: listPages({ includeDrafts: true }).map((page) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      status: page.status,
      updatedAt: page.updatedAt,
    })),
  });
}
