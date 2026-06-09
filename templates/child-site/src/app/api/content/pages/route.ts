import { NextResponse } from "next/server";

import { requireContentToken } from "@/lib/auth";
import { listPages, upsertPage } from "@/lib/content";
import { runMigrations } from "@/lib/db";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: unknown) {
  return value === "draft" || value === "published" ? value : "published";
}

export function GET(request: Request) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const includeDrafts =
    new URL(request.url).searchParams.get("includeDrafts") === "true";

  return NextResponse.json({
    ok: true,
    pages: listPages({ includeDrafts }),
  });
}

export async function POST(request: Request) {
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

  const slug = readString(body.slug);
  const title = readString(body.title);
  const pageBody = typeof body.body === "string" ? body.body : "";

  if (!slug || !title) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: slug, title." },
      { status: 400 },
    );
  }

  const page = upsertPage({
    slug,
    title,
    body: pageBody,
    status: readStatus(body.status),
    sortOrder:
      typeof body.sortOrder === "number" ? Math.trunc(body.sortOrder) : undefined,
  });

  return NextResponse.json({ ok: true, page }, { status: 201 });
}
