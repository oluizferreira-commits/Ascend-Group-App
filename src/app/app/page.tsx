import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BarChart3, CalendarClock, CalendarDays, Crown, History, IdCard, Layers, Megaphone, TrendingUp, Trophy } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getClubOverview } from "@/server/services/club";
import { getSeasonStats } from "@/server/services/stats";
import { nextMatch, recentResults } from "@/server/services/matches";
import { listActiveAnnouncements, visibleScopes } from "@/server/services/announcements";
import { pendingCallupsFor } from "@/server/services/calendar";
import { pollsFor } from "@/server/services/polls";
import { getMe } from "@/server/services/player-card";
import { getMatchday } from "@/server/services/matchday";
import { MatchdayHero } from "@/components/engagement/matchday";
import { CallupSheetButton } from "@/components/mobile/callup-sheet";
import { recentMvpPrompt } from "@/server/services/mvp";
import { openAwardPrompt } from "@/server/services/awards";
import { Ball } from "@/components/awards/ball";
import { AWARD_LABELS } from "@/lib/awards";
import { squadAttributes, cardOverall } from "@/lib/attributes";
import { PlayerCard } from "@/components/cards/player-card";
import { Crest } from "@/components/crest";
import { FormChip, InfoChip, Panel, ScoreBox, StatStrip, TeamMonogram } from "@/components/ui/kit";
import { DashboardHighlights } from "@/components/dashboard/highlights";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { HeroCarousel } from "@/components/dashboard/hero-carousel";
import { AnnouncementCard } from "@/components/announcement-card";
import { matchResult } from "@/lib/domain";
import { NumberTicker } from "@/components/fx/number-ticker";
import { ProgressRing } from "@/components/fx/progress-ring";
import { Reveal } from "@/components/fx/reveal";
import { fmtDate, fmtPct, fmtWeekdayTime } from "@/lib/format";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const ctx = await requirePage("dashboard.view");
  // Independent queries start immediately (no waterfall).
  const independent = Promise.all([
    getMe(ctx), getMatchday(ctx), recentMvpPrompt(ctx), openAwardPrompt(ctx),
    ctx.playerId ? pendingCallupsFor(ctx.playerId) : Promise.resolve([] as Awaited<ReturnType<typeof pendingCallupsFor>>),
    nextMatch(ctx.club.id), listActiveAnnouncements(ctx.club.id, visibleScopes(ctx), 5),
  ]);
  const overview = await getClubOverview(ctx.club.id);
  const season = overview.currentSeason;
  const [[me, matchday, mvpPrompt, awardPrompt, callups, upcoming, announcements], stats, recent] = await Promise.all([
    independent,
    getSeasonStats({ clubId: ctx.club.id, seasonId: season?.id ?? null }),
    recentResults(ctx.club.id, 5, season?.id ?? null),
  ]);
  const polls = await pollsFor(announcements.map((a) => a.id), ctx.user.id);
  const mySummary = me ? stats.summaryMap.get(me.id) : undefined;
  const myAttrs = me ? squadAttributes(stats.summaries).get(me.id) : undefined;
  const myOvr = me && mySummary ? cardOverall(me.overall, mySummary.avgRating) : null;
  const firstName = ctx.user.displayName.split(" ")[0];
  const greeting = me?.shirtNumber != null ? `Bem-vindo, camisa ${me.shirtNumber}` : `Bem-vindo, ${me?.nickname ?? firstName}`;
  const { record, rankings, playerMap } = stats;
  const entry = (s: (typeof rankings.best)[number] | undefined) => (s ? { s, player: playerMap.get(s.playerId)! } : null);

  const ringPct = record.pointsPct;
  const nextSlide = upcoming && !matchday ? (
    <HeroBanner key="next" kicker="Próxima partida" href={`/app/partidas/${upcoming.match.id}`}
      title={<>Ascend CF <span className="text-[#8fa9ff]">×</span> {upcoming.match.opponentName}</>}
      sub={<span className="inline-block first-letter:uppercase">{fmtWeekdayTime(upcoming.match.kickoffAt)} · {upcoming.competition ?? "Amistoso"}</span>} cta="Ver partida" />
  ) : null;
  const slides = [
    awardPrompt && (
      <HeroBanner key="award" kicker={`Votação aberta: ${AWARD_LABELS[awardPrompt.kind]}`} href={`/app/premios/${awardPrompt.id}`}
        title={AWARD_LABELS[awardPrompt.kind]} sub={awardPrompt.label} cta="Votar agora" art={<Ball kind={awardPrompt.kind} size={118} />} />
    ),
    mvpPrompt && (
      <HeroBanner key="mvp" kicker="Votação" href={`/app/partidas/${mvpPrompt.id}#craque`} ariaLabel={`Vote no craque da partida: Ascend CF ${mvpPrompt.goalsFor}×${mvpPrompt.goalsAgainst} ${mvpPrompt.opponentName}`}
        title={<>Craque<br />da partida</>} sub={<>Ascend CF {mvpPrompt.goalsFor} × {mvpPrompt.goalsAgainst} {mvpPrompt.opponentName}</>} cta="Votar agora" />
    ),
    nextSlide,
    <HeroBanner key="club" kicker={greeting} title={overview.club.name} sub={<span className="font-display tracking-[0.3em] text-silver">{overview.org.motto}</span>}>
      {!season && ctx.permissions.has("seasons.manage") && (
        <Link href="/app/admin/temporadas" className="mt-3 inline-block text-sm text-accent-300 underline-offset-4 hover:underline">Cadastrar a temporada atual →</Link>
      )}
    </HeroBanner>,
  ].filter(Boolean);

  return (
    <div className="space-y-5 sm:space-y-6">
      {callups.length > 0 && (
        <section className="card border-l-4 border-l-accent-500 p-4">
          <p className="eyebrow mb-2">Você foi convocado</p>
          <ul className="space-y-2">
            {callups.map(({ e }) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/app/calendario/${e.id}`} className="hover:text-accent-400"><b>{e.title}</b></Link>
                <span className="inline-block text-ink-300 first-letter:uppercase">{fmtWeekdayTime(e.startsAt)}</span>
                <CallupSheetButton eventId={e.id} title={e.title} when={fmtWeekdayTime(e.startsAt)} className="btn-primary ml-auto min-h-0 px-3 py-1.5" />
              </li>
            ))}
          </ul>
        </section>
      )}
      {matchday && (
        <MatchdayHero serverNow={matchday.serverNow} kickoffIso={matchday.match.kickoffAt.toISOString()} opponent={matchday.match.opponentName} competition={matchday.competition}
          matchId={matchday.match.id} lineup={matchday.lineup} eventId={matchday.eventId} called={matchday.called} confirmed={matchday.confirmed}
          pending={matchday.pending} myStatus={matchday.myStatus} />
      )}

      <HeroCarousel>{slides}</HeroCarousel>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <InfoChip icon={CalendarDays} label="Temporada" value={season?.name ?? "—"} />
        <InfoChip icon={Layers} label="Divisão" value={season?.division ?? "—"} />
        <InfoChip icon={Trophy} label="Posição" value={season?.leaguePosition != null ? `${season.leaguePosition}º` : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {me && mySummary && myAttrs && myOvr && (
          <Reveal className="lg:col-span-2">
            <Panel title="Minha temporada" icon={BarChart3} link={{ href: "/app/eu", label: "Meu espaço" }} bodyClassName="flex items-center gap-4 sm:gap-6">
              <Link href="/app/eu" aria-label="Abrir meu espaço" className="w-[118px] shrink-0 sm:w-[170px]">
                <PlayerCard nickname={me.nickname} position={me.primaryPosition} shirtNumber={me.shirtNumber} avatarUrl={me.avatarUrl} photoX={me.photoX} photoY={me.photoY} photoZoom={me.photoZoom}
                  ovr={myOvr.value} ovrSource={myOvr.source} attributes={myAttrs} size="sm" />
              </Link>
              <div className="min-w-0 flex-1 space-y-3">
                <StatStrip size="sm" items={[
                  { label: "Jogos", value: <NumberTicker value={mySummary.matches} /> },
                  { label: "Gols", value: <NumberTicker value={mySummary.goals} /> },
                  { label: "Assist.", value: <NumberTicker value={mySummary.assists} /> },
                  { label: "Nota", value: mySummary.avgRating == null ? "—" : <NumberTicker value={mySummary.avgRating} decimals={1} />, tone: "accent" },
                ]} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Link href="/app/eu" className="btn-primary min-h-9 px-2 text-sm"><IdCard className="size-4" />Minha carta</Link>
                  <Link href={`/app/comparar?a=${me.id}`} className="btn-secondary min-h-9 px-2 text-sm"><ArrowLeftRight className="size-4" />Comparar</Link>
                </div>
              </div>
            </Panel>
          </Reveal>
        )}

        <Panel title={<span id="campanha">Desempenho do clube</span>} icon={TrendingUp} link={{ href: "/app/partidas", label: "Detalhes" }}>
          <div className="flex items-center gap-4">
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative">
                <ProgressRing value={ringPct} size={84} stroke={7} label={`Aproveitamento ${fmtPct(ringPct)}`} />
                <span className="absolute inset-0 grid place-items-center font-display text-lg font-bold tabular-nums">{ringPct == null ? "—" : <NumberTicker value={ringPct} decimals={1} suffix="%" />}</span>
              </div>
              <span className="kicker mt-1.5 text-[10px]">Aproveitamento</span>
            </div>
            <StatStrip className="flex-1 border-0 bg-transparent" items={[
              { label: "Partidas", value: <NumberTicker value={record.played} /> },
              { label: "Vitórias", value: <NumberTicker value={record.wins} />, tone: "win" },
              { label: "Empates", value: <NumberTicker value={record.draws} />, tone: "draw" },
              { label: "Derrotas", value: <NumberTicker value={record.losses} />, tone: "loss" },
            ]} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 hairline text-sm">
            <span className="text-ink-300">Gols <b className="font-display text-base text-ink-100 tabular-nums">{record.goalsFor}</b> pró · <b className="font-display text-base text-ink-100 tabular-nums">{record.goalsAgainst}</b> contra</span>
            {recent.length > 0 && (
              <span className="flex items-center gap-1" aria-label="Últimos resultados">
                {[...recent].reverse().map(({ match: m }) => <FormChip key={m.id} result={matchResult(m.goalsFor!, m.goalsAgainst!)} />)}
              </span>
            )}
          </div>
        </Panel>

        <Panel title="Próxima partida" icon={CalendarClock} link={{ href: "/app/calendario", label: "Calendário" }}>
          {upcoming ? (
            <Link href={`/app/partidas/${upcoming.match.id}`} className="block">
              <p className="kicker mb-3 truncate">{upcoming.competition ?? "Amistoso / sem competição"}{upcoming.match.round ? ` · ${upcoming.match.round}` : ""}</p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <span className="flex min-w-0 flex-col items-center gap-1.5 text-center"><span className="grid size-[46px] place-items-center rounded-xl border border-[#6f8fff]/30 bg-gradient-to-b from-[#13296f] to-[#050a1c]"><Crest size={38} clear /></span><span className="truncate font-display text-sm font-bold uppercase">Ascend CF</span></span>
                <span className="font-display text-xl font-bold text-ink-400 italic">VS</span>
                <span className="flex min-w-0 flex-col items-center gap-1.5 text-center"><TeamMonogram name={upcoming.match.opponentName} size={46} /><span className="w-full truncate font-display text-sm font-bold uppercase">{upcoming.match.opponentName}</span></span>
              </div>
              <p className="mt-3 flex items-center justify-center gap-2 border-t pt-3 hairline text-sm text-accent-300"><CalendarDays className="size-4" /><span className="inline-block first-letter:uppercase">{fmtWeekdayTime(upcoming.match.kickoffAt)}</span></p>
            </Link>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">Nenhuma partida agendada.</p>
          )}
        </Panel>

        <Reveal className="lg:col-span-2">
          <Panel title={<span id="destaques">Destaques da temporada</span>} icon={Crown} link={{ href: "/app/rankings", label: "Rankings" }}>
            <DashboardHighlights
              best={entry(rankings.best[0])}
              scorer={entry(rankings.scorers[0])}
              assister={entry(rankings.assisters[0])}
              decisive={rankings.decisive.map((s) => entry(s)!)}
              threshold={rankings.threshold}
            />
          </Panel>
        </Reveal>

        <Panel title="Últimos resultados" icon={History} link={{ href: "/app/partidas", label: "Histórico" }} bodyClassName="p-2 sm:p-2">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">Nenhum resultado registrado {season ? "nesta temporada" : ""}.</p>
          ) : (
            <ul>
              {recent.map(({ match: m, competition }) => (
                <li key={m.id}>
                  <Link href={`/app/partidas/${m.id}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-[var(--surface-2)]">
                    <FormChip result={matchResult(m.goalsFor!, m.goalsAgainst!)} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">vs {m.opponentName}</span>
                      <span className="block truncate text-xs text-ink-400">{fmtDate(m.kickoffAt)} · {competition ?? "Sem competição"}</span>
                    </span>
                    <ScoreBox gf={m.goalsFor!} ga={m.goalsAgainst!} result={matchResult(m.goalsFor!, m.goalsAgainst!)} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={<span id="avisos">Avisos</span>} icon={Megaphone} link={{ href: "/app/avisos", label: "Ver todos" }}>
          {announcements.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">Sem avisos ativos.</p>
          ) : (
            <div className="grid gap-3">{announcements.map((a) => <AnnouncementCard key={a.id} a={a} compact poll={polls.get(a.id)} canVote />)}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
