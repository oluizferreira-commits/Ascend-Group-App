"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { pgErrorCode, type ActionResult } from "../errors";
import { checkbox, optionalDate, optionalInt, optionalText } from "@/lib/validation/common";
import { POSITION_GROUPS } from "@/lib/domain";
import { METRICS, type MetricKey } from "@/lib/rating";

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40),
  startsOn: z.iso.date("Data inválida"),
  endsOn: optionalDate,
  division: optionalText(60),
  leaguePosition: optionalInt(1, 500),
  isCurrent: checkbox,
}).refine((d) => !d.endsOn || d.endsOn >= d.startsOn, { path: ["endsOn"], message: "Término antes do início" });

export async function saveSeasonAction(seasonId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("seasons.manage");
  const parsed = seasonSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await db.transaction(async (tx) => {
      if (parsed.data.isCurrent) {
        await tx.update(schema.seasons).set({ isCurrent: false }).where(eq(schema.seasons.clubId, ctx.club.id));
      }
      if (seasonId) {
        const [s] = await tx.update(schema.seasons).set(parsed.data).where(and(eq(schema.seasons.id, seasonId), eq(schema.seasons.clubId, ctx.club.id))).returning();
        if (!s) throw new Error("not found");
        await audit(ctx, "season.update", "season", seasonId, parsed.data, tx);
      } else {
        const [s] = await tx.insert(schema.seasons).values({ ...parsed.data, clubId: ctx.club.id }).returning();
        await audit(ctx, "season.create", "season", s.id, parsed.data, tx);
      }
    });
  } catch (e) {
    if (pgErrorCode(e) === "23505") return { ok: false, error: "Já existe uma temporada com esse nome.", fieldErrors: { name: ["Nome em uso"] } };
    throw e;
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Temporada salva." };
}

const weightSchema = z.coerce.number().min(-5).max(5);

export async function saveRatingConfigAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("ratings.configure");
  const settings = z.object({ externalWeight: z.coerce.number().int().min(0).max(100), minMatchesPct: z.coerce.number().int().min(0).max(100) })
    .safeParse({ externalWeight: form.get("externalWeight"), minMatchesPct: form.get("minMatchesPct") });
  if (!settings.success) return { ok: false, error: "Parâmetros gerais inválidos (0 a 100)." };
  const next: Record<string, Record<string, number>> = {};
  for (const g of POSITION_GROUPS) {
    next[g] = {};
    for (const m of Object.keys(METRICS) as MetricKey[]) {
      const raw = form.get(`${g}.${m}`);
      if (raw === null || raw === "") continue;
      const w = weightSchema.safeParse(String(raw).replace(",", "."));
      if (!w.success) return { ok: false, error: `Peso inválido em ${g} / ${METRICS[m].label} (use −5 a 5).` };
      if (w.data !== 0) next[g][m] = w.data;
    }
  }
  await db.transaction(async (tx) => {
    for (const g of POSITION_GROUPS) {
      await tx.insert(schema.ratingProfiles).values({ clubId: ctx.club.id, positionGroup: g, weights: next[g], updatedBy: ctx.user.id })
        .onConflictDoUpdate({ target: [schema.ratingProfiles.clubId, schema.ratingProfiles.positionGroup], set: { weights: next[g], updatedBy: ctx.user.id, updatedAt: new Date() } });
    }
    await tx.insert(schema.ratingSettings).values({ clubId: ctx.club.id, externalRatingWeight: settings.data.externalWeight, minMatchesPct: settings.data.minMatchesPct })
      .onConflictDoUpdate({ target: schema.ratingSettings.clubId, set: { externalRatingWeight: settings.data.externalWeight, minMatchesPct: settings.data.minMatchesPct, updatedAt: new Date() } });
    await audit(ctx, "ratings.configure", "rating_profiles", null, { weights: next, ...settings.data }, tx);
  });
  revalidatePath("/app", "layout");
  return { ok: true, message: "Critérios salvos. Rankings e notas foram recalculados." };
}

import { getSeasonStats } from "../services/stats";
import { fmtNum } from "@/lib/format";

/** Freezes the season's award winners into season_awards (re-running replaces them). */
export async function closeSeasonAwardsAction(seasonId: string): Promise<void> {
  const ctx = await requireAction("seasons.manage");
  const [season] = await db.select().from(schema.seasons).where(and(eq(schema.seasons.id, seasonId), eq(schema.seasons.clubId, ctx.club.id)));
  if (!season) return;
  const st = await getSeasonStats({ clubId: ctx.club.id, seasonId });
  const r = st.rankings;
  type S = (typeof r.best)[number];
  const defs: [string, S | undefined, (s: S) => string][] = [
    ["Melhor jogador", r.best[0], (s) => `nota ${fmtNum(s.avgRating, 1)}`],
    ["Artilheiro", r.scorers[0], (s) => `${s.goals} gols`],
    ["Melhor assistente", r.assisters[0], (s) => `${s.assists} assistências`],
    ["Mais decisivo", r.decisive[0], (s) => `${s.goalInvolvements} G+A`],
    ["Melhor atacante", r.bestByGroup.ATT[0], (s) => `nota ${fmtNum(s.avgRating, 1)}`],
    ["Melhor meio-campista", r.bestByGroup.MID[0], (s) => `nota ${fmtNum(s.avgRating, 1)}`],
    ["Melhor defensor", r.bestByGroup.DEF[0], (s) => `nota ${fmtNum(s.avgRating, 1)}`],
    ["Melhor goleiro", r.bestByGroup.GK[0], (s) => `nota ${fmtNum(s.avgRating, 1)}`],
    ["Mais regular", r.regular[0], (s) => `índice ${fmtNum(s.consistency, 2)}`],
  ];
  const rows = defs.filter(([, s]) => s).map(([award, s, v]) => ({
    clubId: ctx.club.id, seasonId, award, playerId: s!.playerId, playerName: st.playerMap.get(s!.playerId)!.nickname, value: v(s!),
  }));
  await db.transaction(async (tx) => {
    await tx.delete(schema.seasonAwards).where(eq(schema.seasonAwards.seasonId, seasonId));
    if (rows.length) await tx.insert(schema.seasonAwards).values(rows);
    await audit(ctx, "season.awards_close", "season", seasonId, { awards: rows.map((x) => `${x.award}: ${x.playerName}`) }, tx);
  });
  revalidatePath("/app", "layout");
}
