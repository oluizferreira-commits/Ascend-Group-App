import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { getSeasonStats } from "@/server/services/stats";
import { Avatar, PageHeader } from "@/components/ui/basics";
import { Meter, Panel, RankMark } from "@/components/ui/kit";
import { Activity, Crown, Footprints, Goal, Hand, Shield, Swords, Target, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum } from "@/lib/format";
import type { PlayerSeasonSummary } from "@/lib/rating";
import type { PlayerLite } from "@/server/services/stats";

export const metadata: Metadata = { title: "Rankings" };

type Col = { label: string; value: (s: PlayerSeasonSummary) => React.ReactNode; strong?: boolean; num?: (s: PlayerSeasonSummary) => number | null };

function Board({ id, title, icon, rows, cols, note, playerMap }: { id?: string; title: string; icon: React.ComponentType<{ className?: string }>; rows: PlayerSeasonSummary[]; cols: Col[]; note?: string; playerMap: Map<string, PlayerLite> }) {
  const main = cols.find((c) => c.strong) ?? cols[0];
  const rest = cols.filter((c) => c !== main);
  const list = rows.slice(0, 10);
  const nums = list.map((s) => main.num?.(s) ?? null).filter((n): n is number => n != null);
  const max = nums.length ? Math.max(...nums.map(Math.abs)) || 1 : 1;
  return (
    <Panel id={id} title={title} icon={icon} className="scroll-mt-24" bodyClassName="p-2 sm:p-3">
      {note && <p className="mb-2 px-2 pt-1 text-xs text-ink-400">{note}</p>}
      {list.length === 0 ? <p className="px-2 py-4 text-sm text-ink-400">Sem dados suficientes.</p> : (
        <ol>
          {list.map((s, i) => {
            const p = playerMap.get(s.playerId)!;
            const n = main.num?.(s);
            return (
              <li key={s.playerId}>
                <Link href={`/app/elenco/${p.id}`}
                  className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--surface-2)]", i === 0 && "bg-accent-500/[0.07] ring-1 ring-accent-500/25 ring-inset")}>
                  <RankMark n={i + 1} />
                  <Avatar name={p.nickname} src={p.avatarUrl} size={i === 0 ? 44 : 36} className={i === 0 ? "ring-2 ring-accent-500/50" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={cn("truncate font-semibold", i === 0 ? "text-base" : "text-sm")}>{p.nickname}</span>
                      <span className="shrink-0 rounded border hairline px-1 font-display text-[10px] font-semibold tracking-wider text-ink-300">{POSITION_LABELS[p.primaryPosition]}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-400 tabular-nums">
                      {s.matches} {s.matches === 1 ? "jogo" : "jogos"}{rest.map((c) => <span key={c.label}> · {c.label} {c.value(s)}</span>)}
                    </span>
                    {n != null && <Meter className="mt-1.5 max-w-56" value={(Math.abs(n) / max) * 100} />}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={cn("block font-display leading-none font-bold tabular-nums", i === 0 ? "text-3xl text-accent-400" : "text-2xl text-ink-100")}>{main.value(s)}</span>
                    <span className="kicker text-[9.5px]">{main.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export default async function RankingsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const ctx = await requirePage("stats.view");
  const sp = await searchParams;
  const [overview, seasons] = await Promise.all([getClubOverview(ctx.club.id), listSeasons(ctx.club.id)]);
  const seasonId = sp.season === "all" ? null : seasons.some((s) => s.id === sp.season) ? sp.season! : overview.currentSeason?.id ?? null;
  const { rankings: r, playerMap, record, config } = await getSeasonStats({ clubId: ctx.club.id, seasonId });
  const awards = await db.select({ a: schema.seasonAwards, season: schema.seasons.name }).from(schema.seasonAwards)
    .innerJoin(schema.seasons, eq(schema.seasons.id, schema.seasonAwards.seasonId))
    .where(eq(schema.seasonAwards.clubId, ctx.club.id)).orderBy(desc(schema.seasons.startsOn));
  const bySeason = new Map<string, typeof awards>();
  for (const a of awards) bySeason.set(a.season, [...(bySeason.get(a.season) ?? []), a]);

  const rating: Col[] = [{ label: "Nota", value: (s) => fmtNum(s.avgRating, 1), strong: true, num: (s) => s.avgRating }, { label: "G+A", value: (s) => s.goalInvolvements }];
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
        <Board playerMap={playerMap} icon={Crown} title="Melhor jogador geral" rows={r.best} cols={rating} note={eligibility} />
        <Board playerMap={playerMap} icon={Zap} id="decisivos" title="Mais decisivos (gols + assistências)" rows={r.decisive} cols={[
          { label: "G", value: (s) => s.goals }, { label: "A", value: (s) => s.assists },
          { label: "G+A", value: (s) => s.goalInvolvements, strong: true, num: (s) => s.goalInvolvements }, { label: "Por jogo", value: (s) => fmtNum(s.involvementsPerMatch, 2) },
        ]} />
        <Board playerMap={playerMap} icon={Goal} title="Artilharia" rows={r.scorers} cols={[{ label: "Gols", value: (s) => s.goals, strong: true, num: (s) => s.goals }, { label: "Média", value: (s) => fmtNum(s.goalsPerMatch, 2) }]} />
        <Board playerMap={playerMap} icon={Footprints} title="Assistências" rows={r.assisters} cols={[{ label: "Assist.", value: (s) => s.assists, strong: true, num: (s) => s.assists }, { label: "Média", value: (s) => fmtNum(s.assistsPerMatch, 2) }]} />
        <Board playerMap={playerMap} icon={Swords} title="Melhor atacante" rows={r.bestByGroup.ATT} cols={rating} />
        <Board playerMap={playerMap} icon={Activity} title="Melhor meio-campista" rows={r.bestByGroup.MID} cols={rating} />
        <Board playerMap={playerMap} icon={Shield} title="Melhor defensor" rows={r.bestByGroup.DEF} cols={rating} />
        <Board playerMap={playerMap} icon={Hand} title="Melhor goleiro" rows={r.bestByGroup.GK} cols={[{ label: "Nota", value: (s) => fmtNum(s.avgRating, 1), strong: true, num: (s) => s.avgRating }, { label: "Sem sofrer gols", value: (s) => s.optional.cleanSheets.recordedIn ? s.optional.cleanSheets.total : "—" }]} />
        <Board playerMap={playerMap} icon={Target} title="Mais regular" rows={r.regular} note="Índice = nota média − desvio padrão (mínimo 3 jogos). Premia constância em alto nível." cols={[
          { label: "Índice", value: (s) => fmtNum(s.consistency, 2), strong: true, num: (s) => s.consistency }, { label: "Média", value: (s) => fmtNum(s.avgRating, 1) }, { label: "σ", value: (s) => fmtNum(s.ratingStdDev, 2) },
        ]} />
      </div>
      <Panel className="mt-6" title="Histórico de vencedores" icon={Trophy}>
        {bySeason.size === 0 ? <p className="text-sm text-ink-400">Nenhuma temporada com premiações registradas. A diretoria registra em Administração → Temporadas.</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            {[...bySeason.entries()].map(([season, list]) => (
              <div key={season} className="tile p-4">
                <p className="eyebrow mb-2">Temporada {season}</p>
                <ul className="space-y-1 text-sm">{list.map(({ a }) => <li key={a.id} className="flex justify-between gap-2"><span className="text-ink-300">{a.award}</span><span><b>{a.playerName}</b> <span className="text-xs text-ink-400">{a.value}</span></span></li>)}</ul>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
