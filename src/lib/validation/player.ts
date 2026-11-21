import { z } from "zod";
import { FEET, PLAYER_STATUSES, POSITIONS } from "../domain";
import { httpsUrl, optionalDate, optionalInt, optionalText, optionalUuid } from "./common";

export const playerSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo").max(120),
  nickname: z.string().trim().min(1, "Informe o nickname").max(40),
  eaName: optionalText(60),
  avatarUrl: httpsUrl,
  shirtNumber: optionalInt(1, 99),
  primaryPosition: z.enum(POSITIONS, { error: "Escolha a posição principal" }),
  secondaryPositions: z.array(z.enum(POSITIONS)).max(6).default([]),
  preferredFoot: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(FEET).nullable()),
  overall: optionalInt(1, 99),
  playStyle: optionalText(500),
  joinedOn: optionalDate,
  status: z.enum(PLAYER_STATUSES),
  userId: optionalUuid,
});
export type PlayerInput = z.infer<typeof playerSchema>;

export function playerFormToObject(form: FormData) {
  const o: Record<string, unknown> = Object.fromEntries(form);
  o.secondaryPositions = form.getAll("secondaryPositions");
  return o;
}
