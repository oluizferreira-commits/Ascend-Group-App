/**
 * Statistics Analyzer — turns a player's real match lines into comparable metrics.
 *
 * - Ratios use the sum of the window (Σ completed / Σ attempted), not the mean of match ratios.
 * - Every metric reports how many matches actually had the data (`n`) — NULL is "not recorded",
 *   never zero. Below the metric's minimum sample the value is null ("dados insuficientes").
 * - "Por jogo" values: EA records full matches (≈90 min), so per-match ≈ per-90 for Clubs.
 *   When minutes are known for every match in the window we use true per-90.
 */
import type { MatchResult, PositionGroup } from "@/lib/domain";

export type LabStatLine = {
  goals: number; assists: number;
  shots: number | null; shotsOnTarget: number | null;
  passesAttempted: number | null; passesCompleted: number | null;
  tackles: number | null; tacklesAttempted: number | null; interceptions: number | null; clearances: number | null;
  saves: number | null; goalsConceded: number | null; cleanSheet: boolean | null;
  isMotm: boolean | null;
};

export type LabMatch = {
  matchId: string; kickoffAt: Date; opponent: string; result: MatchResult;
  minutes: number | null;
  /** Final match rating from the club's rating system (0–10). */
  rating: number | null;
  s: LabStatLine;
  source: "ea_fc" | "manual" | string;
};

export const METRIC_GROUPS = { general: "Geral", passing: "Passes", finishing: "Finalização", possession: "Dribles e posse", defense: "Defesa", goalkeeping: "Goleiro" } as const;
export type MetricGroup = keyof typeof METRIC_GROUPS;

export type MetricValue = { value: number | null; n: number; num?: number; den?: number };

export type MetricDef = {
  key: string;
  label: string;
  short: string;
  group: MetricGroup;
  unit: "%" | "/jogo" | "nota" | "";
  decimals: number;
  better: "up" | "down";
  /** Position groups where the metric is a fair indicator. */
  relevant: PositionGroup[];
  /** Minimum matches with data in a window before showing a value. */
  minN: number;
  /** Where the data comes from (shown to the player). */
  origin: "ea" | "ea+manual" | "manual";
  compute: (w: LabMatch[]) => MetricValue;
  /** Per-match value, used for variability/trend tests. */
  perMatch?: (m: LabMatch) => number | null;
};

const ALL: PositionGroup[] = ["GK", "DEF", "MID", "ATT"];
const OUTFIELD: PositionGroup[] = ["DEF", "MID", "ATT"];

function sumOf(w: LabMatch[], f: (m: LabMatch) => number | null) {
  let total = 0, n = 0;
  for (const m of w) { const v = f(m); if (v != null) { total += v; n++; } }
  return { total, n };
}

/** Per-90 when minutes are known for all matches with data; per match otherwise. */
function rate(w: LabMatch[], f: (m: LabMatch) => number | null): MetricValue {
  const withData = w.filter((m) => f(m) != null);
  if (withData.length === 0) return { value: null, n: 0 };
  const { total } = sumOf(withData, f);
  const mins = withData.every((m) => m.minutes != null && m.minutes > 0) ? withData.reduce((a, m) => a + m.minutes!, 0) : null;
  const value = mins ? (total / mins) * 90 : total / withData.length;
  return { value, n: withData.length, num: total, den: mins ?? withData.length };
}

function ratio(w: LabMatch[], num: (m: LabMatch) => number | null, den: (m: LabMatch) => number | null, minDen: number): MetricValue {
  let a = 0, b = 0, n = 0;
  for (const m of w) {
    const x = num(m), y = den(m);
    if (x == null || y == null) continue;
    a += x; b += y; n++;
  }
  if (b < minDen) return { value: null, n, num: a, den: b };
  return { value: (a / b) * 100, n, num: a, den: b };
}

const pct = (x: number | null, y: number | null, min: number) => (x == null || y == null || y < min ? null : (x / y) * 100);

