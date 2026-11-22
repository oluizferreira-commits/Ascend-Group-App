/**
 * Bola de Prata (weekly) / Bola de Ouro (monthly) schedule — pure, São Paulo time (UTC−3, no DST).
 *  Prata: week Sunday→Saturday; voting opens Saturday 12:00 and closes Sunday 23:59.
 *  Ouro:  calendar month; voting opens on the 1st of the next month 00:00 and closes on the 3rd 23:59.
 */
export const AWARDS_START = "2026-11-22"; // first Bola de Prata week (Sunday)
export const GOLD_START = "2026-11-01"; // first Bola de Ouro month

export type AwardKind = "silver" | "gold";
export const AWARD_LABELS: Record<AwardKind, string> = { silver: "Bola de Prata", gold: "Bola de Ouro" };
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** São Paulo wall-clock → UTC Date. */
export function sp(y: number, m: number, d: number, h = 0, mi = 0, s = 0) {
  return new Date(Date.UTC(y, m, d, h + 3, mi, s));
}
/** Calendar date (y, m, d) of an instant in São Paulo. */
export function spDate(t: Date) {
  const x = new Date(t.getTime() - 3 * 3600_000);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), dow: x.getUTCDay() };
}
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export type EditionPlan = { kind: AwardKind; label: string; periodStart: string; periodEnd: string; votingOpensAt: Date; votingClosesAt: Date };

export function silverEditionFor(t: Date): EditionPlan {
  const { y, m, d, dow } = spDate(t);
  const start = new Date(Date.UTC(y, m, d - dow)); // Sunday
  const end = new Date(Date.UTC(y, m, d - dow + 6)); // Saturday
  const [sy, sm, sd] = [start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()];
  const [ey, em, ed] = [end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()];
  const periodStart = iso(sy, sm, sd), periodEnd = iso(ey, em, ed);
  return {
    kind: "silver",
    label: `Semana de ${ddmm(periodStart)} a ${ddmm(periodEnd)}/${ey}`,
    periodStart, periodEnd,
    votingOpensAt: sp(ey, em, ed, 12),
    votingClosesAt: sp(ey, em, ed + 1, 23, 59, 59),
  };
}

export function goldEditionFor(y: number, m: number): EditionPlan {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return {
    kind: "gold",
    label: `${MONTHS[m][0].toUpperCase()}${MONTHS[m].slice(1)} de ${y}`,
    periodStart: iso(y, m, 1), periodEnd: iso(y, m, last),
    votingOpensAt: sp(y, m + 1, 1, 0),
    votingClosesAt: sp(y, m + 1, 3, 23, 59, 59),
  };
}

/** Editions that should exist at instant `now` (current and previous period of each kind, from the start dates). */
export function plannedEditions(now: Date): EditionPlan[] {
  const out: EditionPlan[] = [];
  for (const t of [now, new Date(now.getTime() - 7 * 86400_000)]) {
    const e = silverEditionFor(t);
    if (e.periodStart >= AWARDS_START) out.push(e);
  }
  const { y, m } = spDate(now);
  for (const [yy, mm] of [[y, m], m === 0 ? [y - 1, 11] : [y, m - 1]]) {
    const e = goldEditionFor(yy, mm);
    if (e.periodStart >= GOLD_START) out.push(e);
  }
  return out;
}

export type Contender = { playerId: string; votes: number; avgRating: number | null; involvements: number };

/** Winner: most votes; ties broken by period average rating, then goals+assists. null if no votes. */
export function pickWinner(cs: Contender[]): Contender | null {
  const voted = cs.filter((c) => c.votes > 0);
  if (!voted.length) return null;
  return [...voted].sort((a, b) => b.votes - a.votes || (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.involvements - a.involvements)[0];
}

export function editionStatus(e: { votingOpensAt: Date; votingClosesAt: Date; finalizedAt: Date | null }, now = new Date()) {
  if (e.finalizedAt || now >= e.votingClosesAt) return "closed" as const;
  if (now >= e.votingOpensAt) return "open" as const;
  return "upcoming" as const;
}
