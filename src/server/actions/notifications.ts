"use server";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getSessionUser } from "../auth/session";

export async function markAllReadAction() {
  const me = await getSessionUser();
  if (!me) return;
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, me.id), isNull(schema.notifications.readAt)));
  revalidatePath("/app", "layout");
}

const subSchema = z.object({ endpoint: z.url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function savePushSubscriptionAction(sub: unknown): Promise<{ ok: boolean }> {
  const me = await getSessionUser();
  const parsed = subSchema.safeParse(sub);
  if (!me || !parsed.success || !parsed.data.endpoint.startsWith("https://")) return { ok: false };
  await db.insert(schema.pushSubscriptions).values({ userId: me.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { userId: me.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth } });
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const me = await getSessionUser();
  if (!me) return;
  await db.delete(schema.pushSubscriptions).where(and(eq(schema.pushSubscriptions.userId, me.id), eq(schema.pushSubscriptions.endpoint, endpoint)));
}
