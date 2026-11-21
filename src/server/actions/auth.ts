"use server";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { dummyHash, hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession, getSessionUser, requestMeta } from "../auth/session";
import { generateToken, hashToken } from "../auth/tokens";
import { sendMail } from "../mail";
import type { ActionResult } from "../errors";
import { passwordSchema } from "@/lib/validation/common";

const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 30;
const WINDOW_MIN = 15;

const loginSchema = z.object({
  email: z.email("E-mail inválido").max(254),
  password: z.string().min(1, "Informe a senha").max(200),
  next: z.string().optional(),
});

function safeNext(next: string | undefined) {
  return next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, password } = parsed.data;
  const { ip } = await requestMeta();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000);

  const [{ byEmail }] = await db
    .select({ byEmail: sql<number>`count(*)::int` })
    .from(schema.loginAttempts)
    .where(and(sql`lower(${schema.loginAttempts.email}) = lower(${email})`, eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  const [{ byIp }] = ip
    ? await db
        .select({ byIp: sql<number>`count(*)::int` })
        .from(schema.loginAttempts)
        .where(and(eq(schema.loginAttempts.ipAddress, ip), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)))
    : [{ byIp: 0 }];
  if (byEmail >= MAX_FAILS_PER_EMAIL || byIp >= MAX_FAILS_PER_IP) {
    return { ok: false, error: `Muitas tentativas. Aguarde ${WINDOW_MIN} minutos ou redefina sua senha.` };
  }

  const [user] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`).limit(1);
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash()), password);
  const success = !!user && valid && user.isActive;
  await db.insert(schema.loginAttempts).values({ email, ipAddress: ip, success });
  if (!success) return { ok: false, error: "E-mail ou senha incorretos." };

  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  await createSession(user.id);
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const forgotSchema = z.object({ email: z.email("E-mail inválido").max(254) });

export async function requestPasswordResetAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Informe um e-mail válido." };
  const generic: ActionResult = { ok: true, message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." };
  const [user] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${parsed.data.email})`).limit(1);
  if (!user || !user.isActive) return generic; // do not reveal whether the account exists

  // Throttle: at most 3 active tokens per hour.
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(schema.passwordResetTokens)
    .where(and(eq(schema.passwordResetTokens.userId, user.id), gt(schema.passwordResetTokens.createdAt, new Date(Date.now() - 3600_000))));
  if (recent >= 3) return generic;

  const token = generateToken();
  await db.insert(schema.passwordResetTokens).values({ id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 30 * 60_000) });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/redefinir-senha?token=${token}`;
  await sendMail(
    user.email,
    "Ascend FC — redefinição de senha",
    `Olá, ${user.displayName}.\n\nPara criar uma nova senha, acesse (válido por 30 minutos):\n${link}\n\nSe você não pediu a redefinição, ignore esta mensagem.\n\nRISE. CONQUER. ASCEND.`,
  );
  return generic;
}

const resetSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" });

export async function resetPasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const id = hashToken(parsed.data.token);
  const passwordHash = await hashPassword(parsed.data.password);
  const userId = await db.transaction(async (tx) => {
    const [tok] = await tx
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResetTokens.id, id), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())))
      .returning();
    if (!tok) return null;
    await tx.update(schema.users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(schema.users.id, tok.userId));
    // Invalidate every existing session of this user.
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, tok.userId));
    await tx.insert(schema.auditLogs).values({ actorUserId: tok.userId, action: "auth.password_reset", entityType: "user", entityId: tok.userId });
    return tok.userId;
  });
  if (!userId) return { ok: false, error: "Link inválido ou expirado. Solicite um novo." };
  return { ok: true, message: "Senha redefinida. Entre com a nova senha." };
}

const changeSchema = z
  .object({ current: z.string().min(1), password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem" });

export async function changePasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Sessão expirada." };
  const parsed = changeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, me.id));
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) {
    return { ok: false, error: "Senha atual incorreta.", fieldErrors: { current: ["Senha atual incorreta"] } };
  }
  await db.update(schema.users).set({ passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: new Date() }).where(eq(schema.users.id, me.id));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, me.id));
  await createSession(me.id);
  await db.insert(schema.auditLogs).values({ actorUserId: me.id, action: "auth.password_change", entityType: "user", entityId: me.id });
  return { ok: true, message: "Senha alterada. Outras sessões foram encerradas." };
}
