"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { notify } from "../notify";
import type { ActionResult } from "../errors";
import { announcementSchema } from "@/lib/validation/announcement";
import { parseLocalInput } from "@/lib/format";

export async function createAnnouncementAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("announcements.manage");
  const parsed = announcementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const publishedAt = d.publishAt ? parseLocalInput(d.publishAt)! : new Date();
  const expiresAt = d.expiresAt ? parseLocalInput(d.expiresAt)! : null;
  if (expiresAt && expiresAt <= publishedAt) return { ok: false, error: "A validade deve ser posterior à publicação.", fieldErrors: { expiresAt: ["Deve ser após a publicação"] } };
  // Only staff-level roles may publish urgent/staff-only notices (coaches are allowed).
  const [a] = await db.insert(schema.announcements).values({
    clubId: ctx.club.id, title: d.title, body: d.body, category: d.category, priority: d.priority,
    visibility: d.visibility, pinned: d.pinned, publishedAt, expiresAt, authorId: ctx.user.id,
  }).returning({ id: schema.announcements.id });
  await audit(ctx, "announcement.create", "announcement", a.id, { title: d.title, priority: d.priority, visibility: d.visibility });
  if (publishedAt.getTime() <= Date.now() + 60_000) {
    await notify(ctx.club.id, d.visibility === "staff" ? { kind: "staff" } : { kind: "members" }, {
      type: d.priority === "urgent" ? "announcement.urgent" : "announcement", excludeUserId: ctx.user.id,
      title: `${d.priority === "urgent" ? "🚨 URGENTE: " : "Novo comunicado: "}${d.title}`, body: d.body.slice(0, 160), link: "/app/avisos",
    });
  }
  revalidatePath("/app/avisos");
  revalidatePath("/app");
  return { ok: true, message: "Comunicado publicado." };
}

export async function deleteAnnouncementAction(id: string) {
  const ctx = await requireAction("announcements.manage");
  const [a] = await db.delete(schema.announcements).where(and(eq(schema.announcements.id, id), eq(schema.announcements.clubId, ctx.club.id))).returning();
  if (a) await audit(ctx, "announcement.delete", "announcement", id, { title: a.title });
  revalidatePath("/app/avisos");
  revalidatePath("/app");
}

export async function expireAnnouncementAction(id: string) {
  const ctx = await requireAction("announcements.manage");
  const [a] = await db.select().from(schema.announcements).where(and(eq(schema.announcements.id, id), eq(schema.announcements.clubId, ctx.club.id)));
  if (!a) return;
  const now = new Date();
  // keep the check constraint (expires_at > published_at) valid
  const expiresAt = now > a.publishedAt ? now : new Date(a.publishedAt.getTime() + 1000);
  await db.update(schema.announcements).set({ expiresAt }).where(eq(schema.announcements.id, id));
  await audit(ctx, "announcement.expire", "announcement", id, { title: a.title });
  revalidatePath("/app/avisos");
  revalidatePath("/app");
}
