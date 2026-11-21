import "server-only";
import { asc, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listFormations(clubId: string) {
  return db.select().from(schema.formations)
    .where(or(isNull(schema.formations.clubId), eq(schema.formations.clubId, clubId)))
    .orderBy(asc(schema.formations.code));
}

export async function listCompetitions(clubId: string) {
  return db.select().from(schema.competitions).where(eq(schema.competitions.clubId, clubId)).orderBy(asc(schema.competitions.name));
}