export const METRICS: MetricDef[] = [
  { key: "rating", label: "Nota média", short: "Nota", group: "general", unit: "nota", decimals: 1, better: "up", relevant: ALL, minN: 1, origin: "ea+manual",
    compute: (w) => { const r = sumOf(w, (m) => m.rating); return { value: r.n ? r.total / r.n : null, n: r.n }; }, perMatch: (m) => m.rating },
  { key: "involvements", label: "Participações em gol", short: "G+A", group: "general", unit: "/jogo", decimals: 2, better: "up", relevant: OUTFIELD, minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.goals + m.s.assists), perMatch: (m) => m.s.goals + m.s.assists },
  { key: "passAccuracy", label: "Precisão de passes", short: "Passes certos", group: "passing", unit: "%", decimals: 1, better: "up", relevant: ALL, minN: 3, origin: "ea+manual",
    compute: (w) => ratio(w, (m) => m.s.passesCompleted, (m) => m.s.passesAttempted, 30), perMatch: (m) => pct(m.s.passesCompleted, m.s.passesAttempted, 5) },
  { key: "passesAttempted", label: "Passes tentados", short: "Passes", group: "passing", unit: "/jogo", decimals: 1, better: "up", relevant: OUTFIELD, minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.passesAttempted), perMatch: (m) => m.s.passesAttempted },
  { key: "assists", label: "Assistências", short: "Assist.", group: "passing", unit: "/jogo", decimals: 2, better: "up", relevant: OUTFIELD, minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.assists), perMatch: (m) => m.s.assists },
  { key: "goals", label: "Gols", short: "Gols", group: "finishing", unit: "/jogo", decimals: 2, better: "up", relevant: OUTFIELD, minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.goals), perMatch: (m) => m.s.goals },
  { key: "shots", label: "Finalizações", short: "Chutes", group: "finishing", unit: "/jogo", decimals: 1, better: "up", relevant: ["MID", "ATT"], minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.shots), perMatch: (m) => m.s.shots },
  { key: "conversion", label: "Conversão (gols ÷ chutes)", short: "Conversão", group: "finishing", unit: "%", decimals: 0, better: "up", relevant: ["MID", "ATT"], minN: 3, origin: "ea+manual",
    compute: (w) => ratio(w, (m) => (m.s.shots == null ? null : m.s.goals), (m) => m.s.shots, 8), perMatch: (m) => pct(m.s.shots == null ? null : m.s.goals, m.s.shots, 2) },
  { key: "shotAccuracy", label: "Chutes no alvo", short: "No alvo", group: "finishing", unit: "%", decimals: 0, better: "up", relevant: ["MID", "ATT"], minN: 3, origin: "manual",
    compute: (w) => ratio(w, (m) => m.s.shotsOnTarget, (m) => (m.s.shotsOnTarget == null ? null : m.s.shots), 8), perMatch: (m) => pct(m.s.shotsOnTarget, m.s.shots, 2) },
  { key: "tackles", label: "Desarmes certos", short: "Desarmes", group: "defense", unit: "/jogo", decimals: 1, better: "up", relevant: ["DEF", "MID"], minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.tackles), perMatch: (m) => m.s.tackles },
  { key: "tackleSuccess", label: "Eficiência nos desarmes", short: "% desarme", group: "defense", unit: "%", decimals: 0, better: "up", relevant: ["DEF", "MID"], minN: 3, origin: "ea",
    compute: (w) => ratio(w, (m) => (m.s.tacklesAttempted == null ? null : m.s.tackles), (m) => m.s.tacklesAttempted, 8), perMatch: (m) => pct(m.s.tacklesAttempted == null ? null : m.s.tackles, m.s.tacklesAttempted, 2) },
  { key: "interceptions", label: "Interceptações", short: "Intercept.", group: "defense", unit: "/jogo", decimals: 1, better: "up", relevant: ["DEF", "MID"], minN: 3, origin: "manual",
    compute: (w) => rate(w, (m) => m.s.interceptions), perMatch: (m) => m.s.interceptions },
  { key: "saves", label: "Defesas", short: "Defesas", group: "goalkeeping", unit: "/jogo", decimals: 1, better: "up", relevant: ["GK"], minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.saves), perMatch: (m) => m.s.saves },
  { key: "savePct", label: "Aproveitamento de defesas", short: "% defesas", group: "goalkeeping", unit: "%", decimals: 0, better: "up", relevant: ["GK"], minN: 3, origin: "ea+manual",
    compute: (w) => ratio(w, (m) => m.s.saves, (m) => (m.s.saves == null || m.s.goalsConceded == null ? null : m.s.saves + m.s.goalsConceded), 8),
    perMatch: (m) => (m.s.saves == null || m.s.goalsConceded == null ? null : pct(m.s.saves, m.s.saves + m.s.goalsConceded, 2)) },
  { key: "conceded", label: "Gols sofridos", short: "Sofridos", group: "goalkeeping", unit: "/jogo", decimals: 2, better: "down", relevant: ["GK"], minN: 3, origin: "ea+manual",
    compute: (w) => rate(w, (m) => m.s.goalsConceded), perMatch: (m) => m.s.goalsConceded },
];
export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<string, MetricDef>;

