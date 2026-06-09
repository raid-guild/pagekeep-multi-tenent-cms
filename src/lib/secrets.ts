import { randomBytes, randomUUID } from "node:crypto";

import { getDb } from "@/lib/db";

export function generateSecretToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function storeSecret(input: {
  id?: string;
  scopeType: string;
  scopeId: string;
  secretKind: string;
  secretValue: string;
}) {
  const id = input.id || randomUUID();
  const createdAt = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO secrets (
        id, scope_type, scope_id, secret_kind, secret_value, created_at, rotated_at
      ) VALUES (
        @id, @scopeType, @scopeId, @secretKind, @secretValue, @createdAt, NULL
      )`,
    )
    .run({
      id,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      secretKind: input.secretKind,
      secretValue: input.secretValue,
      createdAt,
    });

  return { id, createdAt };
}
