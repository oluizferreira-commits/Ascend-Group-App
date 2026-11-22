import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Megaphone } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getClubOverview } from "@/server/services/club";
import { getSeasonStats } from "@/server/services/stats";
import { nextMatch, recentResults } from "@/server/services/matches";
import { listActiveAnnouncements, visibleScopes } from "@/server/services/announcements";
import { pendingCallupsFor } from "@/server/services/calendar";
import { Crest } from "@/components/crest";
import { EmptyState, ResultPill, SectionTitle, StatTile } from "@/components/ui/basics";
import { DashboardHighlights } from "@/components/dashboard/highlights";
import { AnnouncementCard } from "@/components/announcement-card";
import { matchResult } from "@/lib/domain";
import { NumberTicker } from "@/components/fx/number-ticker";
import { TextReveal } from "@/components/fx/text-reveal";
import { BorderBeam } from "@/components/fx/border-beam";
import { ProgressRing } from "@/components/fx/progress-ring";
import { Reveal, RevealItem, Stagger } from "@/components/fx/reveal";
import { fmtDate, fmtPct, fmtWeekdayTime } from "@/lib/format";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const ctx = await requirePage("dashboard.view");
  const overview = await getClubOverview(ctx.club.id);
  const season = overview.currentSeason;
  const [stats, upcoming, recent, announcements] = await Promise.all([
    getSeasonStats({ clubId: ctx.club.id, seasonId: season?.id ?? null }),
    nextMatch(ctx.club.id),
    recentResults(ctx.club.id, 5, season?.id ?? null),
    listActiveAnnouncements(ctx.club.id, visibleScopes(ctx), 5),
  ]);
  const callups = ctx.playerId ? await pendingCallupsFor(ctx.playerId) : [];
  const { record, rankings, playerMap } = stats;
  const entry = (s: (typeof rankings.best)[number] | undefined) => (s ? { s, player: playerMap.get(s.playerId)! } : null);

  return (
    <div className="space-y-8">
      {callups.length > 0 && (
        <section className="rounded-lg border border-accent-500/50 border-l-4 border-l-accent-500 bg-accent-500/10 p-4">
          <p className="eyebrow mb-2">Você foi convocado</p>
          <ul className="space-y-1">
            {callups.map(({ e }) => (
              <li key={e.id}><Link href={`/app/calendario/${e.id}`} className="flex flex-wrap items-center gap-2 text-sm hover:text-accent-300">
                <b>{e.title}</b><span className="text-ink-300 capitalize">{fmtWeekdayTime(e.startsAt)}</span><span className="text-accent-400 underline">Confirmar presença</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
      {/* Hero */}
      <section className="card-premium px-6 py-8 sm:px-10 sm:py-10">
        <BorderBeam />
        <div className="relative flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
          <Crest size={150} priority />
          <div className="flex-1">
            <p className="font-display text-xs font-semibold tracking-[0.35em] text-silver uppercase">{overview.org.name}</p>
            <h1 className="mt-1 font-display text-6xl leading-none font-bold tracking-[0.04em] text-white uppercase sm:text-7xl"><TextReveal text={overview.club.name} /></h1>
            <p className="mt-3 font-display text-sm font-medium tracking-[0.4em] text-silver">{overview.org.motto}</p>
            {!season && ctx.permissions.has("seasons.manage") && (
              <Link href="/app/admin/temporadas" className="mt-4 inline-block text-sm text-accent-300 underline-offset-4 hover:underline">Cadastrar a temporada atual →</Link>
            )}
          </div>
          <dl className="grid w-full grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5 text-center md:w-auto md:border-t-0 md:border-l md:pt-0 md:pl-8">
            <div className="px-2 sm:px-4"><dt className="font-display text-[11px] font-semibold tracking-[0.2em] text-silver uppercase">Temporada</dt><dd className="mt-1 font-display text-lg font-bold whitespace-nowrap text-white sm:text-2xl">{season?.name ?? "—"}</dd></div>
            <div className="px-2 sm:px-4"><dt className="font-display text-[11px] font-semibold tracking-[0.2em] text-silver uppercase">Divisão</dt><dd className="mt-1 font-display text-lg font-bold whitespace-nowrap text-white sm:text-2xl">{season?.division ?? "—"}</dd></div>
            <div className="px-2 sm:px-4"><dt className="font-display text-[11px] font-semibold tracking-[0.2em] text-silver uppercase">Posição</dt><dd className="mt-1 font-display text-lg font-bold whitespace-nowrap text-white sm:text-2xl">{season?.leaguePosition != null ? `${season.leaguePosition}º` : "—"}</dd></div>
          </dl>
        </div>
      </section>

      {/* Campaign */}
      <section aria-labelledby="campanha">
        <SectionTitle><span id="campanha">Campanha {season ? `· ${season.name}` : "· todas as partidas"}</span></SectionTitle>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <RevealItem><StatTile label="Partidas" value={<NumberTicker value={record.played} />} /></RevealItem>
          <RevealItem><StatTile label="Vitórias" value={<NumberTicker value={record.wins} />} accent="win" /></RevealItem>
          <RevealItem><StatTile label="Empates" value={<NumberTicker value={record.draws} />} accent="draw" /></RevealItem>
          <RevealItem><StatTile label="Derrotas" value={<NumberTicker value={record.losses} />} accent="loss" /></RevealItem>
          <RevealItem className="relative">
            <StatTile label="Aproveitamento" value={record.pointsPct == null ? fmtPct(null) : <NumberTicker value={record.pointsPct} decimals={1} suffix="%" />} accent="gold" sub="pontos / pontos disputados" />
            <span className="pointer-events-none absolute top-3 right-3 opacity-90"><ProgressRing value={record.pointsPct} size={34} stroke={4} /></span>
          </RevealItem>
          <RevealItem><StatTile label="Gols" value={<><NumberTicker value={record.goalsFor} />:<NumberTicker value={record.goalsAgainst} /></>} sub="pró : contra" /></RevealItem>
        </Stagger>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle><span className="flex items-center gap-2"><CalendarClock className="size-4 text-accent-400" />Próxima partida</span></SectionTitle>
          {upcoming ? (
            <Link href={`/app/partidas/${upcoming.match.id}`} className="block rounded-lg border border-ink-700 p-4 hover:border-accent-600/50">
              <p className="text-xs text-ink-400">{upcoming.competition ?? "Amistoso / sem competição"}{upcoming.match.round ? ` · ${upcoming.match.round}` : ""}</p>
              <p className="mt-1 font-display text-2xl font-bold uppercase">Ascend CF <span className="text-accent-500">×</span> {upcoming.match.opponentName}</p>
              <p className="mt-1 text-sm text-accent-300 capitalize">{fmtWeekdayTime(upcoming.match.kickoffAt)}</p>
            </Link>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">Nenhuma partida agendada.</p>
          )}
        </section>
        <section className="card p-5">
          <SectionTitle action={<Link href="/app/partidas" className="text-xs text-accent-400 hover:underline">Histórico</Link>}>Últimos resultados</SectionTitle>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">Nenhum resultado registrado {season ? "nesta temporada" : ""}.</p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {recent.map(({ match: m, competition }) => (
                <li key={m.id}>
                  <Link href={`/app/partidas/${m.id}`} className="flex items-center gap-3 py-2.5 hover:text-accent-300">
                    <ResultPill result={matchResult(m.goalsFor!, m.goalsAgainst!)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">vs {m.opponentName}</span>
                      <span className="block truncate text-xs text-ink-400">{fmtDate(m.kickoffAt)} · {competition ?? "Sem competição"}</span>
                    </span>
                    <span className="font-display text-xl font-bold">{m.goalsFor}–{m.goalsAgainst}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Reveal><section aria-labelledby="destaques">
        <SectionTitle action={<Link href="/app/rankings" className="text-xs text-accent-400 hover:underline">Todos os rankings</Link>}>
          <span id="destaques">Destaques da temporada</span>
        </SectionTitle>
        <DashboardHighlights
          best={entry(rankings.best[0])}
          scorer={entry(rankings.scorers[0])}
          assister={entry(rankings.assisters[0])}
          decisive={rankings.decisive.map((s) => entry(s)!)}
          threshold={rankings.threshold}
        />
      </section></Reveal>

      <section aria-labelledby="avisos">
        <SectionTitle action={<Link href="/app/avisos" className="text-xs text-accent-400 hover:underline">Ver todos</Link>}>
          <span id="avisos" className="flex items-center gap-2"><Megaphone className="size-4 text-accent-400" />Avisos</span>
        </SectionTitle>
        {announcements.length === 0 ? (
          <EmptyState title="Sem avisos ativos" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">{announcements.map((a) => <AnnouncementCard key={a.id} a={a} compact />)}</div>
        )}
      </section>
    </div>
  );
}
