/**
 * Player Progress — period comparisons, before/after a build, goal evaluation and achievements.
 * Everything is computed from real match lines; achievements only exist when the data proves them.
 */
import { computeWindow, fmtMetric, METRIC_BY_KEY, type LabMatch, type MetricDef } from "./metrics";
import type { LabGoal } from "@/db/schema/lab";

export type PeriodRow = { def: MetricDef; a: number | null; b: number | null; nA: number; nB: number; diff: number | null; better: boolean | null };

export function comparePeriods(defs: MetricDef[], a: LabMatch[], b: LabMatch[]): PeriodRow[] {
  return defs.map((def) => {
    const va = computeWindow(def, a), vb = computeWindow(def, b);
    const diff = va.value != null && vb.value != null ? vb.value - va.value : null;
    return { def, a: va.value, b: vb.value, nA: va.n, nB: vb.n, diff, better: diff == null || diff === 0 ? null : def.better === "up" ? diff > 0 : diff < 0 };
  });
}

/** Matches before / after a date (YYYY-MM-DD, São Paulo calendar day, inclusive for "after"). */
export function splitAt(matches: LabMatch[], isoDay: string) {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  return { before: matches.filter((m) => day(m.kickoffAt) < isoDay), after: matches.filter((m) => day(m.kickoffAt) >= isoDay) };
}

/** Evaluates a measurable goal against matches played since the plan started. */
export function evaluateGoal(goal: LabGoal, baseline: Record<string, number | null>, since: LabMatch[]) {
  if (!goal.metric || !METRIC_BY_KEY[goal.metric]) return null;
  const def = METRIC_BY_KEY[goal.metric];
  const base = baseline[goal.metric] ?? null;
  const now = computeWindow(def, since);
  if (base == null) return { def, base, now: now.value, n: now.n, status: "sem-base" as const, text: "Sem valor de referência quando o plano foi criado." };
  if (now.value == null) return { def, base, now: null, n: now.n, status: "aguardando" as const, text: `Aguardando partidas (${now.n} com dados desde o início do plano).` };
  const target = goal.target ?? null;
  const reached = target != null && (goal.direction === "down" ? now.value <= target : now.value >= target);
  return {
    def, base, now: now.value, n: now.n, target, status: reached ? ("atingido" as const) : ("em-andamento" as const),
    text: `${fmtMetric(def, base)} → ${fmtMetric(def, now.value)} em ${now.n} partida(s)${target != null ? ` · meta ${fmtMetric(def, target)}` : ""}`,
  };
}

/** Target value for a goal template from the current baseline. */
export function goalTarget(metric: string, base: number | null, direction: "up" | "down", delta: number) {
  const def = METRIC_BY_KEY[metric];
  if (!def || base == null) return null;
  if (def.unit === "%") return Math.max(0, Math.min(100, base + (direction === "up" ? delta : -delta)));
  return base * (direction === "up" ? 1 + delta : 1 - delta);
}

export type Achievement = { id: string; title: string; detail: string; at: Date };

function bestRolling(def: MetricDef, matches: LabMatch[], size: number) {
  let best = -Infinity, bestEnd = -1;
  const vals: (number | null)[] = [];
  for (let end = size; end <= matches.length; end++) {
    const v = computeWindow(def, matches.slice(end - size, end));
    const x = v.n >= Math.min(def.minN, size) ? v.value : null;
    vals.push(x);
    if (x != null && x > best) { best = x; bestEnd = end; }
  }
  return { best, bestEnd, latest: vals.at(-1) ?? null, windows: vals.filter((v) => v != null).length };
}

/** Personal milestones grounded in the data. Only "current" records (set by the latest matches) are shown. */
export function achievements(matches: LabMatch[]): Achievement[] {
  const out: Achievement[] = [];
  const last = matches.at(-1);
  if (!last) return out;
  for (const [key, label] of [["assists", "assistências"], ["goals", "gols"], ["involvements", "participações em gol"], ["passAccuracy", "precisão de passes"], ["rating", "nota"]] as const) {
    const def = METRIC_BY_KEY[key];
    const r = bestRolling(def, matches, 10);
    if (r.windows >= 3 && r.bestEnd === matches.length && r.best > 0) {
      out.push({ id: `best10-${key}`, title: `Melhor média de ${label} em 10 partidas`, detail: `${fmtMetric(def, r.best)}${def.unit === "/jogo" ? " por jogo" : ""} nas últimas 10 — a melhor sequência de 10 jogos do seu histórico.`, at: last.kickoffAt });
    }
  }
  let streak = 0, best = 0;
  for (const m of matches) { streak = m.s.goals + m.s.assists > 0 ? streak + 1 : 0; best = Math.max(best, streak); }
  if (streak >= 3 && streak === best) out.push({ id: "ga-streak", title: `${streak} jogos seguidos participando de gol`, detail: "Sua maior sequência com gol ou assistência.", at: last.kickoffAt });
  const ratings = matches.map((m) => m.rating).filter((r): r is number => r != null);
  if (ratings.length >= 5 && last.rating != null && last.rating >= Math.max(...ratings)) {
    out.push({ id: "best-rating", title: "Melhor nota da carreira", detail: `${last.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} contra ${last.opponent}.`, at: last.kickoffAt });
  }
  const motm = matches.filter((m) => m.s.isMotm).length;
  const milestone = [50, 25, 10, 5, 1].find((x) => motm >= x);
  if (milestone && last.s.isMotm && motm === milestone) out.push({ id: `motm-${milestone}`, title: milestone === 1 ? "Primeiro craque da partida (EA)" : `${milestone} vezes craque da partida (EA)`, detail: `Contra ${last.opponent}.`, at: last.kickoffAt });
  const passes = last.s.passesAttempted;
  if (passes != null && passes >= 15 && last.s.passesCompleted === passes) out.push({ id: "perfect-pass", title: "100% de passes certos", detail: `${passes} de ${passes} contra ${last.opponent}.`, at: last.kickoffAt });
  return out;
}
