import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { countAppliedMigrations, runMigrations } from "@/lib/db";

export function GET() {
  runMigrations();

  return NextResponse.json({
    ok: true,
    service: "pagekeep-child-site",
    tenantId: config.tenantId,
    templateKey: config.templateKey,
    databaseUrl: config.databaseUrl,
    appliedMigrations: countAppliedMigrations(),
    contentTokenConfigured: Boolean(config.childContentToken),
    timestamp: new Date().toISOString(),
  });
}
