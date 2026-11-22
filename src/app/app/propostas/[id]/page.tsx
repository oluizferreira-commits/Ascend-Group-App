import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Mail, MessageCircle, Trash2, UserPlus } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { approveApplicationAction, deleteApplicationAction, setApplicationStatusAction } from "@/server/actions/recruitment";
import { Avatar, Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { NotesForm } from "@/components/recruitment/staff";
import { APPLICATION_STATUS_LABELS, PLATFORMS, contactLinks } from "@/lib/validation/application";
import { FOOT_LABELS, POSITION_LABELS, POSITION_NAMES } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Proposta" };
const tone = { new: "gold", reviewing: "wine", approved: "win", rejected: "loss" } as const;

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("recruitment.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [a] = await db.select().from(schema.transferApplications).where(and(eq(schema.transferApplications.id, id), eq(schema.transferApplications.clubId, ctx.club.id)));
  if (!a) notFound();
  const links = contactLinks(a);
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-ink-800 py-2 text-sm last:border-0"><dt className="text-ink-400">{label}</dt><dd className="text-right font-medium">{value || "—"}</dd></div>
  );
  return (
    <>
      <PageHeader eyebrow="Seja do Ascend" title={a.eaName} description={`Recebida em ${fmtDateTime(a.createdAt)}`}
        actions={<Badge tone={tone[a.status]} className="px-3 py-1 text-sm">{APPLICATION_STATUS_LABELS[a.status]}</Badge>} />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <div className="card overflow-hidden">
            {a.hasPhoto
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/propostas/${a.id}/foto`} alt={`Jogador de ${a.eaName}`} className="aspect-[4/5] w-full object-cover" />
              : <div className="grid aspect-[4/5] place-items-center"><Avatar name={a.eaName} size={120} /></div>}
          </div>
          <div className="card space-y-2 p-4">
            <SectionTitle>Contato</SectionTitle>
            {links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><MessageCircle className="size-4" />WhatsApp</a>}
            {a.contactDiscord && <p className="rounded-md border border-ink-700 px-3 py-2 text-sm"><span className="text-ink-400">Discord: </span><b className="select-text">{a.contactDiscord}</b></p>}
            {links.instagram && <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">Instagram @{a.contactInstagram}</a>}
            {links.email && <a href={links.email} className="btn-secondary w-full"><Mail className="size-4" />{a.contactEmail}</a>}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="card p-5">
            <SectionTitle>Ficha</SectionTitle>
            <dl className="grid gap-x-8 md:grid-cols-2">
              <div>
                {row("Nome", a.fullName)}
                {row("Idade", a.age)}
                {row("Local", a.location)}
                {row("Plataforma", PLATFORMS[a.platform as keyof typeof PLATFORMS] ?? a.platform)}
                {row("Disponibilidade", a.availability)}
              </div>
              <div>
                {row("Posição", `${POSITION_NAMES[a.primaryPosition]} (${POSITION_LABELS[a.primaryPosition]})`)}
                {row("Secundárias", a.secondaryPositions.map((p) => POSITION_LABELS[p]).join(", "))}
                {row("Overall", a.overall)}
                {row("Pé dominante", a.preferredFoot ? FOOT_LABELS[a.preferredFoot] : null)}
                {row("Clubes anteriores", a.previousClubs)}
              </div>
            </dl>
            {a.playStyle && <><p className="label mt-4">Estilo de jogo</p><p className="text-sm whitespace-pre-line select-text">{a.playStyle}</p></>}
            {a.message && <><p className="label mt-4">Mensagem</p><p className="text-sm whitespace-pre-line select-text">{a.message}</p></>}
            {a.videoUrl && <a href={a.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-accent-400 underline">Ver vídeo / clipes</a>}
          </section>

          <section className="card p-5"><SectionTitle>Anotações da comissão</SectionTitle><NotesForm id={a.id} initial={a.staffNotes} /></section>

          <section className="card flex flex-wrap items-center gap-2 p-5">
            {a.status === "approved" ? (
              a.playerId ? <Link href={`/app/elenco/${a.playerId}`} className="btn-primary">Ver no elenco</Link> : <span className="text-sm text-ink-400">Aprovada.</span>
            ) : (
              <>
                <form action={approveApplicationAction.bind(null, a.id)}>
                  <ConfirmSubmit className="btn-primary" message={`Aprovar ${a.eaName} e cadastrar no elenco? Depois você pode ajustar número da camisa e demais dados.`}><UserPlus className="size-4" />Aprovar e cadastrar no elenco</ConfirmSubmit>
                </form>
                {a.status === "new" && <form action={setApplicationStatusAction.bind(null, a.id, "reviewing")}><button className="btn-secondary">Marcar em análise</button></form>}
                {a.status !== "rejected"
                  ? <form action={setApplicationStatusAction.bind(null, a.id, "rejected")}><button className="btn-danger">Recusar</button></form>
                  : <form action={setApplicationStatusAction.bind(null, a.id, "new")}><button className="btn-secondary">Reabrir</button></form>}
              </>
            )}
            <form action={deleteApplicationAction.bind(null, a.id)} className="ml-auto">
              <ConfirmSubmit className="btn-ghost text-loss" message="Excluir definitivamente esta proposta e a foto (LGPD)? Não pode ser desfeito."><Trash2 className="size-4" />Excluir dados</ConfirmSubmit>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
