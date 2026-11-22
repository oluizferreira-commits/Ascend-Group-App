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
import { Badge, EmptyState, ResultPill, SectionTitle, StatTile } from "@/components/ui/basics";
import { DashboardHighlights } from "@/components/dashboard/highlights";
import { AnnouncementCard } from "@/components/announcement-card";
import { matchResult } from "@/lib/domain";
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
        <section className="rounded-xl border border-gold-500/60 bg-gold-500/10 p-4">
          <p className="eyebrow mb-2">Você foi convocado</p>
          <ul className="space-y-1">
            {callups.map(({ e }) => (
              <li key={e.id}><Link href={`/app/calendario/${e.id}`} className="flex flex-wrap items-center gap-2 text-sm hover:text-gold-300">
                <b>{e.title}</b><span className="text-ink-300 capitalize">{fmtWeekdayTime(e.startsAt)}</span><span className="text-gold-400 underline">Confirmar presença</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}
      {/* Hero */}
      <section className="card-premium relative overflow-hidden p-6 sm:p-8 animate-rise">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgb(201_162_74/0.12),transparent_45%)]" />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Crest size={120} priority />
          <div className="flex-1">
            <p className="eyebrow">{overview.org.name}</p>
            <h1 className="font-display text-5xl font-bold tracking-wider uppercase gold-text sm:text-6xl">{overview.club.name}</h1>
            <p className="mt-1 font-display text-sm tracking-[0.35em] text-ink-300">{overview.org.motto}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {season ? (
                <>
                  <Badge tone="gold">Temporada {season.name}</Badge>
                  {season.division && <Badge tone="wine">{season.division}</Badge>}
                  {season.leaguePosition != null && <Badge>{season.leaguePosition}º na classificação</Badge>}
                </>
              ) : (
                <Badge>Nenhuma temporada atual definida</Badge>
              )}
              {!season && ctx.permissions.has("seasons.manage") && (
                <Link href="/app/admin/temporadas" className="text-xs text-gold-400 hover:underline">Cadastrar temporada</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Campaign */}
      <section aria-labelledby="campanha">
        <SectionTitle><span id="campanha">Campanha {season ? `· ${season.name}` : "· todas as partidas"}</span></SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Partidas" value={record.played} />
          <StatTile label="Vitórias" value={record.wins} accent="win" />
          <StatTile label="Empates" value={record.draws} accent="draw" />
          <StatTile label="Derrotas" value={record.losses} accent="loss" />
          <StatTile label="Aproveitamento" value={fmtPct(record.pointsPct)} accent="gold" sub="pontos / pontos disputados" />
          <StatTile label="Gols" value={`${record.goalsFor}:${record.goalsAgainst}`} sub="pró : contra" />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle><span className="flex items-center gap-2"><CalendarClock className="size-4 text-gold-400" />Próxima partida</span></SectionTitle>
          {upcoming ? (
            <Link href={`/app/partidas/${upcoming.match.id}`} className="block rounded-lg border border-ink-700 p-4 hover:border-gold-600/50">
              <p className="text-xs text-ink-400">{upcoming.competition ?? "Amistoso / sem competição"}{upcoming.match.round ? ` · ${upcoming.match.round}` : ""}</p>
              <p className="mt-1 font-display text-2xl font-bold uppercase">Ascend FC <span className="text-gold-500">×</span> {upcoming.match.opponentName}</p>
              <p className="mt-1 text-sm text-gold-300 capitalize">{fmtWeekdayTime(upcoming.match.kickoffAt)}</p>
            </Link>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">Nenhuma partida agendada.</p>
          )}
        </section>
        <section className="card p-5">
          <SectionTitle action={<Link href="/app/partidas" className="text-xs text-gold-400 hover:underline">Histórico</Link>}>Últimos resultados</SectionTitle>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">Nenhum resultado registrado {season ? "nesta temporada" : ""}.</p>
          ) : (
            <ul className="divide-y divide-ink-800">
              {recent.map(({ match: m, competition }) => (
                <li key={m.id}>
                  <Link href={`/app/partidas/${m.id}`} className="flex items-center gap-3 py-2.5 hover:text-gold-300">
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

      <section aria-labelledby="destaques">
        <SectionTitle action={<Link href="/app/rankings" className="text-xs text-gold-400 hover:underline">Todos os rankings</Link>}>
          <span id="destaques">Destaques da temporada</span>
        </SectionTitle>
        <DashboardHighlights
          best={entry(rankings.best[0])}
          scorer={entry(rankings.scorers[0])}
          assister={entry(rankings.assisters[0])}
          decisive={rankings.decisive.map((s) => entry(s)!)}
          threshold={rankings.threshold}
        />
      </section>

      <section aria-labelledby="avisos">
        <SectionTitle action={<Link href="/app/avisos" className="text-xs text-gold-400 hover:underline">Ver todos</Link>}>
          <span id="avisos" className="flex items-center gap-2"><Megaphone className="size-4 text-gold-400" />Avisos</span>
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
