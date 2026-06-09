import { NextResponse } from "next/server";

import { requireContentToken } from "@/lib/auth";
import { getSiteConfig, updateSiteConfig } from "@/lib/content";
import { runMigrations } from "@/lib/db";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNav(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = readString(record.label);
      const slug = readString(record.slug);
      return label && slug ? { label, slug } : null;
    })
    .filter((item): item is { label: string; slug: string } => Boolean(item));
}

export function GET(request: Request) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  return NextResponse.json({ ok: true, site: getSiteConfig() });
}

export async function PATCH(request: Request) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Expected JSON request body." },
      { status: 400 },
    );
  }

  const site = updateSiteConfig({
    siteName: readString(body.siteName ?? body.site_name) || undefined,
    tagline: readString(body.tagline) || undefined,
    themeKey: readString(body.themeKey ?? body.theme_key) || undefined,
    nav: readNav(body.nav),
    chatWidgetEnabled:
      typeof body.chatWidgetEnabled === "boolean"
        ? body.chatWidgetEnabled
        : typeof body.chat_widget_enabled === "boolean"
          ? body.chat_widget_enabled
          : undefined,
  });

  return NextResponse.json({ ok: true, site });
}
