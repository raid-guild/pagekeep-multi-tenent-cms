import { randomUUID } from "node:crypto";

import { createAuditEvent } from "@/lib/audit";
import { getDb } from "@/lib/db";

export const tenantStatuses = [
  "provisioning",
  "active",
  "suspended",
  "deactivated",
  "provisioning_failed",
] as const;

export type TenantStatus = (typeof tenantStatuses)[number];

export type TenantRecord = {
  id: string;
  orgName: string;
  siteName: string;
  adminEmail: string;
  adminName: string | null;
  status: TenantStatus;
  templateKey: string;
  railwayProjectId: string | null;
  railwayEnvironmentId: string | null;
  railwayServiceId: string | null;
  railwayServiceName: string | null;
  serviceUrl: string | null;
  latestDeploymentId: string | null;
  provisioningError: string | null;
  childContentTokenRef: string | null;
  codexSessionId: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTenantInput = {
  orgName: string;
  siteName: string;
  adminEmail: string;
  adminName?: string | null;
  templateKey: string;
};

function toTenantRecord(row: Record<string, unknown>): TenantRecord {
  return {
    id: String(row.id),
    orgName: String(row.org_name),
    siteName: String(row.site_name),
    adminEmail: String(row.admin_email),
    adminName: row.admin_name ? String(row.admin_name) : null,
    status: String(row.status) as TenantStatus,
    templateKey: String(row.template_key),
    railwayProjectId: row.railway_project_id
      ? String(row.railway_project_id)
      : null,
    railwayEnvironmentId: row.railway_environment_id
      ? String(row.railway_environment_id)
      : null,
    railwayServiceId: row.railway_service_id
      ? String(row.railway_service_id)
      : null,
    railwayServiceName: row.railway_service_name
      ? String(row.railway_service_name)
      : null,
    serviceUrl: row.service_url ? String(row.service_url) : null,
    latestDeploymentId: row.latest_deployment_id
      ? String(row.latest_deployment_id)
      : null,
    provisioningError: row.provisioning_error
      ? String(row.provisioning_error)
      : null,
    childContentTokenRef: row.child_content_token_ref
      ? String(row.child_content_token_ref)
      : null,
    codexSessionId: row.codex_session_id ? String(row.codex_session_id) : null,
    onboardingCompletedAt: row.onboarding_completed_at
      ? String(row.onboarding_completed_at)
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function listTenants() {
  const rows = getDb()
    .prepare("SELECT * FROM tenants ORDER BY created_at DESC")
    .all() as Array<Record<string, unknown>>;

  return rows.map(toTenantRecord);
}

export function getTenant(id: string) {
  const row = getDb()
    .prepare("SELECT * FROM tenants WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  return row ? toTenantRecord(row) : null;
}

export function createTenant(input: CreateTenantInput) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const tenant: TenantRecord = {
    id,
    orgName: input.orgName,
    siteName: input.siteName,
    adminEmail: input.adminEmail,
    adminName: input.adminName ?? null,
    status: "provisioning",
    templateKey: input.templateKey,
    railwayProjectId: null,
    railwayEnvironmentId: null,
    railwayServiceId: null,
    railwayServiceName: null,
    serviceUrl: null,
    latestDeploymentId: null,
    provisioningError: null,
    childContentTokenRef: null,
    codexSessionId: null,
    onboardingCompletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  getDb()
    .prepare(
      `INSERT INTO tenants (
        id, org_name, site_name, admin_email, admin_name, status, template_key,
        railway_project_id, railway_environment_id, railway_service_id, service_url,
        child_content_token_ref, codex_session_id, onboarding_completed_at, created_at, updated_at
      ) VALUES (
        @id, @orgName, @siteName, @adminEmail, @adminName, @status, @templateKey,
        @railwayProjectId, @railwayEnvironmentId, @railwayServiceId, @serviceUrl,
        @childContentTokenRef, @codexSessionId, @onboardingCompletedAt, @createdAt, @updatedAt
      )`,
    )
    .run(tenant);

  createAuditEvent({
    actionType: "tenant.create",
    targetType: "tenant",
    targetId: id,
    meta: {
      status: tenant.status,
      templateKey: tenant.templateKey,
    },
  });

  return tenant;
}

export function setTenantChildTokenRef(tenantId: string, tokenRef: string) {
  const updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE tenants
       SET child_content_token_ref = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(tokenRef, updatedAt, tenantId);

  createAuditEvent({
    actionType: "tenant.child_token_ref.set",
    targetType: "tenant",
    targetId: tenantId,
    meta: { tokenRef },
  });

  return getTenant(tenantId);
}

export function markTenantProvisioningQueued(tenantId: string) {
  const updatedAt = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE tenants
       SET status = 'provisioning',
           provisioning_error = NULL,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(updatedAt, tenantId);

  createAuditEvent({
    actionType: "tenant.provisioning.queued",
    targetType: "tenant",
    targetId: tenantId,
    meta: { status: "provisioning" },
  });

  return getTenant(tenantId);
}

export function updateTenantProvisioningResult(
  tenantId: string,
  input: {
    status: TenantStatus;
    railwayProjectId?: string | null;
    railwayEnvironmentId?: string | null;
    railwayServiceId?: string | null;
    railwayServiceName?: string | null;
    serviceUrl?: string | null;
    latestDeploymentId?: string | null;
    provisioningError?: string | null;
  },
) {
  const updatedAt = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE tenants
       SET status = @status,
           railway_project_id = COALESCE(@railwayProjectId, railway_project_id),
           railway_environment_id = COALESCE(@railwayEnvironmentId, railway_environment_id),
           railway_service_id = COALESCE(@railwayServiceId, railway_service_id),
           railway_service_name = COALESCE(@railwayServiceName, railway_service_name),
           service_url = COALESCE(@serviceUrl, service_url),
           latest_deployment_id = COALESCE(@latestDeploymentId, latest_deployment_id),
           provisioning_error = @provisioningError,
           updated_at = @updatedAt
       WHERE id = @tenantId`,
    )
    .run({
      tenantId,
      status: input.status,
      railwayProjectId: input.railwayProjectId ?? null,
      railwayEnvironmentId: input.railwayEnvironmentId ?? null,
      railwayServiceId: input.railwayServiceId ?? null,
      railwayServiceName: input.railwayServiceName ?? null,
      serviceUrl: input.serviceUrl ?? null,
      latestDeploymentId: input.latestDeploymentId ?? null,
      provisioningError: input.provisioningError ?? null,
      updatedAt,
    });

  createAuditEvent({
    actionType: "tenant.provisioning_result.update",
    targetType: "tenant",
    targetId: tenantId,
    meta: {
      status: input.status,
      railwayServiceId: input.railwayServiceId ?? null,
      serviceUrl: input.serviceUrl ?? null,
      latestDeploymentId: input.latestDeploymentId ?? null,
      provisioningError: input.provisioningError ?? null,
    },
  });

  return getTenant(tenantId);
}
