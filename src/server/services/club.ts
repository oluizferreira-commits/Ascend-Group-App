import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function getClubOverview(clubId: string) {
  const [row] = await db
    .select({ club: schema.clubs, org: schema.organizations })
    .from(schema.clubs)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.clubs.organizationId))
    .where(eq(schema.clubs.id, clubId));
  const [season] = await db.select().from(schema.seasons)
    .where(and(eq(schema.seasons.clubId, clubId), eq(schema.seasons.isCurrent, true)));
  return { ...row, currentSeason: season ?? null };
}

export async function listSeasons(clubId: string) {
  return db.select().from(schema.seasons).where(eq(schema.seasons.clubId, clubId)).orderBy(desc(schema.seasons.startsOn));
}

/** The first club (public pages show the flagship club). */
export async function getPublicClub() {
  const [row] = await db
    .select({ club: schema.clubs, org: schema.organizations })
    .from(schema.clubs)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.clubs.organizationId))
    .orderBy(schema.clubs.createdAt)
    .limit(1);
  return row ?? null;
}
