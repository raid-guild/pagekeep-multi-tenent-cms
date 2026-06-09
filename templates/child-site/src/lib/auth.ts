import { NextResponse } from "next/server";

import { config } from "@/lib/config";

export function requireContentToken(request: Request) {
  if (!config.childContentToken) {
    return NextResponse.json(
      { ok: false, error: "CHILD_CONTENT_TOKEN is not configured." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : "";
  const headerToken = request.headers.get("x-child-content-token")?.trim() || "";
  const token = bearer || headerToken;

  if (token !== config.childContentToken) {
    return NextResponse.json(
      { ok: false, error: "Invalid child content token." },
      { status: 401 },
    );
  }

  return null;
}
