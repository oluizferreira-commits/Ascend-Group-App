/**
 * Idempotent import pipeline shared by every ingestion path (server fetch,
 * local agent, pasted JSON). Safe to re-run: existing matches are never
 * duplicated or overwritten; only stats for newly linked players are added.
 */
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { eaMatchListSchema, EA_MATCH_TYPE_LABELS, type EaMatchType } from "./types";
import { mapMatch, type MappedPlayerLine } from "./mapper";

type AnyDb = PostgresJsDatabase<typeof schema>;

export type ImportSummary = {
  found: number;
  created: number;
  skipped: number;
  statsAdded: number;
  invalid: { matchId: string; reason: string }[];
  unmatchedPlayers: { eaName: string; matches: number; goals: number; assists: number }[];
};

export type ImportInput = {
  clubId: string;
  eaClubId: string;
  matchType: EaMatchType;
  payload: unknown;
};

async function ensureCompetition(tx: AnyDb, clubId: string, matchType: EaMatchType, seasonId: string | null) {
  const name = EA_MATCH_TYPE_LABELS[matchType];
  const [existing] = await tx.select().from(schema.competitions).where(and(
    eq(schema.competitions.clubId, clubId), eq(schema.competitions.name, name),
    seasonId ? eq(schema.competitions.seasonId, seasonId) : sql`${schema.competitions.seasonId} is null`,
  ));
  if (existing) return existing.id;
  const [c] = await tx.insert(schema.competitions).values({
    clubId, seasonId, name, format: matchType === "friendlyMatch" ? "friendly" : "ea_division",
    notes: "Criada automaticamente pela integração EA FC.",
  }).returning();
  return c.id;
}

function seasonFor(seasons: (typeof schema.seasons.$inferSelect)[], when: Date) {
  const day = when.toISOString().slice(0, 10);
  return seasons.find((s) => s.startsOn <= day && (!s.endsOn || s.endsOn >= day)) ?? null;
}

function statRow(matchId: string, playerId: string, l: MappedPlayerLine) {
  const { eaName: _n, minutesPlayed: _m, ...stats } = l;
  void _n; void _m;
  return { matchId, playerId, ...stats, source: "ea_fc" as const };
}

export async function importEaMatches(db: AnyDb, input: ImportInput): Promise<ImportSummary> {
  const parsed = eaMatchListSchema.safeParse(input.payload);
  if (!parsed.success) {
    throw new Error(`Formato de partidas da EA não reconhecido: ${parsed.error.issues[0]?.message ?? "JSON inválido"}. Envie a resposta do endpoint clubs/matches.`);
  }
  const summary: ImportSummary = { found: parsed.data.length, created: 0, skipped: 0, statsAdded: 0, invalid: [], unmatchedPlayers: [] };
  const unmatched = new Map<string, ImportSummary["unmatchedPlayers"][number]>();

  const roster = await db.select({ id: schema.players.id, eaName: schema.players.eaName }).from(schema.players)
    .where(and(eq(schema.players.clubId, input.clubId), isNotNull(schema.players.eaName)));
  const byEaName = new Map(roster.map((p) => [p.eaName!.trim().toLowerCase(), p.id]));
  const seasons = await db.select().from(schema.seasons).where(eq(schema.seasons.clubId, input.clubId));

  for (const raw of parsed.data) {
    const mapped = mapMatch(raw, input.eaClubId);
    if (!mapped.ok) {
      summary.invalid.push({ matchId: raw.matchId, reason: mapped.reason });
      continue;
    }
    const m = mapped.match;
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: schema.matches.id }).from(schema.matches).where(and(
        eq(schema.matches.clubId, input.clubId), eq(schema.matches.source, "ea_fc"), eq(schema.matches.externalId, m.externalId),
      ));
      let matchId: string;
      if (existing) {
        matchId = existing.id;
        summary.skipped++;
      } else {
        const season = seasonFor(seasons, m.kickoffAt);
        const competitionId = await ensureCompetition(tx as unknown as AnyDb, input.clubId, input.matchType, season?.id ?? null);
        const [created] = await tx.insert(schema.matches).values({
          clubId: input.clubId, seasonId: season?.id ?? null, competitionId, opponentName: m.opponentName.slice(0, 80),
          kickoffAt: m.kickoffAt, status: "finished", goalsFor: m.goalsFor, goalsAgainst: m.goalsAgainst,
          source: "ea_fc", externalId: m.externalId,
        }).onConflictDoNothing().returning({ id: schema.matches.id });
        if (!created) { summary.skipped++; return; } // concurrent import won the race
        matchId = created.id;
        summary.created++;
      }

      // Goals attributed must never exceed the score (protects against odd source data).
      const [already] = await tx.select({
        g: sql<number>`coalesce(sum(${schema.playerStatistics.goals}),0)::int`,
        a: sql<number>`coalesce(sum(${schema.playerStatistics.assists}),0)::int`,
      }).from(schema.playerStatistics).where(eq(schema.playerStatistics.matchId, matchId));
      let goalsLeft = Math.max(0, m.goalsFor - already.g), assistsLeft = Math.max(0, m.goalsFor - already.a);
      for (const line of m.players) {
        const playerId = byEaName.get(line.eaName.toLowerCase());
        if (!playerId) {
          const u = unmatched.get(line.eaName.toLowerCase()) ?? { eaName: line.eaName, matches: 0, goals: 0, assists: 0 };
          u.matches++; u.goals += line.goals; u.assists += line.assists;
          unmatched.set(line.eaName.toLowerCase(), u);
          continue;
        }
        const goals = Math.min(line.goals, goalsLeft), assists = Math.min(line.assists, assistsLeft);
        goalsLeft -= goals; assistsLeft -= assists;
        await tx.insert(schema.matchPlayers).values({ matchId, playerId, role: "starter", minutesPlayed: line.minutesPlayed }).onConflictDoNothing();
        const inserted = await tx.insert(schema.playerStatistics).values(statRow(matchId, playerId, { ...line, goals, assists }))
          .onConflictDoNothing().returning({ id: schema.playerStatistics.id });
        summary.statsAdded += inserted.length;
      }
    });
  }
  summary.unmatchedPlayers = [...unmatched.values()].sort((a, b) => b.matches - a.matches);
  return summary;
}
