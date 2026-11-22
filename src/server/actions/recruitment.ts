"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { requestMeta, requireAction } from "../auth/session";
import { audit } from "../audit";
import { notify } from "../notify";
import { getPublicClub } from "../services/club";
import { pgErrorCode, type ActionResult } from "../errors";
import { applicationSchema } from "@/lib/validation/application";
import { positionGroup } from "@/lib/domain";

const MAX_PHOTO_BYTES = 2_500_000;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function formObject(form: FormData) {
  const o: Record<string, unknown> = Object.fromEntries(form);
  o.secondaryPositions = form.getAll("secondaryPositions");
  return o;
}

/** Public: anyone with the link can apply. Anti-spam: honeypot + per-connection rate limit + duplicate check. */
export async function submitApplicationAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  // Honeypot: invisible field humans never fill. Pretend success so bots learn nothing.
  if (String(form.get("website") ?? "").trim()) return { ok: true };
  const club = await getPublicClub();
  if (!club) return { ok: false, error: "Inscrições indisponíveis no momento." };

  const parsed = applicationSchema.safeParse(formObject(form));
  if (!parsed.success) return { ok: false, error: "Confira os campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;

  const { ip } = await requestMeta();
  const ipHash = ip ? createHash("sha256").update(`ascend:${ip}`).digest("hex").slice(0, 32) : null;
  if (ipHash) {
    const [{ hour, day }] = await db.select({
      hour: sql<number>`count(*) filter (where ${schema.transferApplications.createdAt} > now() - interval '1 hour')::int`,
      day: sql<number>`count(*)::int`,
    }).from(schema.transferApplications)
      .where(and(eq(schema.transferApplications.ipHash, ipHash), gt(schema.transferApplications.createdAt, new Date(Date.now() - 86400_000))));
    if (hour >= 3 || day >= 8) return { ok: false, error: "Muitos envios a partir desta conexão. Tente novamente mais tarde." };
  }
  const [dup] = await db.select({ id: schema.transferApplications.id }).from(schema.transferApplications).where(and(
    eq(schema.transferApplications.clubId, club.club.id),
    sql`lower(${schema.transferApplications.eaName}) = lower(${d.eaName})`,
    sql`${schema.transferApplications.status} in ('new','reviewing')`,
  ));
  if (dup) return { ok: false, error: "Já existe uma proposta em análise com esse nick. Aguarde nosso contato." };

  // Photo (optional): validated and re-encoded server-side — the original file is never stored.
  let photo: Buffer | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES || !ALLOWED.includes(file.type)) {
      return { ok: false, error: "Foto inválida. Envie JPG, PNG ou WebP de até 2,5 MB.", fieldErrors: { photo: ["Formato ou tamanho inválido"] } };
    }
    try {
      photo = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
        .rotate().resize({ width: 800, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch {
      return { ok: false, error: "Não foi possível ler a imagem. Tente outra foto.", fieldErrors: { photo: ["Imagem ilegível"] } };
    }
  }

  const { consent: _c, ...data } = d;
  void _c;
  const id = await db.transaction(async (tx) => {
    const [a] = await tx.insert(schema.transferApplications).values({
      ...data, secondaryPositions: data.secondaryPositions.filter((p) => p !== data.primaryPosition),
      clubId: club.club.id, consentAt: new Date(), ipHash, hasPhoto: photo ? 1 : 0,
    }).returning({ id: schema.transferApplications.id });
    if (photo) await tx.insert(schema.applicationPhotos).values({ applicationId: a.id, mime: "image/webp", data: photo });
    return a.id;
  });
  await notify(club.club.id, { kind: "permission", permission: "recruitment.manage" }, {
    type: "recruitment.new", title: `Nova proposta: ${d.eaName}`, body: `${d.fullName} · ${d.primaryPosition}`, link: `/app/propostas/${id}`,
  });
  return { ok: true, message: "Proposta enviada! Se for aprovada, entraremos em contato pelos canais que você informou." };
}

// ─── Staff ──────────────────────────────────────────────────────────

async function own(clubId: string, id: string) {
  const [a] = await db.select().from(schema.transferApplications).where(and(eq(schema.transferApplications.id, id), eq(schema.transferApplications.clubId, clubId)));
  return a ?? null;
}

export async function setApplicationStatusAction(id: string, status: "reviewing" | "rejected" | "new") {
  const ctx = await requireAction("recruitment.manage");
  const a = await own(ctx.club.id, id);
  if (!a || a.status === "approved") return;
  await db.update(schema.transferApplications).set({ status, reviewedBy: ctx.user.id, reviewedAt: new Date() }).where(eq(schema.transferApplications.id, id));
  await audit(ctx, "recruitment.status", "transfer_application", id, { status, eaName: a.eaName });
  revalidatePath("/app/propostas");
  revalidatePath(`/app/propostas/${id}`);
}

export async function saveApplicationNotesAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("recruitment.manage");
  if (!(await own(ctx.club.id, id))) return { ok: false, error: "Proposta não encontrada." };
  const notes = String(form.get("staffNotes") ?? "").trim().slice(0, 3000) || null;
  await db.update(schema.transferApplications).set({ staffNotes: notes }).where(eq(schema.transferApplications.id, id));
  revalidatePath(`/app/propostas/${id}`);
  return { ok: true, message: "Anotações salvas." };
}

