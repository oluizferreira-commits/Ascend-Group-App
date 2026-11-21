import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { runMigrations } from "../scripts/migrate";
import { bootstrapReferenceData } from "@/db/bootstrap";
import { importEaMatches } from "@/integrations/ea-fc/importer";
import fixture from "./fixtures/ea-matches.synthetic.json";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("EA import pipeline", () => {
  const sql = postgres(url!, { max: 1, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  let clubId: string;

  beforeAll(async () => {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await runMigrations(url!);
    ({ clubId } = await bootstrapReferenceData(db));
    await db.insert(schema.seasons).values({ clubId, name: "T", startsOn: "2026-01-01", isCurrent: true });
    await db.insert(schema.players).values([
      { clubId, fullName: "A", nickname: "st", eaName: "testest", primaryPosition: "ST" },
      { clubId, fullName: "B", nickname: "cm", eaName: "TesteCM", primaryPosition: "CM" },
    ]);
  });
  afterAll(() => sql.end());

  it("imports matches, links players case-insensitively, reports unmatched", async () => {
    const r = await importEaMatches(db, { clubId, eaClubId: "111", matchType: "leagueMatch", payload: fixture });
    expect(r).toMatchObject({ found: 3, created: 2, skipped: 0 });
    expect(r.invalid).toHaveLength(1);
    expect(r.unmatchedPlayers.map((u) => u.eaName)).toEqual(["SemCadastro"]);
    const matches = await db.select().from(schema.matches);
    expect(matches.every((m) => m.source === "ea_fc" && m.seasonId && m.competitionId)).toBe(true);
    expect(await db.select().from(schema.playerStatistics)).toHaveLength(3);
  });

  it("is idempotent", async () => {
    const r = await importEaMatches(db, { clubId, eaClubId: "111", matchType: "leagueMatch", payload: fixture });
    expect(r).toMatchObject({ created: 0, skipped: 2, statsAdded: 0 });
    expect(await db.select().from(schema.matches)).toHaveLength(2);
  });

  it("reprocessing after linking a player adds only the missing stats, within the score", async () => {
    await db.insert(schema.players).values({ clubId, fullName: "C", nickname: "cb", eaName: "SemCadastro", primaryPosition: "CB" });
    const r = await importEaMatches(db, { clubId, eaClubId: "111", matchType: "leagueMatch", payload: fixture });
    expect(r.statsAdded).toBe(1);
    expect(r.unmatchedPlayers).toHaveLength(0);
    const [m] = await db.select().from(schema.matches).where(eq(schema.matches.externalId, "900001"));
    const stats = await db.select().from(schema.playerStatistics).where(eq(schema.playerStatistics.matchId, m.id));
    expect(stats.reduce((a, s) => a + s.goals, 0)).toBeLessThanOrEqual(3);
    expect(stats.reduce((a, s) => a + s.assists, 0)).toBeLessThanOrEqual(3);
  });

  it("rejects payloads that are not a match list", async () => {
    await expect(importEaMatches(db, { clubId, eaClubId: "111", matchType: "leagueMatch", payload: { error: "x" } })).rejects.toThrow(/não reconhecido/);
  });
});
