"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import type { ActionResult } from "../errors";

const MAX = 4_000_000;
const ALLOWED = ["image/png", "image/webp", "image/jpeg"];
const framing = z.object({
  photoX: z.coerce.number().int().min(0).max(100),
  photoY: z.coerce.number().int().min(0).max(100),
  photoZoom: z.coerce.number().int().min(100).max(250),
});

async function ownPlayer(clubId: string, id: string) {
  const [p] = await db.select({ id: schema.players.id }).from(schema.players).where(and(eq(schema.players.id, id), eq(schema.players.clubId, clubId)));
  return p ?? null;
}

/** Saves a new photo (optional) and the card framing. Transparency of cut-out images is preserved. */
export async function savePlayerPhotoAction(playerId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("players.manage");
  if (!(await ownPlayer(ctx.club.id, playerId))) return { ok: false, error: "Jogador não encontrado." };
  const f = framing.safeParse(Object.fromEntries(form));
  if (!f.success) return { ok: false, error: "Enquadramento inválido." };
  const file = form.get("photo");
  let changedPhoto = false;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX || !ALLOWED.includes(file.type)) return { ok: false, error: "Envie PNG, WebP ou JPG de até 4 MB." };
    let out: Buffer, hasAlpha = false;
    try {
      const img = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate();
      hasAlpha = !!(await img.metadata()).hasAlpha;
      out = await img.resize({ width: 900, height: 1100, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
    } catch {
      return { ok: false, error: "Não foi possível ler a imagem." };
    }
    await db.insert(schema.playerPhotos).values({ playerId, mime: "image/webp", data: out, hasAlpha: hasAlpha ? 1 : 0 })
      .onConflictDoUpdate({ target: schema.playerPhotos.playerId, set: { mime: "image/webp", data: out, hasAlpha: hasAlpha ? 1 : 0, updatedAt: new Date() } });
    changedPhoto = true;
  }
  await db.update(schema.players).set({
    ...f.data,
    ...(changedPhoto ? { avatarUrl: `/api/jogadores/${playerId}/foto?v=${Date.now().toString(36)}` } : {}),
  }).where(eq(schema.players.id, playerId));
  await audit(ctx, changedPhoto ? "player.photo" : "player.photo_framing", "player", playerId, f.data);
  revalidatePath("/app", "layout");
  return { ok: true, message: changedPhoto ? "Foto salva." : "Enquadramento salvo." };
}

export async function removePlayerPhotoAction(playerId: string) {
  const ctx = await requireAction("players.manage");
  if (!(await ownPlayer(ctx.club.id, playerId))) return;
  await db.delete(schema.playerPhotos).where(eq(schema.playerPhotos.playerId, playerId));
  await db.update(schema.players).set({ avatarUrl: null }).where(eq(schema.players.id, playerId));
  await audit(ctx, "player.photo_remove", "player", playerId);
  revalidatePath("/app", "layout");
}
