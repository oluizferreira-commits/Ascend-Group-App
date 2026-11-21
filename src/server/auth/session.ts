import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateToken, hashToken } from "./tokens";
import { permissionsForRoles, type Permission, type RoleKey } from "./permissions";
import { forbiddenError } from "../errors";

export const SESSION_COOKIE = "ascend_session";
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const RENEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function createSession(userId: string) {
  const token = generateToken();
  const meta = await requestMeta();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; email: string; displayName: string };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({
      sessionExpires: schema.sessions.expiresAt,
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      isActive: schema.users.isActive,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.isActive) return null;
  // Sliding expiration: extend sessions that are past half their lifetime.
  if (row.sessionExpires.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    await db
      .update(schema.sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(schema.sessions.id, id));
  }
  return { id: row.id, email: row.email, displayName: row.displayName };
});

export type AuthContext = {
  user: SessionUser;
  club: { id: string; name: string; slug: string; organizationId: string };
  roles: RoleKey[];
  permissions: Set<Permission>;
  playerId: string | null;
};

/** Loads user, active club, roles and effective permissions for the request. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const rows = await db
    .select({
      clubId: schema.clubs.id,
      clubName: schema.clubs.name,
      clubSlug: schema.clubs.slug,
      organizationId: schema.clubs.organizationId,
      role: schema.roles.key,
    })
    .from(schema.memberships)
    .innerJoin(schema.clubs, eq(schema.clubs.id, schema.memberships.clubId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
    .where(eq(schema.memberships.userId, user.id))
    .orderBy(asc(schema.clubs.createdAt));
  if (rows.length === 0) return null;

  const preferred = (await cookies()).get("ascend_club")?.value;
  const clubId = rows.some((r) => r.clubId === preferred) ? preferred! : rows[0].clubId;
  const clubRows = rows.filter((r) => r.clubId === clubId);
  const roles = clubRows.map((r) => r.role);
  const [player] = await db
    .select({ id: schema.players.id })
    .from(schema.players)
    .where(and(eq(schema.players.clubId, clubId), eq(schema.players.userId, user.id)))
    .limit(1);

  return {
    user,
    club: { id: clubId, name: clubRows[0].clubName, slug: clubRows[0].clubSlug, organizationId: clubRows[0].organizationId },
    roles,
    permissions: permissionsForRoles(roles),
    playerId: player?.id ?? null,
  };
});

export function can(ctx: AuthContext | null, permission: Permission) {
  return !!ctx && ctx.permissions.has(permission);
}

/** For pages: redirects when unauthenticated or unauthorized. */
export async function requirePage(permission?: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    const user = await getSessionUser();
    redirect(user ? "/sem-acesso" : "/login");
  }
  if (permission && !ctx.permissions.has(permission)) redirect("/app/sem-permissao");
  return ctx;
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function requireAction(permission?: Permission): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw forbiddenError("Sessão expirada. Entre novamente.");
  if (permission && !ctx.permissions.has(permission)) throw forbiddenError();
  return ctx;
}
