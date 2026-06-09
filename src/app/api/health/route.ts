import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { countAppliedMigrations, runMigrations } from "@/lib/db";

export function GET() {
  runMigrations();

  return NextResponse.json({
    ok: true,
    service: "pagekeep-control-plane",
    databaseUrl: config.databaseUrl.replace(/\/\/.*@/, "//***@"),
    appliedMigrations: countAppliedMigrations(),
    railway: {
      projectIdConfigured: Boolean(config.railwayProjectId),
      environmentIdConfigured: Boolean(config.railwayEnvironmentId),
    },
    timestamp: new Date().toISOString(),
  });
}
