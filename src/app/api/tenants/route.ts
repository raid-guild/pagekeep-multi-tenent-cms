import { NextResponse } from "next/server";

import { createTenant, listTenants } from "@/lib/tenants";

const templateKeys = new Set(["docs-site", "portfolio-site"]);

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    tenants: listTenants(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Expected JSON request body." },
      { status: 400 },
    );
  }

  const orgName = readString(body.org_name ?? body.orgName);
  const siteName = readString(body.site_name ?? body.siteName);
  const adminEmail = readString(body.admin_email ?? body.adminEmail);
  const adminName = readString(body.admin_name ?? body.adminName);
  const templateKey = readString(body.template_key ?? body.templateKey);

  if (!orgName || !siteName || !adminEmail || !templateKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing required fields: org_name, site_name, admin_email, template_key.",
      },
      { status: 400 },
    );
  }

  if (!templateKeys.has(templateKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported template_key. Use docs-site or portfolio-site.",
      },
      { status: 400 },
    );
  }

  const tenant = createTenant({
    orgName,
    siteName,
    adminEmail,
    adminName: adminName || null,
    templateKey,
  });

  return NextResponse.json(
    {
      ok: true,
      tenant,
    },
    { status: 201 },
  );
}
