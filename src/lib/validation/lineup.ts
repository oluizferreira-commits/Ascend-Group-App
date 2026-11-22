import { z } from "zod";
import { optionalText, optionalUuid } from "./common";

export const lineupSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome à escalação").max(80),
    formationId: z.uuid("Escolha a formação"),
    opponentName: optionalText(80),
    matchId: optionalUuid,
    notes: optionalText(3000),
    captainId: optionalUuid,
    freeKickTakerId: optionalUuid,
    penaltyTakerId: optionalUuid,
    cornerTakerId: optionalUuid,
    slots: z.record(z.string().max(10), z.uuid()),
    bench: z.array(z.uuid()).max(12),
  })
  .superRefine((d, ctx) => {
    const starters = Object.values(d.slots);
    const all = [...starters, ...d.bench];
    if (new Set(all).size !== all.length) ctx.addIssue({ code: "custom", message: "Um jogador aparece mais de uma vez." });
    for (const k of ["captainId", "freeKickTakerId", "penaltyTakerId", "cornerTakerId"] as const) {
      const v = d[k];
      if (v && !starters.includes(v)) ctx.addIssue({ code: "custom", path: [k], message: "Capitão e cobradores devem estar entre os titulares." });
    }
  });
export type LineupInput = z.infer<typeof lineupSchema>;
