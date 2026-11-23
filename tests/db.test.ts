/**
 * Integration tests for database-level guarantees. Requires TEST_DATABASE_URL
 * (a disposable database — its public schema is dropped and recreated).
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { runMigrations } from "../scripts/migrate";
import { bootstrapReferenceData } from "@/db/bootstrap";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("database guards", () => {
  const sql = postgres(url!, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  let clubId: string;
  let otherClubId: string;

  beforeAll(async () => {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await runMigrations(url!);
    ({ clubId } = await bootstrapReferenceData(db));
    await bootstrapReferenceData(db); // idempotent
    const [org] = await db.select().from(schema.organizations);
    const [other] = await db.insert(schema.clubs).values({ organizationId: org.id, name: "Outro", slug: "outro" }).returning();
    otherClubId = other.id;
  });
  afterAll(() => sql.end());

  it("seeds reference data without fictional club data", async () => {
    expect(await db.select().from(schema.roles)).toHaveLength(7);
    expect((await db.select().from(schema.formations)).length).toBe(6);
    expect(await db.select().from(schema.players)).toHaveLength(0);
    expect(await db.select().from(schema.matches)).toHaveLength(0);
  });

  it("audit log is append-only", async () => {
    const [row] = await db.insert(schema.auditLogs).values({ action: "test", entityType: "x" }).returning();
    await expect(db.update(schema.auditLogs).set({ action: "tampered" }).where(eq(schema.auditLogs.id, row.id))).rejects.toThrow();
    await expect(db.delete(schema.auditLogs).where(eq(schema.auditLogs.id, row.id))).rejects.toThrow();
  });

  it("blocks linking a player to another club's match", async () => {
    const [p] = await db.insert(schema.players).values({ clubId: otherClubId, fullName: "X", nickname: "x", primaryPosition: "ST" }).returning();
    const [m] = await db.insert(schema.matches).values({ clubId, opponentName: "Y", kickoffAt: new Date(), status: "finished", goalsFor: 1, goalsAgainst: 0 }).returning();
    await expect(db.insert(schema.playerStatistics).values({ matchId: m.id, playerId: p.id, goals: 1 })).rejects.toThrow();
    await expect(db.insert(schema.matchPlayers).values({ matchId: m.id, playerId: p.id })).rejects.toThrow();
  });

  it("de-duplicates imported matches by external id", async () => {
    const base = { clubId, opponentName: "Z", kickoffAt: new Date(), source: "ea_fc" as const, externalId: "ea-123" };
    await db.insert(schema.matches).values(base);
    await expect(db.insert(schema.matches).values(base)).rejects.toThrow();
    // same external id in another club is fine
    await db.insert(schema.matches).values({ ...base, clubId: otherClubId });
  });

  it("requires a score for finished matches and keeps stats consistent", async () => {
    await expect(db.insert(schema.matches).values({ clubId, opponentName: "W", kickoffAt: new Date(), status: "finished" })).rejects.toThrow();
    const [p] = await db.insert(schema.players).values({ clubId, fullName: "A", nickname: "a", primaryPosition: "CM" }).returning();
    const [m] = await db.insert(schema.matches).values({ clubId, opponentName: "V", kickoffAt: new Date(), status: "finished", goalsFor: 0, goalsAgainst: 0 }).returning();
    await expect(db.insert(schema.playerStatistics).values({ matchId: m.id, playerId: p.id, shots: 1, shotsOnTarget: 2 })).rejects.toThrow();
  });

  it("allows only one current season per club", async () => {
    await db.insert(schema.seasons).values({ clubId, name: "S1", startsOn: "2026-01-01", isCurrent: true });
    await expect(db.insert(schema.seasons).values({ clubId, name: "S2", startsOn: "2026-06-01", isCurrent: true })).rejects.toThrow();
  });

  it("computes standings from fixtures", async () => {
    const [c] = await db.insert(schema.competitions).values({ clubId, name: "Liga" }).returning();
    const [a, b, x] = await db.insert(schema.competitionTeams).values([
      { competitionId: c.id, name: "Ascend CF", isOwnClub: true }, { competitionId: c.id, name: "B" }, { competitionId: c.id, name: "C" },
    ]).returning();
    await db.insert(schema.competitionFixtures).values([
      { competitionId: c.id, homeTeamId: a.id, awayTeamId: b.id, homeGoals: 2, awayGoals: 0 },
      { competitionId: c.id, homeTeamId: x.id, awayTeamId: a.id, homeGoals: 1, awayGoals: 1 },
      { competitionId: c.id, homeTeamId: b.id, awayTeamId: x.id }, // not played yet
    ]);
    const rows = await sql`select * from standings where competition_id = ${c.id} order by points desc, goal_difference desc`;
    expect(rows[0]).toMatchObject({ team_name: "Ascend CF", played: 2, won: 1, drawn: 1, lost: 0, goals_for: 3, goals_against: 1, points: 4 });
    expect(rows.find((r) => r.team_name === "B")).toMatchObject({ played: 1, lost: 1, points: 0 });
  });

  it("AP cost tables: verified revisions are immutable and old builds keep their table", async () => {
    const data = { attrs: { vision: { base: 60, max: 63, costs: [1, 2, 3] } }, levelBudget: { "10": 10 } };
    const key = { gameVersion: "TEST", season: "S1", archetype: "X" };
    const [v1] = await db.insert(schema.labCostTables).values({ ...key, revision: 1, data }).returning();
    // verifying requires a source and a date
    await expect(db.update(schema.labCostTables).set({ status: "verified" }).where(eq(schema.labCostTables.id, v1.id))).rejects.toThrow();
    await db.update(schema.labCostTables).set({ status: "verified", source: "fixture", verifiedOn: "2026-11-23" }).where(eq(schema.labCostTables.id, v1.id));
    // data can no longer change, nor can it be deleted or go back to draft
    await expect(db.update(schema.labCostTables).set({ data: { ...data, levelBudget: { "10": 99 } } }).where(eq(schema.labCostTables.id, v1.id))).rejects.toThrow();
    await expect(db.update(schema.labCostTables).set({ status: "draft" }).where(eq(schema.labCostTables.id, v1.id))).rejects.toThrow();
    await expect(db.delete(schema.labCostTables).where(eq(schema.labCostTables.id, v1.id))).rejects.toThrow();
    // same revision twice is refused; a new revision is the way to correct a table
    await expect(db.insert(schema.labCostTables).values({ ...key, revision: 1, data })).rejects.toThrow();
    const [v2] = await db.insert(schema.labCostTables).values({ ...key, revision: 2, data: { ...data, attrs: { vision: { base: 60, max: 63, costs: [5, 5, 5] } } } }).returning();
    // a build made with v1 keeps pointing to v1 (and v1 cannot be removed while in use)
    const [p] = await db.insert(schema.players).values({ clubId, fullName: "B", nickname: "builder", primaryPosition: "CAM" }).returning();
    const [b] = await db.insert(schema.labBuilds).values({ playerId: p.id, name: "Old", gameVersion: "TEST", costTableId: v1.id, purchases: { vision: 2 } }).returning();
    await db.update(schema.labCostTables).set({ status: "archived" }).where(eq(schema.labCostTables.id, v1.id));
    const [again] = await db.select().from(schema.labBuilds).where(eq(schema.labBuilds.id, b.id));
    expect(again.costTableId).toBe(v1.id);
    const [old] = await db.select().from(schema.labCostTables).where(eq(schema.labCostTables.id, v1.id));
    expect(old.data).toEqual(data);
    expect(v2.revision).toBe(2);
    // drafts are editable and deletable
    await db.update(schema.labCostTables).set({ notes: "ok", data }).where(eq(schema.labCostTables.id, v2.id));
    await db.delete(schema.labCostTables).where(eq(schema.labCostTables.id, v2.id));
  });
});
