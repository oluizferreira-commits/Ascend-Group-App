import { z } from "zod";

/** Empty string from a form → undefined/null. */
export const optionalText = (max = 500) =>
  z.preprocess((v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v), z.string().max(max).nullable());

export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number({ error: "Número inválido" }).int("Use um número inteiro").min(min, `Mínimo ${min}`).max(max, `Máximo ${max}`).nullable(),
  );

export const optionalDecimal = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
    z.number({ error: "Número inválido" }).min(min).max(max).nullable(),
  );

export const optionalDate = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.iso.date("Data inválida").nullable(),
);

export const httpsUrl = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.url({ protocol: /^https$/, error: "Use um endereço https://" }).max(500).nullable(),
);

export const uuid = z.uuid("Identificador inválido");
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const optionalUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());

export const passwordSchema = z
  .string()
  .min(10, "A senha precisa de ao menos 10 caracteres")
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), "Use letras e números");

