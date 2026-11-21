"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { hashPassword } from "../auth/password";
import { ROLE_KEYS, ROLES, canManageRole, checkRoleChange, type RoleKey } from "../auth/permissions";
import type { ActionResult } from "../errors";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function tempPassword() {
  let s = "";
  for (let i = 0; i < 14; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s + randomInt(10);
}

async function memberRoles(userId: string, clubId: string): Promise<RoleKey[]> {
  const rows = await db.select({ key: schema.roles.key }).from(schema.memberships)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.clubId, clubId)));
  return rows.map((r) => r.key);
}

async function presidentCount(clubId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${schema.memberships.userId})::int` }).from(schema.memberships)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
    .where(and(eq(schema.memberships.clubId, clubId), eq(schema.roles.key, "president")));
  return n;
}

const createSchema = z.object({
  displayName: z.string().trim().min(2, "Informe o nome").max(80),
  email: z.email("E-mail inválido").max(254),
  roles: z.array(z.enum(ROLE_KEYS)).min(1, "Escolha ao menos um cargo"),
});

export type CreateUserResult = ActionResult<{ email: string; tempPassword: string | null }>;

export async function createUserAction(_prev: CreateUserResult | null, form: FormData): Promise<CreateUserResult> {
  const ctx = await requireAction("users.manage");
  const parsed = createSchema.safeParse({ ...Object.fromEntries(form), roles: form.getAll("roles") });
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { displayName, email, roles } = parsed.data;
  const denied = roles.find((r) => !canManageRole(ctx.roles, r));
  if (denied) return { ok: false, error: `Você não pode atribuir o cargo ${ROLES[denied].name}.` };

  const [existing] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = lower(${email})`);
  let tmp: string | null = null;
  let userId: string;
  if (existing) {
    const current = await memberRoles(existing.id, ctx.club.id);
    if (current.length) return { ok: false, error: "Esse e-mail já é membro do clube. Ajuste os cargos na lista." };
    userId = existing.id;
  } else {
    tmp = tempPassword();
    const [u] = await db.insert(schema.users).values({ email, displayName, passwordHash: await hashPassword(tmp) }).returning({ id: schema.users.id });
    userId = u.id;
  }
  const roleRows = await db.select().from(schema.roles).where(inArray(schema.roles.key, roles));
  await db.insert(schema.memberships).values(roleRows.map((r) => ({ userId, clubId: ctx.club.id, roleId: r.id }))).onConflictDoNothing();
  await audit(ctx, "member.add", "user", userId, { roles, newAccount: !existing });
  revalidatePath("/app/admin/usuarios");
  return { ok: true, data: { email, tempPassword: tmp }, message: existing ? "Conta existente vinculada ao clube." : "Conta criada." };
}

export async function setRolesAction(userId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("users.manage");
  const parsed = z.array(z.enum(ROLE_KEYS)).safeParse(form.getAll("roles"));
  if (!parsed.success) return { ok: false, error: "Cargos inválidos." };
  const newRoles = [...new Set(parsed.data)];
  const targetRoles = await memberRoles(userId, ctx.club.id);
  if (targetRoles.length === 0) return { ok: false, error: "Membro não encontrado." };
  const err = checkRoleChange({
    actorRoles: ctx.roles, targetRoles, newRoles, isSelf: userId === ctx.user.id, presidentCount: await presidentCount(ctx.club.id),
  });
  if (err) return { ok: false, error: err };
  if (newRoles.length === 0) return { ok: false, error: "Mantenha ao menos um cargo (use “Remover do clube” para desvincular)." };

  const roleRows = await db.select().from(schema.roles);
  const idOf = (k: RoleKey) => roleRows.find((r) => r.key === k)!.id;
  await db.transaction(async (tx) => {
    await tx.delete(schema.memberships).where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.clubId, ctx.club.id)));
    await tx.insert(schema.memberships).values(newRoles.map((k) => ({ userId, clubId: ctx.club.id, roleId: idOf(k) })));
    await audit(ctx, "member.roles_change", "user", userId, { from: targetRoles, to: newRoles }, tx);
  });
  revalidatePath("/app/admin/usuarios");
  return { ok: true, message: "Cargos atualizados." };
}

export async function removeMemberAction(userId: string) {
  const ctx = await requireAction("users.manage");
  const targetRoles = await memberRoles(userId, ctx.club.id);
  const err = checkRoleChange({
    actorRoles: ctx.roles, targetRoles, newRoles: [], isSelf: userId === ctx.user.id, presidentCount: await presidentCount(ctx.club.id),
  });
  if (err) throw new Error(err);
  await db.transaction(async (tx) => {
    await tx.delete(schema.memberships).where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.clubId, ctx.club.id)));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await audit(ctx, "member.remove", "user", userId, { roles: targetRoles }, tx);
  });
  revalidatePath("/app/admin/usuarios");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function resetMemberPasswordAction(userId: string, _prev: CreateUserResult | null): Promise<CreateUserResult> {
  const ctx = await requireAction("users.manage");
  const targetRoles = await memberRoles(userId, ctx.club.id);
  if (!targetRoles.length) return { ok: false, error: "Membro não encontrado." };
  if (userId === ctx.user.id) return { ok: false, error: "Use “Minha conta” para trocar a sua senha." };
  const err = checkRoleChange({ actorRoles: ctx.roles, targetRoles, newRoles: targetRoles, isSelf: false, presidentCount: 2 });
  if (err) return { ok: false, error: err };
  const tmp = tempPassword();
  const [u] = await db.update(schema.users).set({ passwordHash: await hashPassword(tmp), passwordChangedAt: new Date() }).where(eq(schema.users.id, userId)).returning();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await audit(ctx, "member.password_reset", "user", userId);
  return { ok: true, data: { email: u.email, tempPassword: tmp } };
}
