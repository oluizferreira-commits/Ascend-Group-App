import "server-only";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import * as webpush from "web-push";
import { db, schema } from "@/db";
import { ROLES, ROLE_KEYS, type Permission } from "./auth/permissions";

export type NotifyAudience =
  | { kind: "members" } // everyone with a role other than visitor
  | { kind: "staff" }
  | { kind: "users"; userIds: string[] }
  | { kind: "players"; playerIds: string[] }
  | { kind: "permission"; permission: Permission };

const STAFF = ["president", "admin", "coach", "assistant_coach", "analyst"] as const;

async function resolveUsers(clubId: string, a: NotifyAudience): Promise<string[]> {
  if (a.kind === "users") return [...new Set(a.userIds)];
  if (a.kind === "players") {
    if (!a.playerIds.length) return [];
    const rows = await db.select({ u: schema.players.userId }).from(schema.players)
      .where(and(eq(schema.players.clubId, clubId), inArray(schema.players.id, a.playerIds), isNotNull(schema.players.userId)));
    return [...new Set(rows.map((r) => r.u!))];
  }
  if (a.kind === "permission") {
    const keys = ROLE_KEYS.filter((k) => ROLES[k].permissions.includes(a.permission));
    const rows = await db.selectDistinct({ u: schema.memberships.userId }).from(schema.memberships)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
      .where(and(eq(schema.memberships.clubId, clubId), inArray(schema.roles.key, keys)));
    return rows.map((r) => r.u);
  }
  const rows = await db.selectDistinct({ u: schema.memberships.userId }).from(schema.memberships)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
    .where(and(eq(schema.memberships.clubId, clubId), a.kind === "staff" ? inArray(schema.roles.key, [...STAFF]) : ne(schema.roles.key, "visitor")));
  return rows.map((r) => r.u);
}

let vapidReady: boolean | null = null;
function pushEnabled() {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  vapidReady = !!(pub && priv);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:no-reply@${new URL(process.env.APP_URL ?? "http://localhost").hostname}`, pub!, priv!);
  return vapidReady;
}

/**
 * Creates in-app notifications and, when VAPID keys are configured, sends Web Push.
 * Never throws: a notification failure must not break the action that triggered it.
 */
export async function notify(clubId: string, audience: NotifyAudience, n: { type: string; title: string; body?: string; link?: string; excludeUserId?: string }) {
  try {
    const userIds = (await resolveUsers(clubId, audience)).filter((u) => u !== n.excludeUserId);
    if (!userIds.length) return;
    await db.insert(schema.notifications).values(userIds.map((userId) => ({ userId, clubId, type: n.type, title: n.title.slice(0, 140), body: n.body?.slice(0, 500), link: n.link })));
    if (!pushEnabled()) return;
    const subs = await db.select().from(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.userId, userIds));
    const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.link ?? "/app" });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
      }
    }));
  } catch (e) {
    console.error("[notify] failed", e);
  }
}
