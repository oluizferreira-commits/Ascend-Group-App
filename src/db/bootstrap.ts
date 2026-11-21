/**
 * Idempotent reference data: organization, club, roles, permissions, built-in
 * formations and default rating weights. Contains NO players, matches or
 * statistics — those are real club data entered by the staff or imported.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { PERMISSIONS, ROLES, ROLE_KEYS } from "../server/auth/permissions";
import { BUILT_IN_FORMATIONS } from "../lib/formations";
import { DEFAULT_WEIGHTS } from "../lib/rating";
import { POSITION_GROUPS } from "../lib/domain";

type AnyDb = PostgresJsDatabase<typeof schema>;

export const ORG = { name: "Ascend Group", slug: "ascend-group", motto: "RISE. CONQUER. ASCEND." };
export const CLUB = { name: "Ascend FC", slug: "ascend-fc", shortName: "AFC" };

export async function bootstrapReferenceData(db: AnyDb) {
  return db.transaction(async (tx) => {
    // Permissions & roles
    for (const [key, description] of Object.entries(PERMISSIONS)) {
      await tx.insert(schema.permissions).values({ key, description })
        .onConflictDoUpdate({ target: schema.permissions.key, set: { description } });
    }
    const permRows = await tx.select().from(schema.permissions);
    const permId = new Map(permRows.map((p) => [p.key, p.id]));
    for (const key of ROLE_KEYS) {
      const def = ROLES[key];
      const [role] = await tx.insert(schema.roles).values({ key, name: def.name, rank: def.rank })
        .onConflictDoUpdate({ target: schema.roles.key, set: { name: def.name, rank: def.rank } })
        .returning();
      // Keep DB grants exactly in sync with code.
      await tx.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, role.id));
      if (def.permissions.length) {
        await tx.insert(schema.rolePermissions).values(def.permissions.map((p) => ({ roleId: role.id, permissionId: permId.get(p)! })));
      }
    }

    // Organization & club
    const [org] = await tx.insert(schema.organizations).values(ORG)
      .onConflictDoUpdate({ target: schema.organizations.slug, set: { name: ORG.name } })
      .returning();
    let [club] = await tx.select().from(schema.clubs)
      .where(and(eq(schema.clubs.organizationId, org.id), eq(schema.clubs.slug, CLUB.slug)));
    if (!club) {
      [club] = await tx.insert(schema.clubs).values({ ...CLUB, organizationId: org.id }).returning();
    }

    // Built-in formations (club_id = null)
    for (const f of BUILT_IN_FORMATIONS) {
      const [existing] = await tx.select({ id: schema.formations.id }).from(schema.formations)
        .where(and(isNull(schema.formations.clubId), eq(schema.formations.code, f.code)));
      if (existing) await tx.update(schema.formations).set({ name: f.name, slots: f.slots }).where(eq(schema.formations.id, existing.id));
      else await tx.insert(schema.formations).values({ code: f.code, name: f.name, slots: f.slots });
    }

    // Default rating profiles (only created if missing — staff edits are preserved)
    for (const g of POSITION_GROUPS) {
      await tx.insert(schema.ratingProfiles).values({ clubId: club.id, positionGroup: g, weights: DEFAULT_WEIGHTS[g] as Record<string, number> })
        .onConflictDoNothing();
    }
    await tx.insert(schema.ratingSettings).values({ clubId: club.id }).onConflictDoNothing();

    return { organizationId: org.id, clubId: club.id };
  });
}

export async function ensureMembership(db: AnyDb, userId: string, clubId: string, roleKey: (typeof ROLE_KEYS)[number]) {
  const [role] = await db.select().from(schema.roles).where(eq(schema.roles.key, roleKey));
  await db.insert(schema.memberships).values({ userId, clubId, roleId: role.id }).onConflictDoNothing();
}

export async function findUserByEmail(db: AnyDb, email: string) {
  const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`);
  return u;
}
