import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { getSeasonStats } from "@/server/services/stats";
import { Avatar, PageHeader, SectionTitle } from "@/components/ui/basics";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum } from "@/lib/format";
import type { PlayerSeasonSummary } from "@/lib/rating";
import type { PlayerLite } from "@/server/services/stats";

export const metadata: Metadata = { title: "Rankings" };

type Col = { label: string; value: (s: PlayerSeasonSummary) => React.ReactNode; strong?: boolean };

function Board({ id, title, rows, cols, note, playerMap }: { id?: string; title: string; rows: PlayerSeasonSummary[]; cols: Col[]; note?: string; playerMap: Map<string, PlayerLite> }) {
return (
  <section id={id} className="card overflow-x-auto p-5 scroll-mt-24">
    <SectionTitle>{title}</SectionTitle>
    {note && <p className="-mt-2 mb-3 text-xs text-ink-400">{note}</p>}
    {rows.length === 0 ? <p className="py-4 text-sm text-ink-400">Sem dados suficientes.</p> : (
      <table className="data-table">
        <thead><tr><th>#</th><th>Jogador</th><th className="text-right">J</th>{cols.map((c) => <th key={c.label} className="text-right">{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 10).map((s, i) => {
            const p = playerMap.get(s.playerId)!;
            return (
              <tr key={s.playerId}>
                <td className={i === 0 ? "font-display text-lg text-gold-300" : "font-display text-ink-400"}>{i + 1}</td>
                <td><Link href={`/app/elenco/${p.id}`} className="flex items-center gap-2 hover:text-gold-300"><Avatar name={p.nickname} src={p.avatarUrl} size={28} /><span>{p.nickname} <span className="text-xs text-ink-400">{POSITION_LABELS[p.primaryPosition]}</span></span></Link></td>
                <td className="text-right text-ink-400">{s.matches}</td>
                {cols.map((c) => <td key={c.label} className={c.strong ? "text-right font-semibold text-gold-300" : "text-right"}>{c.value(s)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    )}
  </section>
);
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const ctx = await requirePage("stats.view");
  const sp = await searchParams;
  const [overview, seasons] = await Promise.all([getClubOverview(ctx.club.id), listSeasons(ctx.club.id)]);
  const seasonId = sp.season === "all" ? null : seasons.some((s) => s.id === sp.season) ? sp.season! : overview.currentSeason?.id ?? null;
  const { rankings: r, playerMap, record, config } = await getSeasonStats({ clubId: ctx.club.id, seasonId });

  const rating: Col[] = [{ label: "Nota", value: (s) => fmtNum(s.avgRating, 1), strong: true }, { label: "G+A", value: (s) => s.goalInvolvements }];
  const eligibility = `Mínimo de ${r.threshold} ${r.threshold === 1 ? "jogo" : "jogos"} (${config.minMatchesPct}% das ${record.played} partidas do clube).`;

  return (
    <>
      <PageHeader
        eyebrow="Estatísticas e desempenho"
        title="Rankings"
        description="Notas calculadas pelo sistema de avaliação por posição, combinadas com a nota do jogo quando disponível. Estatísticas não registradas não entram no cálculo."
        actions={
          <form method="get" className="flex gap-2">
            <select name="season" defaultValue={seasonId ?? "all"} className="input" aria-label="Temporada">
              <option value="all">Todas as temporadas</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn-secondary">Ver</button>
          </form>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Board playerMap={playerMap} title="Melhor jogador geral" rows={r.best} cols={rating} note={eligibility} />
        <Board playerMap={playerMap} id="decisivos" title="Mais decisivos (gols + assistências)" rows={r.decisive} cols={[
          { label: "G", value: (s) => s.goals }, { label: "A", value: (s) => s.assists },
          { label: "G+A", value: (s) => s.goalInvolvements, strong: true }, { label: "Por jogo", value: (s) => fmtNum(s.involvementsPerMatch, 2) },
        ]} />
        <Board playerMap={playerMap} title="Artilharia" rows={r.scorers} cols={[{ label: "Gols", value: (s) => s.goals, strong: true }, { label: "Média", value: (s) => fmtNum(s.goalsPerMatch, 2) }]} />
        <Board playerMap={playerMap} title="Assistências" rows={r.assisters} cols={[{ label: "Assist.", value: (s) => s.assists, strong: true }, { label: "Média", value: (s) => fmtNum(s.assistsPerMatch, 2) }]} />
        <Board playerMap={playerMap} title="Melhor atacante" rows={r.bestByGroup.ATT} cols={rating} />
        <Board playerMap={playerMap} title="Melhor meio-campista" rows={r.bestByGroup.MID} cols={rating} />
        <Board playerMap={playerMap} title="Melhor defensor" rows={r.bestByGroup.DEF} cols={rating} />
        <Board playerMap={playerMap} title="Melhor goleiro" rows={r.bestByGroup.GK} cols={[{ label: "Nota", value: (s) => fmtNum(s.avgRating, 1), strong: true }, { label: "Sem sofrer gols", value: (s) => s.optional.cleanSheets.recordedIn ? s.optional.cleanSheets.total : "—" }]} />
        <Board playerMap={playerMap} title="Mais regular" rows={r.regular} note="Índice = nota média − desvio padrão (mínimo 3 jogos). Premia constância em alto nível." cols={[
          { label: "Índice", value: (s) => fmtNum(s.consistency, 2), strong: true }, { label: "Média", value: (s) => fmtNum(s.avgRating, 1) }, { label: "σ", value: (s) => fmtNum(s.ratingStdDev, 2) },
        ]} />
      </div>
    </>
  );
}
