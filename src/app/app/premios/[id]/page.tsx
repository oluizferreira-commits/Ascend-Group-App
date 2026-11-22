import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/session";
import { editionCandidates, editionVotes, getEdition, runAwards } from "@/server/services/awards";
import { Ball } from "@/components/awards/ball";
import { AwardVote } from "@/components/awards/award-vote";
import { WhatsAppShare } from "@/components/awards/whatsapp";
import { EditionDatesForm } from "@/components/awards/dates-form";
import { ShareImageButton } from "@/components/share/share-image";
import { ShareLinkButton } from "@/components/share/share-link";
import { Badge, SectionTitle } from "@/components/ui/basics";
import { AWARD_LABELS, editionStatus } from "@/lib/awards";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum, fmtWeekdayTime, toLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "Votação" };

export default async function EditionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await runAwards(ctx.club.id);
  const e = await getEdition(ctx.club.id, id);
  if (!e) notFound();
  const status = editionStatus(e);
  const [cands, votes] = await Promise.all([editionCandidates(e), editionVotes(e.id, ctx.user.id)]);
  const title = `${AWARD_LABELS[e.kind]} · ${e.label}`;
  const waText = status === "closed"
    ? `${e.kind === "gold" ? "🥇" : "🥈"} ${e.winnerName ?? "—"} é a ${title}! RISE. CONQUER. ASCEND.`
    : `${e.kind === "gold" ? "🥇" : "🥈"} Votação da ${title} no app do Ascend CF — vote no melhor do período:`;

  return (
    <>
      <section className="card-premium mb-6 px-5 py-7 sm:px-8">
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Ball kind={e.kind} size={96} />
          <div className="flex-1">
            <p className="font-display text-sm font-semibold tracking-[0.3em] text-silver uppercase">{e.label}</p>
            <h1 className="font-display text-5xl leading-none font-bold text-white uppercase">{AWARD_LABELS[e.kind]}</h1>
            <p className="mt-2 text-sm text-ink-300 capitalize">
              {status === "open" ? `Votação aberta · fecha ${fmtWeekdayTime(e.votingClosesAt)}` : status === "upcoming" ? `Votação abre ${fmtWeekdayTime(e.votingOpensAt)}` : "Votação encerrada"}
            </p>
            {status === "closed" && (
              <p className="mt-3 font-display text-3xl font-bold text-white">
                {e.winnerName ? <>🏆 {e.winnerName}{e.winnerShirt != null && <span className="ml-2 text-silver">#{e.winnerShirt}</span>}</> : "Sem votos nesta edição"}
                {e.winnerVotes != null && e.totalVotes ? <span className="ml-3 align-middle text-base font-normal text-ink-300">{e.winnerVotes} de {e.totalVotes} votos</span> : null}
              </p>
            )}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
          <WhatsAppShare path={`/app/premios/${e.id}`} text={waText} />
          <ShareLinkButton url={`/app/premios/${e.id}`} title={title} text={waText} className="btn border border-white/25 text-white hover:bg-white/10" />
          {status === "closed" && e.winnerPlayerId && (
            <ShareImageButton url={`/api/premios/${e.id}/arte`} filename={`ascend-${e.kind}-${e.periodStart}.png`} title={title} label="Arte do vencedor"
              className="btn bg-white text-[#0c1d4f] hover:bg-[#e6ecfd]" />
          )}
        </div>
      </section>

      <section className="card p-5">
        <SectionTitle action={<Badge tone={status === "open" ? "win" : "neutral"}>{status === "open" ? "Aberta" : status === "upcoming" ? "Em breve" : "Encerrada"}</Badge>}>
          {status === "closed" ? "Resultado" : "Quem foi o melhor?"}
        </SectionTitle>
        <p className="-mt-2 mb-4 text-sm text-ink-400">Todo o elenco e a comissão votam · 1 voto por pessoa · não vale votar em si mesmo. Números do período para ajudar na escolha. Empate: vence a melhor nota média, depois mais G+A.</p>
        {status === "upcoming" ? (
          <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-sm text-ink-400 capitalize">A votação abre {fmtWeekdayTime(e.votingOpensAt)}. Você será avisado.</p>
        ) : (
          <AwardVote editionId={e.id} open={status === "open"} total={votes.total} myVote={votes.myVote} selfId={ctx.playerId} winnerId={status === "closed" ? e.winnerPlayerId : null}
            candidates={cands.map(({ player: p, s }) => ({
              id: p.id, nickname: p.nickname, shirtNumber: p.shirtNumber, position: POSITION_LABELS[p.primaryPosition], avatarUrl: p.avatarUrl,
              votes: votes.counts.get(p.id) ?? 0,
              line: s.matches ? `${s.matches} J · ${s.goals} G · ${s.assists} A${s.avgRating != null ? ` · nota ${fmtNum(s.avgRating, 1)}` : ""}` : "sem jogos no período",
            }))} />
        )}
      </section>

      {ctx.permissions.has("seasons.manage") && !e.finalizedAt && (
        <section className="card mt-6 p-5">
          <SectionTitle>Ajustar datas (diretoria)</SectionTitle>
          <EditionDatesForm id={e.id} opens={toLocalInput(e.votingOpensAt)} closes={toLocalInput(e.votingClosesAt)} />
        </section>
      )}
      <p className="mt-6"><Link href="/app/premios" className="text-sm text-accent-400 underline">← Todas as premiações</Link></p>
    </>
  );
}
