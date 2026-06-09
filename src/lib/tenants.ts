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
  serviceUrl: string | null;
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
    serviceUrl: row.service_url ? String(row.service_url) : null,
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
    serviceUrl: null,
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
