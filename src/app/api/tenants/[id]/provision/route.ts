import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { triggerPrismProvisionHook } from "@/lib/prism-hooks";
import { generateSecretToken, storeSecret } from "@/lib/secrets";
import { getTenant, setTenantChildTokenRef } from "@/lib/tenants";

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

  const childContentToken = generateSecretToken();
  const secret = storeSecret({
    scopeType: "tenant",
    scopeId: tenant.id,
    secretKind: "child_content_token",
    secretValue: childContentToken,
  });
  setTenantChildTokenRef(tenant.id, secret.id);

  const hook = await triggerPrismProvisionHook({
    event: "tenant.provision.requested",
    tenantId: tenant.id,
    orgName: tenant.orgName,
    siteName: tenant.siteName,
    templateKey: tenant.templateKey,
    parentBaseUrl: config.appBaseUrl,
    childContentTokenRef: secret.id,
    childContentToken,
    railwayProjectId: config.railwayProjectId,
    railwayEnvironmentId: config.railwayEnvironmentId,
  });

  if (hook.ok) {
    return NextResponse.json(
      {
        ok: true,
        status: "queued",
        tenantId: tenant.id,
        hookRunId: hook.hookRunId,
        requestId: hook.requestId,
        requestNumber: hook.requestNumber,
        autoStartQueued: hook.autoStartQueued,
        message:
          "Provisioning request submitted to the Prism hook.",
      },
      { status: hook.status === 202 ? 202 : 200 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      status: "prism_hook_failed",
      tenantId: tenant.id,
      message: hook.error,
      hookStatus: hook.status,
      plannedSteps: [
        "enable tenant-provision-requested hook in Prism",
        "configure PRISM_HOOK_BASE_URL and PRISM_HOOK_SERVICE_TOKEN on PageKeep",
        "Prism hook creates a workflow-backed request",
        "workflow invokes tenant-child-provisioner through codex-runtime",
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
