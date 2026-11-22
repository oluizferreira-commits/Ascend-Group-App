/**
 * Ascend rating engine — configurable, position-aware, and honest about
 * missing data: a metric that was not recorded (null) contributes nothing,
 * it is never treated as zero.
 *
 *   computed = clamp(BASE + Σ weight[m] · value[m], 0, 10)
 *   final    = externalRating present
 *                ? w · externalRating + (1 − w) · computed
 *                : computed
 */
import type { MatchResult, PositionGroup } from "./domain";

export const BASE_RATING = 6;

export const METRICS = {
  goals: { label: "Gols", unit: "por gol" },
  assists: { label: "Assistências", unit: "por assistência" },
  shotsOnTarget: { label: "Finalizações no alvo", unit: "por finalização" },
  shotAccuracy: { label: "Precisão de finalização", unit: "por 10 p.p. acima de 50%" },
  passAccuracy: { label: "Precisão de passe", unit: "por 10 p.p. acima de 75%" },
  passesCompleted: { label: "Passes certos", unit: "por 10 passes" },
  tackles: { label: "Desarmes", unit: "por desarme" },
  interceptions: { label: "Interceptações", unit: "por interceptação" },
  clearances: { label: "Cortes", unit: "por corte" },
  saves: { label: "Defesas", unit: "por defesa" },
  cleanSheet: { label: "Jogo sem sofrer gols", unit: "por jogo" },
  goalsConceded: { label: "Gols sofridos", unit: "por gol sofrido" },
  yellowCards: { label: "Cartão amarelo", unit: "por cartão" },
  redCards: { label: "Cartão vermelho", unit: "por cartão" },
  result: { label: "Resultado da equipe", unit: "vitória +1 · derrota −1" },
  motm: { label: "Melhor em campo", unit: "por prêmio" },
} as const;
export type MetricKey = keyof typeof METRICS;
export type Weights = Partial<Record<MetricKey, number>>;

const discipline: Weights = { yellowCards: -0.2, redCards: -1.5, result: 0.4, motm: 0.5 };

export const DEFAULT_WEIGHTS: Record<PositionGroup, Weights> = {
  GK: { saves: 0.25, cleanSheet: 1.2, goalsConceded: -0.4, passAccuracy: 0.15, goals: 1, assists: 0.6, ...discipline },
  DEF: {
    tackles: 0.2, interceptions: 0.2, clearances: 0.12, cleanSheet: 0.8, goalsConceded: -0.25,
    passAccuracy: 0.2, goals: 1, assists: 0.6, ...discipline,
  },
  MID: {
    goals: 0.9, assists: 0.8, passAccuracy: 0.3, passesCompleted: 0.1, tackles: 0.12,
    interceptions: 0.12, shotsOnTarget: 0.15, ...discipline,
  },
  ATT: {
    goals: 1.1, assists: 0.7, shotsOnTarget: 0.2, shotAccuracy: 0.3, passAccuracy: 0.1, tackles: 0.05, ...discipline,
  },
};

export type MatchStatLine = {
  goals: number;
  assists: number;
  shots?: number | null;
  shotsOnTarget?: number | null;
  passesAttempted?: number | null;
  passesCompleted?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
  clearances?: number | null;
  saves?: number | null;
  goalsConceded?: number | null;
  cleanSheet?: boolean | null;
  yellowCards?: number | null;
  redCards?: number | null;
  externalRating?: number | null;
  isMotm?: boolean | null;
  result: MatchResult;
};