/** Approve: creates the roster player from the application (photo included). */
export async function approveApplicationAction(id: string) {
  const ctx = await requireAction("recruitment.manage");
  const a = await own(ctx.club.id, id);
  if (!a || a.status === "approved") return;
  if (!ctx.permissions.has("players.manage")) throw new Error("Sem permissão para cadastrar jogadores.");
  let playerId: string;
  try {
    const [p] = await db.insert(schema.players).values({
      clubId: ctx.club.id, fullName: a.fullName, nickname: a.eaName.slice(0, 40), eaName: a.eaName,
      primaryPosition: a.primaryPosition, secondaryPositions: a.secondaryPositions, overall: a.overall,
      preferredFoot: a.preferredFoot, playStyle: a.playStyle, status: "available",
      joinedOn: new Date().toISOString().slice(0, 10),
      avatarUrl: a.hasPhoto ? `/api/propostas/${a.id}/foto` : null,
    }).returning({ id: schema.players.id });
    playerId = p.id;
  } catch (e) {
    if (pgErrorCode(e) === "23505") throw new Error("Já existe um jogador com esse nick da EA no elenco.");
    throw e;
  }
  await db.update(schema.transferApplications).set({ status: "approved", playerId, reviewedBy: ctx.user.id, reviewedAt: new Date() })
    .where(eq(schema.transferApplications.id, id));
  await audit(ctx, "recruitment.approve", "transfer_application", id, { eaName: a.eaName, playerId, group: positionGroup(a.primaryPosition) });
  revalidatePath("/app/propostas");
  revalidatePath("/app/elenco");
  redirect(`/app/elenco/${playerId}/editar`);
}

/** LGPD: remove the application and its photo permanently. */
export async function deleteApplicationAction(id: string) {
  const ctx = await requireAction("recruitment.manage");
  const a = await own(ctx.club.id, id);
  if (!a) return;
  if (a.status === "approved") {
    // keep the roster photo working: detach it from the application first
    await db.update(schema.players).set({ avatarUrl: null }).where(and(eq(schema.players.clubId, ctx.club.id), eq(schema.players.avatarUrl, `/api/propostas/${id}/foto`)));
  }
  await db.delete(schema.transferApplications).where(eq(schema.transferApplications.id, id));
  await audit(ctx, "recruitment.delete", "transfer_application", id, { eaName: a.eaName });
  revalidatePath("/app/propostas");
  redirect("/app/propostas");
}
