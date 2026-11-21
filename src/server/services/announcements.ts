import "server-only";
import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuthContext } from "../auth/session";

export function isStaff(ctx: AuthContext) {
  return ctx.roles.some((r) => !["player", "visitor"].includes(r));
}

export function visibleScopes(ctx: AuthContext | null): ("public" | "members" | "staff")[] {
  if (!ctx || !ctx.permissions.has("announcements.view")) return ["public"];
  return isStaff(ctx) ? ["public", "members", "staff"] : ["public", "members"];
}

export async function listActiveAnnouncements(clubId: string, scopes: ("public" | "members" | "staff")[], limit = 20) {
  const now = new Date();
  return db
    .select()
    .from(schema.announcements)
    .where(and(
      eq(schema.announcements.clubId, clubId),
      inArray(schema.announcements.visibility, scopes),
      lte(schema.announcements.publishedAt, now),
      or(isNull(schema.announcements.expiresAt), gt(schema.announcements.expiresAt, now)),
    ))
    .orderBy(desc(schema.announcements.pinned), desc(schema.announcements.publishedAt))
    .limit(limit);
}

export async function listAllAnnouncements(clubId: string) {
  const rows = await db.select().from(schema.announcements).where(eq(schema.announcements.clubId, clubId))
    .orderBy(desc(schema.announcements.publishedAt)).limit(200);
  const now = Date.now();
  return rows.map((a) => ({
    ...a,
    state: a.publishedAt.getTime() > now ? ("scheduled" as const) : a.expiresAt && a.expiresAt.getTime() <= now ? ("expired" as const) : ("active" as const),
  }));
}