/** Value of each metric for a stat line; `null` when the metric was not recorded. */
export function metricValues(s: MatchStatLine): Record<MetricKey, number | null> {
  const n = (v: number | null | undefined) => (v === null || v === undefined ? null : v);
  return {
    goals: s.goals,
    assists: s.assists,
    shotsOnTarget: n(s.shotsOnTarget),
    shotAccuracy: s.shots && s.shotsOnTarget != null ? (s.shotsOnTarget / s.shots - 0.5) * 10 : null,
    passAccuracy:
      s.passesAttempted && s.passesAttempted >= 5 && s.passesCompleted != null
        ? ((s.passesCompleted / s.passesAttempted) * 100 - 75) / 10
        : null,
    passesCompleted: s.passesCompleted == null ? null : s.passesCompleted / 10,
    tackles: n(s.tackles),
    interceptions: n(s.interceptions),
    clearances: n(s.clearances),
    saves: n(s.saves),
    cleanSheet: s.cleanSheet == null ? null : s.cleanSheet ? 1 : 0,
    goalsConceded: n(s.goalsConceded),
    yellowCards: n(s.yellowCards),
    redCards: n(s.redCards),
    result: s.result === "W" ? 1 : s.result === "L" ? -1 : 0,
    motm: s.isMotm == null ? null : s.isMotm ? 1 : 0,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function computeMatchRating(s: MatchStatLine, weights: Weights, externalWeight = 0.5) {
  const values = metricValues(s);
  let sum = 0;
  for (const [k, w] of Object.entries(weights) as [MetricKey, number][]) {
    const v = values[k];
    if (v !== null && Number.isFinite(w)) sum += w * v;
  }
  const computed = clamp(BASE_RATING + sum, 0, 10);
  const ext = s.externalRating;
  const final = ext != null ? clamp(externalWeight, 0, 1) * ext + (1 - clamp(externalWeight, 0, 1)) * computed : computed;
  return { computed: round1(computed), final: round1(final) };
}

// ─── Season aggregation ─────────────────────────────────────────────────────

export type PlayerSeasonInput = {
  playerId: string;
  group: PositionGroup;
  lines: MatchStatLine[];
};

export type PlayerSeasonSummary = {
  playerId: string;
  group: PositionGroup;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  goalInvolvements: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  involvementsPerMatch: number;
  avgRating: number | null;
  ratingStdDev: number | null;
  consistency: number | null;
  /** Totals of optional metrics, with the number of matches in which each was recorded. */
  optional: Record<string, { total: number; recordedIn: number }>;
};

const OPTIONAL_TOTALS = [
  "shots", "shotsOnTarget", "passesAttempted", "passesCompleted", "tackles", "interceptions",
  "clearances", "saves", "yellowCards", "redCards",
] as const;

export function summarizeSeason(
  input: PlayerSeasonInput,
  weightsByGroup: Record<PositionGroup, Weights>,
  externalWeight = 0.5,
): PlayerSeasonSummary {
  const { lines } = input;
  const m = lines.length;
  const goals = lines.reduce((a, l) => a + l.goals, 0);
  const assists = lines.reduce((a, l) => a + l.assists, 0);
  const ratings = lines.map((l) => computeMatchRating(l, weightsByGroup[input.group], externalWeight).final);
  const avg = m ? ratings.reduce((a, b) => a + b, 0) / m : null;
  const sd = m >= 2 && avg !== null ? Math.sqrt(ratings.reduce((a, r) => a + (r - avg) ** 2, 0) / m) : null;
  const optional: PlayerSeasonSummary["optional"] = {};
  for (const key of OPTIONAL_TOTALS) {
    let total = 0;
    let recordedIn = 0;
    for (const l of lines) {
      const v = l[key];
      if (v != null) {
        total += v;
        recordedIn++;
      }
    }
    optional[key] = { total, recordedIn };
  }
  const cs = lines.filter((l) => l.cleanSheet != null);
  optional.cleanSheets = { total: cs.filter((l) => l.cleanSheet).length, recordedIn: cs.length };
  const mm = lines.filter((l) => l.isMotm != null);
  optional.motm = { total: mm.filter((l) => l.isMotm).length, recordedIn: mm.length };
  const div = (a: number) => (m ? Math.round((a / m) * 100) / 100 : 0);
  return {
    playerId: input.playerId,
    group: input.group,
    matches: m,
    wins: lines.filter((l) => l.result === "W").length,
    draws: lines.filter((l) => l.result === "D").length,
    losses: lines.filter((l) => l.result === "L").length,
    goals,
    assists,
    goalInvolvements: goals + assists,
    goalsPerMatch: div(goals),
    assistsPerMatch: div(assists),
    involvementsPerMatch: div(goals + assists),
    avgRating: avg === null ? null : round1(avg),
    ratingStdDev: sd === null ? null : Math.round(sd * 100) / 100,
    // "Mais regular": a high average with low variance (avg − σ). Requires ≥ 3 matches.
    consistency: m >= 3 && avg !== null && sd !== null ? Math.round((avg - sd) * 100) / 100 : null,
    optional,
  };
}

export function eligibilityThreshold(clubMatches: number, minPct: number) {
  return Math.max(1, Math.ceil((clubMatches * clamp(minPct, 0, 100)) / 100));
}

export type Rankings = ReturnType<typeof buildRankings>;

export function buildRankings(summaries: PlayerSeasonSummary[], clubMatches: number, minPct: number) {
  const threshold = eligibilityThreshold(clubMatches, minPct);
  const played = summaries.filter((s) => s.matches > 0);
  const eligible = played.filter((s) => s.matches >= threshold && s.avgRating !== null);
  const byRating = (a: PlayerSeasonSummary, b: PlayerSeasonSummary) =>
    (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.matches - a.matches;
  const nonZero = (key: "goals" | "assists" | "goalInvolvements") => played.filter((s) => s[key] > 0);
  return {
    threshold,
    best: [...eligible].sort(byRating),
    bestByGroup: {
      ATT: eligible.filter((s) => s.group === "ATT").sort(byRating),
      MID: eligible.filter((s) => s.group === "MID").sort(byRating),
      DEF: eligible.filter((s) => s.group === "DEF").sort(byRating),
      GK: eligible.filter((s) => s.group === "GK").sort(byRating),
    },
    scorers: nonZero("goals").sort((a, b) => b.goals - a.goals || a.matches - b.matches),
    assisters: nonZero("assists").sort((a, b) => b.assists - a.assists || a.matches - b.matches),
    decisive: nonZero("goalInvolvements").sort(
      (a, b) => b.goalInvolvements - a.goalInvolvements || b.involvementsPerMatch - a.involvementsPerMatch,
    ),
    regular: eligible.filter((s) => s.consistency !== null).sort((a, b) => b.consistency! - a.consistency!),
  };
}
