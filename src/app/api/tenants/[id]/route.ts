import { NextResponse } from "next/server";

import { getTenant } from "@/lib/tenants";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const tenant = getTenant(id);

  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "Tenant not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    tenant,
  });
}
