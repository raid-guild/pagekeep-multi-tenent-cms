export function getPageKeepServiceToken() {
  return (
    process.env.PAGEKEEP_CALLBACK_TOKEN?.trim() ||
    process.env.INTERNAL_SERVICE_TOKEN?.trim() ||
    process.env.PRISM_HOOK_SERVICE_TOKEN?.trim() ||
    ""
  );
}

export function requireServiceToken(request: Request) {
  const expected = getPageKeepServiceToken();
  if (!expected) {
    return {
      ok: false as const,
      status: 503,
      error: "PageKeep callback token is not configured.",
    };
  }

  const direct = request.headers.get("x-service-token")?.trim() || "";
  const authorization = request.headers.get("authorization")?.trim() || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim()
    : authorization;
  const received = direct || bearer;

  if (received !== expected) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized",
    };
  }

  return { ok: true as const };
}
