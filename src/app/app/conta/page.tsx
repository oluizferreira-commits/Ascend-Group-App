import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { ROLES } from "@/server/auth/permissions";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { ChangePasswordForm } from "@/components/auth/forms";
import { PushToggle } from "@/components/push-toggle";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const ctx = await requirePage();
  return (
    <>
      <PageHeader eyebrow="Conta" title="Minha conta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle>Dados</SectionTitle>
          <p className="font-medium">{ctx.user.displayName}</p>
          <p className="text-sm text-ink-400">{ctx.user.email}</p>
          <div className="mt-3 flex flex-wrap gap-1">{ctx.roles.map((r) => <Badge key={r} tone="gold">{ROLES[r].name}</Badge>)}</div>
          {ctx.playerId && <Link href={`/app/elenco/${ctx.playerId}`} className="btn-secondary mt-4">Ver meu perfil de jogador</Link>}
        </section>
        <section className="card p-5"><SectionTitle>Alterar senha</SectionTitle><ChangePasswordForm /></section>
        <section className="card p-5"><SectionTitle>Privacidade</SectionTitle><p className="text-sm text-ink-400">Veja como tratamos seus dados e como pedir acesso, correção ou exclusão.</p><Link href="/privacidade" className="btn-secondary mt-3">Política de Privacidade e Cookies</Link></section>
        <section className="card p-5"><SectionTitle>Notificações push</SectionTitle><p className="mb-3 text-sm text-ink-400">Receba convocações, mudanças de horário, resultados e avisos urgentes no celular ou computador.</p><PushToggle /></section>
      </div>
    </>
  );
}
