import { config } from "@/lib/config";

type RuntimeJobInput = {
  prompt: string;
  sessionId: string;
  metadata: Record<string, unknown>;
};

type RuntimeJobResponse = {
  ok?: boolean;
  jobId?: string;
  error?: string;
};

export async function createCodexRuntimeJob(input: RuntimeJobInput) {
  const baseUrl = process.env.CODEX_RUNTIME_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    return {
      ok: false as const,
      error: "CODEX_RUNTIME_BASE_URL is not configured on PageKeep.",
    };
  }

  const response = await fetch(`${baseUrl}/v1/responses/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      sessionId: input.sessionId,
      recentHistory: [],
      metadata: {
        ...input.metadata,
        parentAppBaseUrl: config.appBaseUrl,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | RuntimeJobResponse
    | null;

  if (!response.ok || !payload?.jobId) {
    return {
      ok: false as const,
      error:
        payload?.error ||
        `Codex runtime job creation failed with status ${response.status}.`,
    };
  }

  return {
    ok: true as const,
    jobId: payload.jobId,
  };
}
