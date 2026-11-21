import { z } from "zod";
import { POSITIONS } from "../domain";
import { optionalInt, optionalText, optionalUuid } from "./common";

export const TEAM_STAT_KEYS = {
  possession: "Posse de bola (%)",
  shots: "Finalizações",
  shotsOnTarget: "Finalizações no alvo",
  passes: "Passes",
  passAccuracy: "Precisão de passe (%)",
  tackles: "Desarmes",
  corners: "Escanteios",
  fouls: "Faltas",
} as const;

export const matchSchema = z
  .object({
    opponentName: z.string().trim().min(1, "Informe o adversário").max(80),
    kickoff: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data/hora inválida"),
    status: z.enum(["scheduled", "finished", "cancelled"]),
    goalsFor: optionalInt(0, 99),
    goalsAgainst: optionalInt(0, 99),
    seasonId: optionalUuid,
    competitionId: optionalUuid,
    formationId: optionalUuid,
    round: optionalText(60),
    notes: optionalText(2000),
    ...Object.fromEntries(Object.keys(TEAM_STAT_KEYS).map((k) => [`team_${k}`, optionalInt(0, 2000)])),
  })
  .superRefine((d, ctx) => {
    if (d.status === "finished" && (d.goalsFor == null || d.goalsAgainst == null)) {
      ctx.addIssue({ code: "custom", path: ["goalsFor"], message: "Informe o placar de partidas encerradas" });
    }
  });

const stat = (max = 200) => z.number().int().min(0).max(max).nullable();

export const sheetRowSchema = z
  .object({
    playerId: z.uuid(),
    role: z.enum(["starter", "substitute", "unused"]),
    position: z.enum(POSITIONS).nullable(),
    isCaptain: z.boolean(),
    minutesPlayed: stat(130),
    goals: z.number().int().min(0).max(30),
    assists: z.number().int().min(0).max(30),
    shots: stat(), shotsOnTarget: stat(), passesAttempted: stat(400), passesCompleted: stat(400),
    tackles: stat(), interceptions: stat(), clearances: stat(), saves: stat(), goalsConceded: stat(50),
    cleanSheet: z.boolean().nullable(), yellowCards: z.number().int().min(0).max(2).nullable(), redCards: z.number().int().min(0).max(1).nullable(),
    externalRating: z.number().min(0).max(10).nullable(), isMotm: z.boolean().nullable(),
  })
  .superRefine((r, ctx) => {
    if (r.shots != null && r.shotsOnTarget != null && r.shotsOnTarget > r.shots) ctx.addIssue({ code: "custom", path: ["shotsOnTarget"], message: "No alvo > finalizações" });
    if (r.passesAttempted != null && r.passesCompleted != null && r.passesCompleted > r.passesAttempted) ctx.addIssue({ code: "custom", path: ["passesCompleted"], message: "Passes certos > tentados" });
    if (r.role === "unused" && (r.goals > 0 || r.assists > 0)) ctx.addIssue({ code: "custom", path: ["goals"], message: "Jogador não utilizado não pode ter gols/assistências" });
  });

export const sheetSchema = z.array(sheetRowSchema).max(40).superRefine((rows, ctx) => {
  const ids = new Set<string>();
  for (const r of rows) {
    if (ids.has(r.playerId)) ctx.addIssue({ code: "custom", message: "Jogador repetido na súmula" });
    ids.add(r.playerId);
  }
  if (rows.filter((r) => r.isCaptain).length > 1) ctx.addIssue({ code: "custom", message: "Apenas um capitão por partida" });
});
export type SheetRow = z.infer<typeof sheetRowSchema>;

/** Business rules that depend on the match score. Returns error messages. */
export function validateSheetAgainstScore(rows: SheetRow[], goalsFor: number | null): string[] {
  const errors: string[] = [];
  const goals = rows.reduce((a, r) => a + r.goals, 0);
  const assists = rows.reduce((a, r) => a + r.assists, 0);
  if (goalsFor == null) {
    if (goals > 0 || assists > 0) errors.push("Registre o placar antes de lançar gols e assistências.");
    return errors;
  }
  if (goals > goalsFor) errors.push(`A soma dos gols dos jogadores (${goals}) é maior que o placar do clube (${goalsFor}).`);
  if (assists > goalsFor) errors.push(`O número de assistências (${assists}) é maior que o número de gols do clube (${goalsFor}).`);
  return errors;
}
