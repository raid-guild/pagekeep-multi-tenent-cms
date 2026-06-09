import { NextResponse } from "next/server";

import { config } from "@/lib/config";
import { requireServiceToken } from "@/lib/service-auth";
import {
  getTenant,
  tenantStatuses,
  updateTenantProvisioningResult,
} from "@/lib/tenants";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: unknown) {
  const status = readString(value);
  return tenantStatuses.includes(status as (typeof tenantStatuses)[number])
    ? (status as (typeof tenantStatuses)[number])
    : null;
}

export async function POST(request: Request, context: RouteContext) {
  const access = requireServiceToken(request);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status },
    );
  }

  const { id } = await context.params;
  const tenant = getTenant(id);

  if (!tenant) {
    return NextResponse.json(
      { ok: false, error: "Tenant not found." },
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

  const status =
    readStatus(body.status) ||
    (body.ok === true ? "active" : "provisioning_failed");

  const updated = updateTenantProvisioningResult(id, {
    status,
    railwayProjectId: readString(body.railwayProjectId) || config.railwayProjectId,
    railwayEnvironmentId:
      readString(body.railwayEnvironmentId) || config.railwayEnvironmentId,
    railwayServiceId: readString(body.railwayServiceId),
    railwayServiceName: readString(body.railwayServiceName),
    serviceUrl: readString(body.serviceUrl),
    latestDeploymentId:
      readString(body.deploymentId) || readString(body.latestDeploymentId),
    provisioningError:
      status === "provisioning_failed"
        ? readString(body.error) || "Provisioning failed."
        : null,
  });

  return NextResponse.json({
    ok: true,
    tenant: updated,
  });
}
