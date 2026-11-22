import { z } from "zod";
import { FEET, POSITIONS } from "../domain";
import { optionalInt, optionalText } from "./common";

export const PLATFORMS = { ps5: "PlayStation 5", xbox: "Xbox Series X|S", pc: "PC" } as const;
export const APPLICATION_STATUS_LABELS = { new: "Nova", reviewing: "Em análise", approved: "Aprovada", rejected: "Recusada" } as const;

const clean = (max: number) => optionalText(max);

export const applicationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Informe seu nome").max(100),
    age: optionalInt(10, 99),
    location: clean(80),
    eaName: z.string().trim().min(2, "Informe seu nick na EA").max(40),
    platform: z.enum(Object.keys(PLATFORMS) as [keyof typeof PLATFORMS], { error: "Escolha a plataforma" }),
    primaryPosition: z.enum(POSITIONS, { error: "Escolha sua posição principal" }),
    secondaryPositions: z.array(z.enum(POSITIONS)).max(6).default([]),
    overall: optionalInt(1, 99),
    preferredFoot: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(FEET).nullable()),
    playStyle: clean(500),
    availability: clean(300),
    previousClubs: clean(300),
    contactWhatsapp: z.preprocess(
      (v) => (typeof v === "string" && v.replace(/\D/g, "") ? v.replace(/\D/g, "") : null),
      z.string().regex(/^\d{10,15}$/, "WhatsApp com DDD (e código do país, se fora do Brasil)").nullable(),
    ),
    contactDiscord: clean(40),
    contactEmail: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.email("E-mail inválido").max(254).nullable()),
    contactInstagram: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim().replace(/^@/, "") : null),
      z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Usuário do Instagram inválido").nullable(),
    ),
    videoUrl: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.url({ protocol: /^https$/, error: "Use um link https://" }).max(300).nullable()),
    message: clean(1000),
    consent: z.literal("on", { error: "É preciso concordar com o uso dos dados para enviar." }),
  })
  .refine((d) => d.contactWhatsapp || d.contactDiscord || d.contactEmail || d.contactInstagram, {
    path: ["contactWhatsapp"],
    message: "Informe ao menos um contato (WhatsApp, Discord, e-mail ou Instagram).",
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Contact deep links for staff. */
export function contactLinks(a: { contactWhatsapp: string | null; contactEmail: string | null; contactInstagram: string | null }) {
  return {
    whatsapp: a.contactWhatsapp ? `https://wa.me/${a.contactWhatsapp.length <= 11 ? "55" + a.contactWhatsapp : a.contactWhatsapp}` : null,
    email: a.contactEmail ? `mailto:${a.contactEmail}` : null,
    instagram: a.contactInstagram ? `https://instagram.com/${a.contactInstagram}` : null,
  };
}