/** Metrics the game does not provide — shown as "Dados indisponíveis", never estimated. */
export const UNAVAILABLE = [
  { key: "dribbles", label: "Dribles completados", group: "possession" as MetricGroup, why: "A EA não publica dribles por jogador nas estatísticas de Clubs." },
  { key: "possessionLost", label: "Perdas de posse", group: "possession" as MetricGroup, why: "Não disponível nos dados públicos da EA." },
  { key: "keyPasses", label: "Passes decisivos", group: "passing" as MetricGroup, why: "A EA informa apenas passes tentados e completados." },
  { key: "passTypes", label: "Tipos de passe (rasteiro, elevado, profundidade)", group: "passing" as MetricGroup, why: "Não disponível — o Treinador pergunta qual tipo você mais usa." },
];

export function fmtMetric(def: MetricDef, v: number | null) {
  if (v == null) return "—";
  const s = v.toLocaleString("pt-BR", { minimumFractionDigits: def.decimals, maximumFractionDigits: def.decimals });
  return def.unit === "%" ? `${s}%` : s;
}

export type WindowKey = "last1" | "last5" | "last10" | "career";
export const WINDOW_LABELS: Record<WindowKey, string> = { last1: "Última partida", last5: "Últimas 5", last10: "Últimas 10", career: "Histórico" };

/** Matches must be sorted oldest → newest. */
export function windows(matches: LabMatch[]): Record<WindowKey, LabMatch[]> {
  return { last1: matches.slice(-1), last5: matches.slice(-5), last10: matches.slice(-10), career: matches };
}

/**
 * Metric over a window. Needs data in at least min(minN, window size) matches — so "Última partida"
 * can show a single match, while longer windows need the metric's minimum sample.
 */
export function computeWindow(def: MetricDef, w: LabMatch[]): MetricValue {
  const v = def.compute(w);
  const required = Math.max(1, Math.min(def.minN, w.length));
  return v.n < required ? { ...v, value: null } : v;
}

export function metricsFor(group: PositionGroup) {
  return METRICS.filter((m) => m.relevant.includes(group));
}

/** Rolling series (e.g. 5-match moving value) for charts. Points only where the window has enough data. */
export function rollingSeries(def: MetricDef, matches: LabMatch[], size = 5) {
  const out: { at: Date; value: number | null; label: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const w = matches.slice(Math.max(0, i - size + 1), i + 1);
    const v = w.length < Math.min(size, def.minN) ? null : computeWindow(def, w);
    out.push({ at: matches[i].kickoffAt, value: v?.value ?? null, label: matches[i].opponent });
  }
  return out;
}

export function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN; }
export function stdev(xs: number[]) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
