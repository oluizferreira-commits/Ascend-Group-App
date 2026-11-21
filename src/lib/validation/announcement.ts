import { z } from "zod";
import { ANNOUNCEMENT_CATEGORIES, PRIORITIES, VISIBILITIES } from "../domain";
import { checkbox } from "./common";

const localDT = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data inválida").nullable());

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Título muito curto").max(120),
  body: z.string().trim().min(3, "Escreva o comunicado").max(5000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  priority: z.enum(PRIORITIES),
  visibility: z.enum(VISIBILITIES),
  pinned: checkbox,
  publishAt: localDT,
  expiresAt: localDT,
});
