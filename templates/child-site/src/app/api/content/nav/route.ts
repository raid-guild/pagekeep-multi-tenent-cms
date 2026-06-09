import { NextResponse } from "next/server";

import { requireContentToken } from "@/lib/auth";
import { updateSiteConfig } from "@/lib/content";
import { runMigrations } from "@/lib/db";

export async function POST(request: Request) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const nav = body?.nav;

  if (!Array.isArray(nav)) {
    return NextResponse.json(
      { ok: false, error: "Expected nav array." },
      { status: 400 },
    );
  }

  const cleaned = nav
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label.trim() : "";
      const slug = typeof record.slug === "string" ? record.slug.trim() : "";
      return label && slug ? { label, slug } : null;
    })
    .filter((item): item is { label: string; slug: string } => Boolean(item));

  const site = updateSiteConfig({ nav: cleaned });
  return NextResponse.json({ ok: true, site });
}
