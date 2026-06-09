import { config } from "@/lib/config";

type HookTriggerResult =
  | {
      ok: true;
      status: number;
      hookRunId?: string | null;
      requestId?: string | null;
      requestNumber?: number | null;
      autoStartQueued?: boolean;
      payload: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      error: string;
      payload: Record<string, unknown> | null;
    };

export async function triggerPrismProvisionHook(
  payload: Record<string, unknown>,
): Promise<HookTriggerResult> {
  const token =
    process.env.PRISM_HOOK_SERVICE_TOKEN?.trim() ||
    process.env.INTERNAL_SERVICE_TOKEN?.trim();

  if (!config.prismHookBaseUrl) {
    return {
      ok: false,
      status: 503,
      error: "PRISM_HOOK_BASE_URL is not configured.",
      payload: null,
    };
  }

  if (!token) {
    return {
      ok: false,
      status: 503,
      error: "PRISM_HOOK_SERVICE_TOKEN is not configured.",
      payload: null,
    };
  }

  const response = await fetch(
    `${config.prismHookBaseUrl}/agent/hooks/${encodeURIComponent(
      config.prismHookKey,
    )}/trigger`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-token": token,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok || result?.ok !== true) {
    return {
      ok: false,
      status: response.status,
      error:
        typeof result?.error === "string"
          ? result.error
          : `Prism hook trigger failed with status ${response.status}.`,
      payload: result,
    };
  }

  return {
    ok: true,
    status: response.status,
    hookRunId: typeof result.hookRunId === "string" ? result.hookRunId : null,
    requestId: typeof result.requestId === "string" ? result.requestId : null,
    requestNumber:
      typeof result.requestNumber === "number" ? result.requestNumber : null,
    autoStartQueued: Boolean(result.autoStartQueued),
    payload: result,
  };
}
