import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { listActiveAnnouncements, listAllAnnouncements, visibleScopes } from "@/server/services/announcements";
import { pollsFor } from "@/server/services/polls";
import { deleteAnnouncementAction, expireAnnouncementAction } from "@/server/actions/announcements";
import { AnnouncementCard } from "@/components/announcement-card";
import { AnnouncementForm } from "@/components/announcements/form";
import { Badge, EmptyState, PageHeader } from "@/components/ui/basics";
import { Panel } from "@/components/ui/kit";
import { ListChecks, Megaphone, PenSquare } from "lucide-react";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { VISIBILITY_LABELS } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Avisos" };

export default async function AnnouncementsPage() {
  const ctx = await requirePage("announcements.view");
  const canManage = ctx.permissions.has("announcements.manage");
  const active = await listActiveAnnouncements(ctx.club.id, visibleScopes(ctx), 50);
  const all = canManage ? await listAllAnnouncements(ctx.club.id) : [];
  const polls = await pollsFor(active.map((a) => a.id), ctx.user.id);
  return (
    <>
      <PageHeader eyebrow="Comunicação" title="Avisos" description="Comunicados oficiais da organização e da comissão técnica." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          <h2 className="kicker flex items-center gap-2 px-1"><Megaphone className="size-3.5 text-accent-400" />Ativos · {active.length}</h2>
          {active.length === 0 ? <EmptyState title="Nenhum aviso ativo" /> : active.map((a) => <AnnouncementCard key={a.id} a={a} poll={polls.get(a.id)} canVote />)}
        </section>
        {canManage && (
          <aside className="space-y-6">
            <Panel title="Novo comunicado" icon={PenSquare}><AnnouncementForm /></Panel>
            <Panel title="Gerenciar" icon={ListChecks} bodyClassName="px-4 py-1 sm:px-5">
              {all.length === 0 ? <p className="text-sm text-ink-400">Nenhum comunicado.</p> : (
                <ul className="divide-y divide-[var(--line)] text-sm">
                  {all.map((a) => {
                    const scheduled = a.state === "scheduled";
                    const expired = a.state === "expired";
                    return (
                      <li key={a.id} className="py-2.5">
                        <p className="font-medium">{a.title}</p>
                        <p className="mb-1.5 text-xs text-ink-400">{fmtDateTime(a.publishedAt)} · {VISIBILITY_LABELS[a.visibility]}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {scheduled ? <Badge tone="gold">Agendado</Badge> : expired ? <Badge>Expirado</Badge> : <Badge tone="win">Ativo</Badge>}
                          {!expired && !scheduled && (
                            <form action={expireAnnouncementAction.bind(null, a.id)}><button className="btn-ghost min-h-0 px-2 py-1 text-xs">Encerrar</button></form>
                          )}
                          <form action={deleteAnnouncementAction.bind(null, a.id)}>
                            <ConfirmSubmit className="btn-ghost min-h-0 px-2 py-1 text-xs text-loss" message="Excluir este comunicado?">Excluir</ConfirmSubmit>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </aside>
        )}
      </div>
    </>
  );
}
