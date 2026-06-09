import { NextResponse } from "next/server";

import { requireContentToken } from "@/lib/auth";
import { deletePage, getPageById, upsertPage } from "@/lib/content";
import { runMigrations } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: unknown) {
  return value === "draft" || value === "published" ? value : undefined;
}

export async function GET(request: Request, context: RouteContext) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const { id } = await context.params;
  const page = getPageById(id);

  if (!page) {
    return NextResponse.json(
      { ok: false, error: "Page not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, page });
}

export async function PATCH(request: Request, context: RouteContext) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const { id } = await context.params;
  const existing = getPageById(id);

  if (!existing) {
    return NextResponse.json(
      { ok: false, error: "Page not found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "Expected JSON request body." },
      { status: 400 },
    );
  }

  const page = upsertPage({
    id,
    slug: readString(body.slug) || existing.slug,
    title: readString(body.title) || existing.title,
    body: typeof body.body === "string" ? body.body : existing.body,
    status: readStatus(body.status) ?? existing.status,
    sortOrder:
      typeof body.sortOrder === "number"
        ? Math.trunc(body.sortOrder)
        : existing.sortOrder,
  });

  return NextResponse.json({ ok: true, page });
}

export async function DELETE(request: Request, context: RouteContext) {
  runMigrations();
  const authError = requireContentToken(request);
  if (authError) return authError;

  const { id } = await context.params;
  const deleted = deletePage(id);

  if (!deleted) {
    return NextResponse.json(
      { ok: false, error: "Page not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, deleted: true });
}
