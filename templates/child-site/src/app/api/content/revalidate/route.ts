import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireContentToken } from "@/lib/auth";

export async function POST(request: Request) {
  const authError = requireContentToken(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const path = typeof body?.path === "string" && body.path ? body.path : "/";

  revalidatePath(path);

  return NextResponse.json({
    ok: true,
    revalidated: path,
  });
}
