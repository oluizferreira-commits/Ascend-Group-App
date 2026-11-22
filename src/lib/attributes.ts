/**
 * FUT-style card attributes derived ONLY from recorded statistics.
 * Each attribute is the player's relative position within the squad on a
 * 30–99 scale (30 = lowest of the squad, 99 = best). Missing data → null.
 */
import type { PlayerSeasonSummary } from "./rating";

export const ATTRIBUTES = {
  FIN: { label: "Finalização", hint: "gols por jogo" },
  CRI: { label: "Criação", hint: "assistências por jogo" },
  DEC: { label: "Decisão", hint: "participações em gols por jogo" },
  PAS: { label: "Passe", hint: "precisão de passe (mín. 20 passes)" },
  DEF: { label: "Defesa", hint: "desarmes + interceptações + cortes por jogo registrado" },
  REG: { label: "Regularidade", hint: "nota média − desvio (mín. 3 jogos)" },
} as const;
export type AttributeKey = keyof typeof ATTRIBUTES;
export type Attributes = Record<AttributeKey, number | null>;

export function rawAttributes(s: PlayerSeasonSummary): Attributes {
  if (s.matches === 0) return { FIN: null, CRI: null, DEC: null, PAS: null, DEF: null, REG: null };
  const o = s.optional;
  const passA = o.passesAttempted?.total ?? 0, passC = o.passesCompleted?.total ?? 0;
  const defRec = Math.max(o.tackles?.recordedIn ?? 0, o.interceptions?.recordedIn ?? 0, o.clearances?.recordedIn ?? 0);
  const defTotal = (o.tackles?.total ?? 0) + (o.interceptions?.total ?? 0) + (o.clearances?.total ?? 0);
  return {
    FIN: s.goalsPerMatch,
    CRI: s.assistsPerMatch,
    DEC: s.involvementsPerMatch,
    PAS: passA >= 20 ? passC / passA : null,
    DEF: defRec > 0 ? defTotal / defRec : null,
    REG: s.consistency,
  };
}

/** Converts raw values into 30–99 squad-relative scores. Ties share the same score. */
export function squadAttributes(summaries: PlayerSeasonSummary[]): Map<string, Attributes> {
  const raws = new Map(summaries.map((s) => [s.playerId, rawAttributes(s)]));
  const out = new Map<string, Attributes>();
  for (const id of raws.keys()) out.set(id, { FIN: null, CRI: null, DEC: null, PAS: null, DEF: null, REG: null });
  for (const key of Object.keys(ATTRIBUTES) as AttributeKey[]) {
    const vals = [...raws.entries()].filter(([, a]) => a[key] != null).map(([id, a]) => ({ id, v: a[key] as number }));
    if (!vals.length) continue;
    const n = vals.length;
    for (const { id, v } of vals) {
      const below = vals.filter((x) => x.v < v).length;
      const equal = vals.filter((x) => x.v === v).length - 1;
      const pct = n === 1 ? 0.5 : (below + equal / 2) / (n - 1);
      out.get(id)![key] = Math.round(30 + 69 * pct);
    }
  }
  return out;
}

/** Card headline number: the in-game overall when informed, otherwise average match rating × 10. */
export function cardOverall(overall: number | null, avgRating: number | null): { value: number | null; source: "ea" | "rating" | null } {
  if (overall != null) return { value: overall, source: "ea" };
  if (avgRating != null) return { value: Math.round(avgRating * 10), source: "rating" };
  return { value: null, source: null };
}

export type CardTier = "lenda" | "ascend" | "base";
export function cardTier(ovr: number | null): CardTier {
  if (ovr == null) return "base";
  return ovr >= 85 ? "lenda" : ovr >= 75 ? "ascend" : "base";
}
