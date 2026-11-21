"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { AppError, type ActionResult } from "../errors";
import { TEAM_STAT_KEYS, matchSchema, sheetSchema, validateSheetAgainstScore } from "@/lib/validation/match";
import { parseLocalInput } from "@/lib/format";
import type { AuthContext } from "../auth/session";

type MatchInput = z.infer<typeof matchSchema>;

async function assertRefs(ctx: AuthContext, d: MatchInput) {
  if (d.seasonId) {
    const [s] = await db.select({ id: schema.seasons.id }).from(schema.seasons).where(and(eq(schema.seasons.id, d.seasonId), eq(schema.seasons.clubId, ctx.club.id)));
    if (!s) throw new AppError("Temporada inválida.", "validation");
  }
  if (d.competitionId) {
    const [c] = await db.select({ id: schema.competitions.id }).from(schema.competitions).where(and(eq(schema.competitions.id, d.competitionId), eq(schema.competitions.clubId, ctx.club.id)));
    if (!c) throw new AppError("Competição inválida.", "validation");
  }
  if (d.formationId) {
    const [f] = await db.select({ id: schema.formations.id }).from(schema.formations)
      .where(and(eq(schema.formations.id, d.formationId), or(isNull(schema.formations.clubId), eq(schema.formations.clubId, ctx.club.id))));
    if (!f) throw new AppError("Formação inválida.", "validation");
  }
}

function toRow(d: MatchInput) {
  const kickoffAt = parseLocalInput(d.kickoff);
  if (!kickoffAt) throw new AppError("Data/hora inválida.", "validation");
  const teamStats: Record<string, number> = {};
  for (const k of Object.keys(TEAM_STAT_KEYS)) {
    const v = (d as Record<string, unknown>)[`team_${k}`];
    if (typeof v === "number") teamStats[k] = v;
  }
  if (teamStats.possession != null && teamStats.possession > 100) throw new AppError("Posse de bola deve ser no máximo 100%.", "validation");
  if (teamStats.passAccuracy != null && teamStats.passAccuracy > 100) throw new AppError("Precisão de passe deve ser no máximo 100%.", "validation");
  const keepScore = d.status === "finished";
  return {
    opponentName: d.opponentName, kickoffAt, status: d.status,
    goalsFor: keepScore ? d.goalsFor : null, goalsAgainst: keepScore ? d.goalsAgainst : null,
    seasonId: d.seasonId, competitionId: d.competitionId, formationId: d.formationId, round: d.round, notes: d.notes, teamStats,
  };
}

function fail(e: unknown): ActionResult {
  if (e instanceof AppError) return { ok: false, error: e.message };
  throw e;
}

export async function createMatchAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("matches.manage");
  const parsed = matchSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  let id: string;
  try {
    await assertRefs(ctx, parsed.data);
    const [m] = await db.insert(schema.matches).values({ ...toRow(parsed.data), clubId: ctx.club.id, createdBy: ctx.user.id, source: "manual" }).returning({ id: schema.matches.id });
    id = m.id;
    await audit(ctx, "match.create", "match", id, { opponent: parsed.data.opponentName, status: parsed.data.status });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app/partidas");
  redirect(`/app/partidas/${id}`);
}

export async function updateMatchAction(matchId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("matches.manage");
  const parsed = matchSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await assertRefs(ctx, parsed.data);
    const row = toRow(parsed.data);
    // Keep the sheet consistent with a changed score.
    const sheet = await db.select().from(schema.playerStatistics).where(eq(schema.playerStatistics.matchId, matchId));
    const errs = validateSheetAgainstScore(sheet.map((s) => ({ ...s, role: "starter", position: null, isCaptain: false, minutesPlayed: null })), row.goalsFor);
    if (errs.length) return { ok: false, error: `O novo placar conflita com a súmula: ${errs.join(" ")}` };
    const [before] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
    if (!before) return { ok: false, error: "Partida não encontrada." };
    await db.update(schema.matches).set(row).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
    await audit(ctx, "match.update", "match", matchId, {
      before: { status: before.status, score: [before.goalsFor, before.goalsAgainst] },
      after: { status: row.status, score: [row.goalsFor, row.goalsAgainst] },
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/app/partidas");
  redirect(`/app/partidas/${matchId}`);
}

export async function deleteMatchAction(matchId: string): Promise<void> {
  const ctx = await requireAction("matches.manage");
  const [m] = await db.delete(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id))).returning();
  if (m) await audit(ctx, "match.delete", "match", matchId, { opponent: m.opponentName, kickoffAt: m.kickoffAt, score: [m.goalsFor, m.goalsAgainst], source: m.source });
  revalidatePath("/app/partidas");
  redirect("/app/partidas");
}

/** Replaces the participants + individual statistics of a match atomically. */
export async function saveMatchSheetAction(matchId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("stats.manage");
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("sheet") ?? "[]"));
  } catch {
    return { ok: false, error: "Dados da súmula inválidos." };
  }
  const parsed = sheetSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `Súmula inválida: ${first?.message ?? "verifique os valores"}.` };
  }
  const [match] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
  if (!match) return { ok: false, error: "Partida não encontrada." };
  const errs = validateSheetAgainstScore(parsed.data, match.goalsFor);
  if (errs.length) return { ok: false, error: errs.join(" ") };

  await db.transaction(async (tx) => {
    await tx.delete(schema.playerStatistics).where(eq(schema.playerStatistics.matchId, matchId));
    await tx.delete(schema.matchPlayers).where(eq(schema.matchPlayers.matchId, matchId));
    if (parsed.data.length === 0) return;
    // DB triggers additionally guarantee every player belongs to this club.
    await tx.insert(schema.matchPlayers).values(parsed.data.map((r) => ({
      matchId, playerId: r.playerId, role: r.role, position: r.position, isCaptain: r.isCaptain, minutesPlayed: r.minutesPlayed,
    })));
    const played = parsed.data.filter((r) => r.role !== "unused");
    if (played.length) {
      await tx.insert(schema.playerStatistics).values(played.map((r) => ({
        matchId, playerId: r.playerId, goals: r.goals, assists: r.assists, shots: r.shots, shotsOnTarget: r.shotsOnTarget,
        passesAttempted: r.passesAttempted, passesCompleted: r.passesCompleted, tackles: r.tackles, interceptions: r.interceptions,
        clearances: r.clearances, saves: r.saves, goalsConceded: r.goalsConceded, cleanSheet: r.cleanSheet,
        yellowCards: r.yellowCards, redCards: r.redCards, externalRating: r.externalRating, isMotm: r.isMotm, source: "manual" as const,
      })));
    }
    await audit(ctx, "match.sheet_save", "match", matchId, { participants: parsed.data.length, played: played.length }, tx);
  });
  revalidatePath(`/app/partidas/${matchId}`);
  return { ok: true, message: "Súmula salva." };
}
