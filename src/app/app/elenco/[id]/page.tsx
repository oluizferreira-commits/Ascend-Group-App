import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompareArrows, IdCard, Pencil } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getClubOverview } from "@/server/services/club";
import { getPlayer } from "@/server/services/players";
import { getPlayerMatchHistory, getPlayerSeasonHistory, getSeasonStats } from "@/server/services/stats";
import { Avatar, Badge, PageHeader, ResultPill, SectionTitle, StatTile } from "@/components/ui/basics";
import { RatingTrend } from "@/components/sparkline";
import { playerTrophies } from "@/server/services/awards";
import { TrophyRow } from "@/components/awards/trophy-row";
import { FOOT_LABELS, PLAYER_STATUS_LABELS, POSITION_LABELS, POSITION_NAMES } from "@/lib/domain";
import { fmtDate, fmtNum } from "@/lib/format";

export const metadata: Metadata = { title: "Perfil do jogador" };

const OPTIONAL_LABELS: Record<string, string> = {
  shots: "Finalizações", shotsOnTarget: "Finalizações no alvo", passesAttempted: "Passes tentados", passesCompleted: "Passes certos",
  tackles: "Desarmes", interceptions: "Interceptações", clearances: "Cortes", saves: "Defesas", cleanSheets: "Jogos sem sofrer gols",
  yellowCards: "Cartões amarelos", redCards: "Cartões vermelhos",
};

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("players.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const player = await getPlayer(ctx.club.id, id);
  if (!player) notFound();
  const overview = await getClubOverview(ctx.club.id);
  const seasonId = overview.currentSeason?.id ?? null;
  const [stats, history, seasons, cabinet] = await Promise.all([
    getSeasonStats({ clubId: ctx.club.id, seasonId }),
    getPlayerMatchHistory(ctx.club.id, id, seasonId),
    getPlayerSeasonHistory(ctx.club.id, id),
    playerTrophies(ctx.club.id, id),
  ]);
  const s = stats.summaryMap.get(id)!;
  const pa = s.optional.passesAttempted, pc = s.optional.passesCompleted;
  const passAcc = pa.recordedIn > 0 && pa.total > 0 ? (pc.total / pa.total) * 100 : null;
  const recorded = Object.entries(s.optional).filter(([, v]) => v.recordedIn > 0);
  const isSelf = ctx.playerId === id;

  return (
    <>
      <PageHeader
        eyebrow={isSelf ? "Meu perfil" : "Perfil do jogador"}
        title={player.nickname}
        actions={<>
          <Link href={`/app/elenco/${id}/carta`} className="btn-primary"><IdCard className="size-4" />Carta</Link>
          <Link href={`/app/comparar?a=${id}`} className="btn-secondary"><GitCompareArrows className="size-4" />Comparar</Link>
          {ctx.permissions.has("players.manage") && <Link href={`/app/elenco/${id}/editar`} className="btn-secondary"><Pencil className="size-4" />Editar</Link>}
        </>}
      />

      <section className="card-premium mb-6 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="relative self-center">
          <Avatar name={player.nickname} src={player.avatarUrl} size={112} />
          {player.shirtNumber != null && (
            <span className="absolute -right-2 -bottom-1 rounded-md border border-accent-500 bg-ink-950 px-2 font-display text-lg font-bold text-accent-300">#{player.shirtNumber}</span>
          )}
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div className="col-span-2"><dt className="label">Nome completo</dt><dd className="font-medium">{player.fullName}</dd></div>
          <div><dt className="label">Posição</dt><dd>{POSITION_NAMES[player.primaryPosition]} ({POSITION_LABELS[player.primaryPosition]})</dd></div>
          {(cabinet.gold > 0 || cabinet.silver > 0) && <div className="col-span-2 md:col-span-4"><dt className="label">Premiações</dt><dd><TrophyRow gold={cabinet.gold} silver={cabinet.silver} /></dd></div>}
          <div><dt className="label">Situação</dt><dd><Badge tone="gold">{PLAYER_STATUS_LABELS[player.status]}</Badge></dd></div>
          <div><dt className="label">Secundárias</dt><dd>{player.secondaryPositions.length ? player.secondaryPositions.map((p) => POSITION_LABELS[p]).join(", ") : "—"}</dd></div>
          <div><dt className="label">Pé dominante</dt><dd>{player.preferredFoot ? FOOT_LABELS[player.preferredFoot] : "—"}</dd></div>
          <div><dt className="label">Overall</dt><dd>{player.overall ?? "—"}</dd></div>
          <div><dt className="label">EA FC</dt><dd className="truncate">{player.eaName ?? "—"}</dd></div>
          <div><dt className="label">No clube desde</dt><dd>{player.joinedOn ? fmtDate(player.joinedOn + "T12:00:00Z") : "—"}</dd></div>
          {player.playStyle && <div className="col-span-2 md:col-span-3"><dt className="label">Características</dt><dd className="text-ink-300">{player.playStyle}</dd></div>}
        </dl>
      </section>

      <SectionTitle>{overview.currentSeason ? `Temporada ${overview.currentSeason.name}` : "Todas as partidas"}</SectionTitle>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatTile label="Partidas" value={s.matches} />
        <StatTile label="V-E-D" value={`${s.wins}-${s.draws}-${s.losses}`} />
        <StatTile label="Gols" value={s.goals} accent="gold" />
        <StatTile label="Assist." value={s.assists} accent="gold" />
        <StatTile label="G+A" value={s.goalInvolvements} />
        <StatTile label="Gols/J" value={fmtNum(s.goalsPerMatch, 2)} />
        <StatTile label="Assist./J" value={fmtNum(s.assistsPerMatch, 2)} />
        <StatTile label="Nota média" value={fmtNum(s.avgRating, 1)} accent="gold" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <SectionTitle>Evolução da nota</SectionTitle>
          <RatingTrend points={history.map((h) => ({ label: `${fmtDate(h.kickoffAt)} vs ${h.opponent}`, value: h.rating.final }))} />
        </section>
        <section className="card p-5">
          <SectionTitle>Estatísticas registradas</SectionTitle>
          {recorded.length === 0 ? (
            <p className="text-sm text-ink-400">Nenhuma estatística detalhada registrada além de gols e assistências.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              {recorded.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-ink-300">{OPTIONAL_LABELS[k] ?? k}</dt>
                  <dd><span className="font-semibold">{v.total}</span> <span className="text-xs text-ink-400">({v.recordedIn} {v.recordedIn === 1 ? "jogo" : "jogos"})</span></dd>
                </div>
              ))}
              {passAcc !== null && <div className="flex justify-between gap-2 border-t border-ink-800 pt-2"><dt className="text-ink-300">Precisão de passe</dt><dd className="font-semibold">{fmtNum(passAcc, 1)}%</dd></div>}
            </dl>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-x-auto p-5 lg:col-span-2">
          <SectionTitle>Histórico de desempenho</SectionTitle>
          {history.length === 0 ? <p className="text-sm text-ink-400">Sem partidas registradas.</p> : (
            <table className="data-table">
              <thead><tr><th>Data</th><th>Adversário</th><th>Res.</th><th className="text-right">G</th><th className="text-right">A</th><th className="text-right">Nota</th></tr></thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={h.matchId}>
                    <td>{fmtDate(h.kickoffAt)}</td>
                    <td><Link href={`/app/partidas/${h.matchId}`} className="hover:text-accent-300">{h.opponent}</Link></td>
                    <td><ResultPill result={h.line.result} /></td>
                    <td className="text-right">{h.line.goals}</td>
                    <td className="text-right">{h.line.assists}</td>
                    <td className="text-right font-semibold text-accent-300" title={h.line.externalRating != null ? `Calculada ${h.rating.computed} · EA ${h.line.externalRating}` : `Calculada ${h.rating.computed}`}>{fmtNum(h.rating.final, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card overflow-x-auto p-5">
          <SectionTitle>Por temporada</SectionTitle>
          {seasons.length === 0 ? <p className="text-sm text-ink-400">Sem histórico.</p> : (
            <table className="data-table">
              <thead><tr><th>Temporada</th><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">A</th><th className="text-right">V-E-D</th></tr></thead>
              <tbody>
                {seasons.map((r) => (
                  <tr key={r.seasonId ?? "none"}><td>{r.seasonName}</td><td className="text-right">{r.matches}</td><td className="text-right">{r.goals}</td><td className="text-right">{r.assists}</td><td className="text-right text-ink-300">{r.wins}-{r.draws}-{r.losses}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
