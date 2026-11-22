import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getMatchDetail } from "@/server/services/matches";
import { listPlayers } from "@/server/services/players";
import { getRatingConfig } from "@/server/services/stats";
import { deleteMatchAction, saveMatchSheetAction } from "@/server/actions/matches";
import { callupForMatchAction } from "@/server/actions/calendar";
import { getMvpVoting } from "@/server/services/mvp";
import { MvpVote } from "@/components/engagement/mvp-vote";
import { Badge, PageHeader, ResultPill, SectionTitle } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { SheetEditor } from "@/components/matches/sheet-editor";
import { MATCH_STATUS_LABELS, POSITION_LABELS, SOURCE_LABELS, matchResult, positionGroup } from "@/lib/domain";
import { TEAM_STAT_KEYS, type SheetRow } from "@/lib/validation/match";
import { computeMatchRating } from "@/lib/rating";
import { fmtDateTime, fmtNum } from "@/lib/format";

export const metadata: Metadata = { title: "Partida" };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("matches.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getMatchDetail(ctx.club.id, id);
  if (!detail) notFound();
  const { match: m, participants } = detail;
  const canSheet = ctx.permissions.has("stats.manage");
  const canManage = ctx.permissions.has("matches.manage");
  const finished = m.status === "finished";
  const result = finished ? matchResult(m.goalsFor!, m.goalsAgainst!) : null;
  const [players, config] = await Promise.all([canSheet ? listPlayers(ctx.club.id) : Promise.resolve([]), getRatingConfig(ctx.club.id)]);

  const sheet: SheetRow[] = participants.map(({ mp, stats }) => ({
    playerId: mp.playerId, role: mp.role, position: mp.position, isCaptain: mp.isCaptain, minutesPlayed: mp.minutesPlayed,
    goals: stats?.goals ?? 0, assists: stats?.assists ?? 0, shots: stats?.shots ?? null, shotsOnTarget: stats?.shotsOnTarget ?? null,
    passesAttempted: stats?.passesAttempted ?? null, passesCompleted: stats?.passesCompleted ?? null, tackles: stats?.tackles ?? null,
    interceptions: stats?.interceptions ?? null, clearances: stats?.clearances ?? null, saves: stats?.saves ?? null,
    goalsConceded: stats?.goalsConceded ?? null, cleanSheet: stats?.cleanSheet ?? null, yellowCards: stats?.yellowCards ?? null,
    redCards: stats?.redCards ?? null, externalRating: stats?.externalRating ?? null, isMotm: stats?.isMotm ?? null,
  }));
  const teamStats = Object.entries(m.teamStats ?? {});
  const mvp = finished ? await getMvpVoting(ctx, id) : null;
  const closesLabel = mvp?.closesAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(mvp.closesAt) : null;
  const selectable = players.filter((p) => p.status !== "inactive" || sheet.some((r) => r.playerId === p.id));

  return (
    <>
      <PageHeader
        eyebrow={detail.competition ?? "Amistoso / sem competição"}
        title={`Ascend CF × ${m.opponentName}`}
        actions={(canManage || ctx.permissions.has("callups.manage")) && (
          <>
            {ctx.permissions.has("callups.manage") && m.status === "scheduled" && (
              <form action={callupForMatchAction.bind(null, id)}><button className="btn-primary">Convocação</button></form>
            )}
            {ctx.permissions.has("media.manage") && <Link href={`/app/midia?template=result&match=${id}`} className="btn-secondary">Gerar arte</Link>}
            {canManage && <>
            <Link href={`/app/partidas/${id}/editar`} className="btn-secondary"><Pencil className="size-4" />Editar</Link>
            <form action={deleteMatchAction.bind(null, id)}>
              <ConfirmSubmit className="btn-danger" message="Excluir esta partida e toda a súmula? Esta ação fica registrada na auditoria e não pode ser desfeita."><Trash2 className="size-4" />Excluir</ConfirmSubmit>
            </form></>}
          </>
        )}
      />

      <section className="card-premium mb-6 grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto_1fr]">
        <p className="text-center font-display text-2xl font-bold uppercase sm:text-right">Ascend CF</p>
        <div className="text-center">
          {finished ? (
            <>
              <p className="font-display text-6xl font-bold accent-text">{m.goalsFor} – {m.goalsAgainst}</p>
              <div className="mt-2 flex justify-center"><ResultPill result={result!} /></div>
            </>
          ) : (
            <Badge tone={m.status === "cancelled" ? "loss" : "gold"}>{MATCH_STATUS_LABELS[m.status]}</Badge>
          )}
        </div>
        <p className="text-center font-display text-2xl font-bold uppercase sm:text-left">{m.opponentName}</p>
        <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-ink-300 sm:col-span-3">
          <div><dt className="inline text-ink-400">Data: </dt><dd className="inline">{fmtDateTime(m.kickoffAt)}</dd></div>
          {detail.season && <div><dt className="inline text-ink-400">Temporada: </dt><dd className="inline">{detail.season}</dd></div>}
          {m.round && <div><dt className="inline text-ink-400">Rodada: </dt><dd className="inline">{m.round}</dd></div>}
          {detail.formation && <div><dt className="inline text-ink-400">Formação: </dt><dd className="inline">{detail.formation}</dd></div>}
          <div><dt className="inline text-ink-400">Origem: </dt><dd className="inline">{SOURCE_LABELS[m.source]}</dd></div>
        </dl>
        {m.notes && <p className="text-center text-sm whitespace-pre-line text-ink-300 sm:col-span-3">{m.notes}</p>}
      </section>

      {mvp && mvp.candidates.length > 0 && (
        <section id="craque" className="card mb-6 scroll-mt-24 p-5">
          <SectionTitle>Craque da partida · voto da galera</SectionTitle>
          <MvpVote matchId={id} open={mvp.open} closesAtLabel={closesLabel} total={mvp.total} winners={mvp.winners} myVote={mvp.myVote} selfId={ctx.playerId}
            candidates={mvp.candidates.map((c) => ({ id: c.id, nickname: c.nickname, shirtNumber: c.shirtNumber, position: POSITION_LABELS[c.primaryPosition], avatarUrl: c.avatarUrl, votes: mvp.counts.get(c.id) ?? 0 }))} />
        </section>
      )}

      {teamStats.length > 0 && (
        <section className="card mb-6 p-5">
          <SectionTitle>Estatísticas coletivas</SectionTitle>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {teamStats.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-ink-850 p-3"><dt className="text-xs text-ink-400">{TEAM_STAT_KEYS[k as keyof typeof TEAM_STAT_KEYS] ?? k}</dt><dd className="font-display text-2xl font-bold">{v}</dd></div>
            ))}
          </dl>
        </section>
      )}

      <section className="card p-5">
        <SectionTitle>Súmula e estatísticas individuais</SectionTitle>
        {canSheet ? (
          finished || sheet.length > 0 ? (
            <SheetEditor action={saveMatchSheetAction.bind(null, id)} players={selectable} initial={sheet} goalsFor={m.goalsFor} canEdit />
          ) : (
            <p className="text-sm text-ink-400">Registre o resultado (edite a partida como “Encerrada”) para lançar gols e estatísticas. Você já pode montar a lista de convocados na Fase 6 (convocações).</p>
          )
        ) : participants.length === 0 ? (
          <p className="text-sm text-ink-400">Súmula ainda não registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Jogador</th><th>Função</th><th>Pos.</th><th className="text-right">G</th><th className="text-right">A</th><th className="text-right">Nota</th></tr></thead>
              <tbody>
                {participants.map(({ mp, stats, player }) => {
                  const rating = stats && finished
                    ? computeMatchRating({ ...stats, result: result! }, config.weights[positionGroup(player.primaryPosition)], config.externalWeight).final
                    : null;
                  return (
                    <tr key={mp.id}>
                      <td><Link href={`/app/elenco/${player.id}`} className="hover:text-accent-300">{player.nickname}{mp.isCaptain && <Badge tone="gold" className="ml-2">C</Badge>}</Link></td>
                      <td className="text-ink-300">{{ starter: "Titular", substitute: "Reserva", unused: "Não utilizado" }[mp.role]}</td>
                      <td>{mp.position ? POSITION_LABELS[mp.position] : "—"}</td>
                      <td className="text-right">{stats?.goals ?? "—"}</td>
                      <td className="text-right">{stats?.assists ?? "—"}</td>
                      <td className="text-right font-semibold text-accent-300">{fmtNum(rating, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
