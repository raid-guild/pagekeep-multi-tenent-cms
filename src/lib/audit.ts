import { randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

type AuditInput = {
  actorUserId?: string | null;
  actionType: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
};

export function createAuditEvent(input: AuditInput) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO audit_log (
        id, actor_user_id, action_type, target_type, target_id, meta_json, created_at
      ) VALUES (
        @id, @actorUserId, @actionType, @targetType, @targetId, @metaJson, @createdAt
      )`,
    )
    .run({
      id,
      actorUserId: input.actorUserId ?? null,
      actionType: input.actionType,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metaJson: JSON.stringify(input.meta ?? {}),
      createdAt,
    });

  return { id, createdAt };
}
