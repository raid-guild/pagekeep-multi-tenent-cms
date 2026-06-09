import { NextResponse } from "next/server";

import { createCodexRuntimeJob } from "@/lib/codex-runtime";
import { getTenant } from "@/lib/tenants";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const tenant = getTenant(id);

  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "Tenant not found." },
      { status: 404 },
    );
  }

  const prompt = [
    "Provision a Railway child tenant site for the tenant metadata below.",
    "",
    "Use the existing Railway project token available inside codex-runtime.",
    "Do not modify or redeploy existing Prism services.",
    "Create or use a PageKeep child service from the child-site template.",
    "Attach a /data volume, set required child env vars, create a Railway domain, deploy, then call /health.",
    "After deployment, report the Railway service ID, public URL, and health result.",
    "",
    JSON.stringify(
      {
        tenantId: tenant.id,
        orgName: tenant.orgName,
        siteName: tenant.siteName,
        templateKey: tenant.templateKey,
      },
      null,
      2,
    ),
  ].join("\n");

  const job = await createCodexRuntimeJob({
    sessionId: `tenant-provision:${tenant.id}`,
    prompt,
    metadata: {
      workflow: "tenant-child-service-provision",
      tenant,
      childTemplatePath: "templates/child-site",
    },
  });

  if (job.ok) {
    return NextResponse.json(
      {
        ok: true,
        status: "queued",
        tenantId: tenant.id,
        codexRuntimeJobId: job.jobId,
        message:
          "Provisioning job queued in codex-runtime. Poll codex-runtime for job status.",
      },
      { status: 202 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      status: "codex_runtime_not_configured",
      tenantId: tenant.id,
      message: job.error,
      plannedSteps: [
        "configure CODEX_RUNTIME_BASE_URL on PageKeep",
        "submit constrained provisioning job to codex-runtime",
        "codex-runtime uses its Railway project token",
        "attach /data volume",
        "set child env vars",
        "deploy templates/child-site",
        "create Railway domain",
        "seed first content through child API",
        "store child service URL and IDs on tenant",
      ],
    },
    { status: 501 },
  );
}
