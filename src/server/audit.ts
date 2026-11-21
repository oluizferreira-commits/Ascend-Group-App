import "server-only";
import { db, schema, type Tx } from "@/db";
import type { AuthContext } from "./auth/session";
import { requestMeta } from "./auth/session";

export async function audit(
  ctx: Pick<AuthContext, "user" | "club"> | { user: { id: string } | null; club: { id: string } | null },
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
  tx?: Tx,
) {
  let ip: string | null = null;
  try {
    ip = (await requestMeta()).ip;
  } catch {
    // outside a request (scripts / tests)
  }
  await (tx ?? db).insert(schema.auditLogs).values({
    clubId: ctx.club?.id ?? null,
    actorUserId: ctx.user?.id ?? null,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: ip,
  });
}
