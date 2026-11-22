/** Head-to-head comparison rules (pure; shared by the page and the share image). */
import type { PlayerSeasonSummary } from "./rating";

export type CompareRow = {
  key: string;
  label: string;
  group: "Geral" | "Ataque" | "Criação" | "Defesa" | "Disciplina";
  better: "high" | "low";
  value: (s: PlayerSeasonSummary) => number | null;
  format: (v: number) => string;
};

const n = (v: number, d = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${n(v * 100, 0)}%`;
const per = (total: number | undefined, rec: number | undefined) => (rec && rec > 0 && total != null ? total / rec : null);

export const COMPARE_ROWS: CompareRow[] = [
  { key: "matches", label: "Jogos", group: "Geral", better: "high", value: (s) => s.matches || null, format: (v) => n(v) },
  { key: "winRate", label: "Aproveitamento em vitórias", group: "Geral", better: "high", value: (s) => (s.matches ? s.wins / s.matches : null), format: pct },
  { key: "rating", label: "Nota média", group: "Geral", better: "high", value: (s) => s.avgRating, format: (v) => n(v, 1) },
  { key: "consistency", label: "Regularidade", group: "Geral", better: "high", value: (s) => s.consistency, format: (v) => n(v, 2) },
  { key: "motm", label: "Melhor em campo", group: "Geral", better: "high", value: (s) => (s.optional.motm?.recordedIn ? s.optional.motm.total : null), format: (v) => n(v) },
  { key: "goals", label: "Gols", group: "Ataque", better: "high", value: (s) => (s.matches ? s.goals : null), format: (v) => n(v) },
  { key: "gpm", label: "Gols por jogo", group: "Ataque", better: "high", value: (s) => (s.matches ? s.goalsPerMatch : null), format: (v) => n(v, 2) },
  { key: "shotsPm", label: "Finalizações por jogo", group: "Ataque", better: "high", value: (s) => per(s.optional.shots?.total, s.optional.shots?.recordedIn), format: (v) => n(v, 1) },
  {
    key: "shotAcc", label: "Precisão de finalização", group: "Ataque", better: "high", format: pct,
    value: (s) => (s.optional.shots?.total >= 5 && s.optional.shotsOnTarget?.recordedIn ? s.optional.shotsOnTarget.total / s.optional.shots.total : null),
  },
  { key: "assists", label: "Assistências", group: "Criação", better: "high", value: (s) => (s.matches ? s.assists : null), format: (v) => n(v) },
  { key: "apm", label: "Assistências por jogo", group: "Criação", better: "high", value: (s) => (s.matches ? s.assistsPerMatch : null), format: (v) => n(v, 2) },
  { key: "gapm", label: "G+A por jogo", group: "Criação", better: "high", value: (s) => (s.matches ? s.involvementsPerMatch : null), format: (v) => n(v, 2) },
  {
    key: "passAcc", label: "Precisão de passe", group: "Criação", better: "high", format: pct,
    value: (s) => (s.optional.passesAttempted?.total >= 20 ? (s.optional.passesCompleted?.total ?? 0) / s.optional.passesAttempted.total : null),
  },
  { key: "passesPm", label: "Passes certos por jogo", group: "Criação", better: "high", value: (s) => per(s.optional.passesCompleted?.total, s.optional.passesCompleted?.recordedIn), format: (v) => n(v, 1) },
  { key: "tackles", label: "Desarmes por jogo", group: "Defesa", better: "high", value: (s) => per(s.optional.tackles?.total, s.optional.tackles?.recordedIn), format: (v) => n(v, 1) },
  { key: "inter", label: "Interceptações por jogo", group: "Defesa", better: "high", value: (s) => per(s.optional.interceptions?.total, s.optional.interceptions?.recordedIn), format: (v) => n(v, 1) },
  { key: "clear", label: "Cortes por jogo", group: "Defesa", better: "high", value: (s) => per(s.optional.clearances?.total, s.optional.clearances?.recordedIn), format: (v) => n(v, 1) },
  { key: "saves", label: "Defesas por jogo", group: "Defesa", better: "high", value: (s) => per(s.optional.saves?.total, s.optional.saves?.recordedIn), format: (v) => n(v, 1) },
  { key: "cs", label: "Jogos sem sofrer gols", group: "Defesa", better: "high", value: (s) => (s.optional.cleanSheets?.recordedIn ? s.optional.cleanSheets.total : null), format: (v) => n(v) },
  { key: "reds", label: "Cartões vermelhos", group: "Disciplina", better: "low", value: (s) => (s.optional.redCards?.recordedIn ? s.optional.redCards.total : null), format: (v) => n(v) },
];

export type RowResult = { row: CompareRow; a: number | null; b: number | null; winner: "a" | "b" | "tie" | null };

export function compareSummaries(a: PlayerSeasonSummary, b: PlayerSeasonSummary) {
  const rows: RowResult[] = COMPARE_ROWS.map((row) => {
    const va = row.value(a), vb = row.value(b);
    let winner: RowResult["winner"] = null;
    if (va != null && vb != null) {
      if (Math.abs(va - vb) < 1e-9) winner = "tie";
      else winner = (row.better === "high" ? va > vb : va < vb) ? "a" : "b";
    }
    return { row, a: va, b: vb, winner };
  }).filter((r) => r.a != null || r.b != null);
  const score = { a: rows.filter((r) => r.winner === "a").length, b: rows.filter((r) => r.winner === "b").length, ties: rows.filter((r) => r.winner === "tie").length };
  return { rows, score };
}
