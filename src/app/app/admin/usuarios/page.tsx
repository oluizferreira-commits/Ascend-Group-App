import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { ROLES, ROLE_KEYS, canManageRole, highestRank, type RoleKey } from "@/server/auth/permissions";
import { removeMemberAction } from "@/server/actions/users";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { CreateUserForm, MemberRoles } from "@/components/admin/users";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Usuários e cargos" };

export default async function UsersPage() {
  const ctx = await requirePage("users.manage");
  const rows = await db
    .select({ user: schema.users, role: schema.roles.key })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.memberships.roleId))
    .where(eq(schema.memberships.clubId, ctx.club.id));
  const members = new Map<string, { user: (typeof rows)[number]["user"]; roles: RoleKey[] }>();
  for (const r of rows) {
    const m = members.get(r.user.id) ?? { user: r.user, roles: [] };
    m.roles.push(r.role);
    members.set(r.user.id, m);
  }
  const list = [...members.values()].sort((a, b) => highestRank(b.roles) - highestRank(a.roles) || a.user.displayName.localeCompare(b.user.displayName));
  const roleOpts = ROLE_KEYS.map((k) => ({ key: k, name: ROLES[k].name, allowed: canManageRole(ctx.roles, k) }));
  const isPresident = ctx.roles.includes("president");

  return (
    <>
      <PageHeader eyebrow="Administração" title="Usuários e cargos" description="Cada pessoa tem uma conta individual. Permissões são verificadas no servidor a cada ação." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-x-auto p-5">
          <SectionTitle>Membros ({list.length})</SectionTitle>
          <ul className="divide-y divide-ink-800">
            {list.map(({ user, roles }) => {
              const self = user.id === ctx.user.id;
              const editable = !self && (isPresident || highestRank(roles) < highestRank(ctx.roles));
              return (
                <li key={user.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium">{user.displayName} {self && <span className="text-xs text-ink-400">(você)</span>}</p>
                    <p className="text-xs text-ink-400">{user.email} · último acesso: {user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : "nunca"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">{roles.sort((a, b) => ROLES[b].rank - ROLES[a].rank).map((r) => <Badge key={r} tone={r === "president" ? "gold" : r === "admin" ? "wine" : "neutral"}>{ROLES[r].name}</Badge>)}</div>
                    <div className="mt-2"><MemberRoles userId={user.id} roles={roleOpts} current={roles} editable={editable} /></div>
                  </div>
                  {editable && (
                    <form action={removeMemberAction.bind(null, user.id)} className="sm:self-start">
                      <ConfirmSubmit className="btn-ghost min-h-0 px-2 py-1 text-xs text-red-300" message={`Remover ${user.displayName} do clube? A conta perderá o acesso.`}>Remover do clube</ConfirmSubmit>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="space-y-6">
          <section className="card p-5"><SectionTitle>Adicionar membro</SectionTitle><CreateUserForm roles={roleOpts} /></section>
          <section className="card p-5 text-sm text-ink-300">
            <SectionTitle>Cargos</SectionTitle>
            <ul className="space-y-1.5">
              {ROLE_KEYS.map((k) => <li key={k}><b className="text-ink-100">{ROLES[k].name}</b> — {ROLES[k].permissions.length} permissões</li>)}
            </ul>
            <p className="mt-3 text-xs text-ink-400">Somente o Presidente atribui os cargos de Presidente e Administrador.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
