import Link from "next/link";
import { SpotlightCard } from "@/components/fx/spotlight-card";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Crown, Footprints, Goal, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/basics";
import { Meter, RankMark } from "@/components/ui/kit";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum } from "@/lib/format";
import type { PlayerLite } from "@/server/services/stats";
import type { PlayerSeasonSummary } from "@/lib/rating";

type Entry = { player: PlayerLite; s: PlayerSeasonSummary };

export function HighlightCard({
  title, icon: Icon, entry, metric, metricLabel, emptyText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entry: Entry | null;
  metric: React.ReactNode;
  metricLabel: string;
  emptyText: string;
}) {
  return (
    <SpotlightCard as="article" className="tile relative min-w-0 overflow-hidden p-2.5 transition-transform duration-300 hover:-translate-y-0.5 sm:p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6f8fff]/70 to-transparent" />
      <div className="mb-2 flex items-start gap-1.5 sm:mb-3">
        <Icon className="size-3.5 shrink-0 text-accent-400 sm:size-4" />
        <h3 className="kicker text-[10px] leading-tight text-ink-300 sm:text-[11px]">{title}</h3>
      </div>
      {entry ? (
        <Link href={`/app/elenco/${entry.player.id}`} className="group flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Avatar name={entry.player.nickname} src={entry.player.avatarUrl} size={44} className="ring-2 ring-accent-500/40" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base leading-tight font-bold tracking-wide uppercase group-hover:text-accent-400 sm:text-lg">{entry.player.nickname}</p>
            <p className="truncate text-[11px] text-ink-400">
              {POSITION_LABELS[entry.player.primaryPosition]}{entry.player.shirtNumber != null && ` · #${entry.player.shirtNumber}`}
            </p>
            <p className="mt-1 font-display text-3xl leading-none font-bold text-ink-100 tabular-nums">{metric}</p>
            <p className="kicker mt-0.5 truncate text-[9.5px] sm:text-[10px]">{metricLabel}</p>
          </div>
        </Link>
      ) : (
        <p className="py-3 text-xs text-ink-400">{emptyText}</p>
      )}
    </SpotlightCard>
  );
}

export function DashboardHighlights({ best, scorer, assister, decisive, threshold }: {
  best: Entry | null; scorer: Entry | null; assister: Entry | null; decisive: Entry[]; threshold: number;
}) {
  const top = decisive.slice(0, 5);
  const max = Math.max(1, ...top.map((e) => e.s.goalInvolvements));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <HighlightCard
          title="Melhor jogador"
          icon={Crown}
          entry={best}
          metric={best?.s.avgRating != null ? <NumberTicker value={best.s.avgRating} decimals={1} /> : null}
          metricLabel="Nota média"
          emptyText={`Mínimo de ${threshold} ${threshold === 1 ? "jogo" : "jogos"} ainda não atingido.`}
        />
        <HighlightCard
          title="Artilheiro"
          icon={Goal}
          entry={scorer}
          metric={scorer ? <NumberTicker value={scorer.s.goals} /> : null}
          metricLabel={`Gols · ${scorer ? fmtNum(scorer.s.goalsPerMatch, 2) : "—"}/jogo`}
          emptyText="Nenhum gol registrado."
        />
        <HighlightCard
          title="Melhor assistente"
          icon={Footprints}
          entry={assister}
          metric={assister ? <NumberTicker value={assister.s.assists} /> : null}
          metricLabel={`Assist. · ${assister ? fmtNum(assister.s.assistsPerMatch, 2) : "—"}/jogo`}
          emptyText="Nenhuma assistência registrada."
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="kicker flex items-center gap-1.5"><Zap className="size-3.5 text-accent-400" />Jogadores mais decisivos</h3>
          <Link href="/app/rankings#decisivos" className="text-xs text-accent-400 hover:underline">Ranking completo</Link>
        </div>
        {top.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-400">Sem participações em gols registradas nesta temporada.</p>
        ) : (
          <ol className="space-y-1">
            {top.map((e, i) => (
              <li key={e.player.id}>
                <Link href={`/app/elenco/${e.player.id}`} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-[var(--surface-2)]">
                  <RankMark n={i + 1} />
                  <Avatar name={e.player.nickname} src={e.player.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{e.player.nickname}</span>
                      <span className="shrink-0 text-xs text-ink-400 tabular-nums">{e.s.goals}G · {e.s.assists}A · {e.s.matches}J</span>
                    </span>
                    <Meter className="mt-1.5" value={(e.s.goalInvolvements / max) * 100} />
                  </span>
                  <span className="w-10 text-right font-display text-xl font-bold text-accent-400 tabular-nums">{e.s.goalInvolvements}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
