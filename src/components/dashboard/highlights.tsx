import Link from "next/link";
import { SpotlightCard } from "@/components/fx/spotlight-card";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Crown, Footprints, Goal, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/basics";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum } from "@/lib/format";
import type { PlayerLite } from "@/server/services/stats";
import type { PlayerSeasonSummary } from "@/lib/rating";

type Entry = { player: PlayerLite; s: PlayerSeasonSummary };

export function HighlightCard({
  title, icon: Icon, entry, metric, metricLabel, extras, emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entry: Entry | null;
  metric: React.ReactNode;
  metricLabel: string;
  extras?: { label: string; value: React.ReactNode }[];
  emptyText: string;
}) {
  return (
    <SpotlightCard as="article" className="card min-w-0 overflow-hidden border-t-[3px] border-t-accent-500 p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-accent-400" />
        <h3 className="eyebrow">{title}</h3>
      </div>
      {entry ? (
        <Link href={`/app/elenco/${entry.player.id}`} className="group block">
          <div className="flex items-center gap-4">
            <Avatar name={entry.player.nickname} src={entry.player.avatarUrl} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold tracking-wide uppercase group-hover:text-accent-400">{entry.player.nickname}</p>
              <p className="truncate text-xs text-ink-400">
                {POSITION_LABELS[entry.player.primaryPosition]}
                {entry.player.shirtNumber != null && ` · #${entry.player.shirtNumber}`} · {entry.s.matches} {entry.s.matches === 1 ? "jogo" : "jogos"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-5xl leading-none font-bold text-accent-400 tabular-nums">{metric}</p>
              <p className="mt-1 text-[10px] tracking-wider text-ink-400 uppercase">{metricLabel}</p>
            </div>
          </div>
          {extras && (
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-700 pt-3 text-center">
              {extras.map((e) => (
                <div key={e.label}>
                  <dt className="text-[10px] tracking-wider text-ink-400 uppercase">{e.label}</dt>
                  <dd className="font-display text-lg font-semibold">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Link>
      ) : (
        <p className="py-6 text-center text-sm text-ink-400">{emptyText}</p>
      )}
    </SpotlightCard>
  );
}

export function DashboardHighlights({ best, scorer, assister, decisive, threshold }: {
  best: Entry | null; scorer: Entry | null; assister: Entry | null; decisive: Entry[]; threshold: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <HighlightCard
        title="Melhor jogador"
        icon={Crown}
        entry={best}
        metric={best?.s.avgRating != null ? <NumberTicker value={best.s.avgRating} decimals={1} /> : null}
        metricLabel="Nota média"
        emptyText={`Ninguém atingiu o mínimo de ${threshold} ${threshold === 1 ? "jogo" : "jogos"} com estatísticas nesta temporada.`}
        extras={best ? [
          { label: "Gols", value: best.s.goals },
          { label: "Assist.", value: best.s.assists },
          { label: "V-E-D", value: `${best.s.wins}-${best.s.draws}-${best.s.losses}` },
        ] : undefined}
      />
      <HighlightCard
        title="Artilheiro"
        icon={Goal}
        entry={scorer}
        metric={scorer ? <NumberTicker value={scorer.s.goals} /> : null}
        metricLabel="Gols"
        emptyText="Nenhum gol registrado nesta temporada."
        extras={scorer ? [
          { label: "Jogos", value: scorer.s.matches },
          { label: "Média", value: fmtNum(scorer.s.goalsPerMatch, 2) },
          { label: "Assist.", value: scorer.s.assists },
        ] : undefined}
      />
      <HighlightCard
        title="Melhor assistente"
        icon={Footprints}
        entry={assister}
        metric={assister ? <NumberTicker value={assister.s.assists} /> : null}
        metricLabel="Assistências"
        emptyText="Nenhuma assistência registrada nesta temporada."
        extras={assister ? [
          { label: "Jogos", value: assister.s.matches },
          { label: "Média", value: fmtNum(assister.s.assistsPerMatch, 2) },
          { label: "Gols", value: assister.s.goals },
        ] : undefined}
      />
      <article className="card min-w-0 p-5 md:col-span-2 xl:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><Zap className="size-4 text-accent-400" /><h3 className="eyebrow">Jogadores mais decisivos</h3></div>
          <Link href="/app/rankings#decisivos" className="text-xs text-accent-400 hover:underline">Ranking completo</Link>
        </div>
        {decisive.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-400">Sem participações em gols registradas nesta temporada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>#</th><th>Jogador</th><th className="text-right">Gols</th><th className="text-right">Assist.</th><th className="text-right">G+A</th><th className="text-right">Por jogo</th><th className="text-right">Jogos</th></tr></thead>
              <tbody>
                {decisive.slice(0, 5).map((e, i) => (
                  <tr key={e.player.id}>
                    <td className="font-display text-accent-400">{i + 1}</td>
                    <td><Link href={`/app/elenco/${e.player.id}`} className="flex items-center gap-2 hover:text-accent-300"><Avatar name={e.player.nickname} src={e.player.avatarUrl} size={28} />{e.player.nickname}</Link></td>
                    <td className="text-right">{e.s.goals}</td>
                    <td className="text-right">{e.s.assists}</td>
                    <td className="text-right font-semibold text-accent-300">{e.s.goalInvolvements}</td>
                    <td className="text-right">{fmtNum(e.s.involvementsPerMatch, 2)}</td>
                    <td className="text-right text-ink-400">{e.s.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
