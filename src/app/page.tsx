import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Crest } from "@/components/crest";
import { AnnouncementCard } from "@/components/announcement-card";
import { ResultPill, StatTile } from "@/components/ui/basics";
import { getPublicClub } from "@/server/services/club";
import { clubRecord } from "@/server/services/stats";
import { recentResults } from "@/server/services/matches";
import { listActiveAnnouncements } from "@/server/services/announcements";
import { getSessionUser } from "@/server/auth/session";
import { getThemeMode } from "@/lib/theme";
import { after } from "next/server";
import { maybeAutoSync } from "@/server/services/ea-sync";
import { runReminders } from "@/server/reminders";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextReveal } from "@/components/fx/text-reveal";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Marquee } from "@/components/fx/marquee";
import { Reveal, RevealItem, Stagger } from "@/components/fx/reveal";
import { matchResult } from "@/lib/domain";
import { fmtDate, fmtPct } from "@/lib/format";

export default async function PublicHome() {
  const [pub, user] = await Promise.all([getPublicClub(), getSessionUser()]);
  if (!pub) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div><Crest size={96} /><p className="mt-4 text-ink-400">Plataforma ainda não configurada. Rode <code>npm run db:setup</code>.</p></div>
      </main>
    );
  }
  after(() => maybeAutoSync(pub.club.id));
  after(() => runReminders(pub.club.id));
  const [season] = await db.select().from(schema.seasons).where(and(eq(schema.seasons.clubId, pub.club.id), eq(schema.seasons.isCurrent, true)));
  const [record, recent, news] = await Promise.all([
    clubRecord({ clubId: pub.club.id, seasonId: season?.id ?? null }),
    recentResults(pub.club.id, 5, season?.id ?? null),
    listActiveAnnouncements(pub.club.id, ["public"], 4),
  ]);

  const theme = await getThemeMode();
  return (
    <main className="min-h-dvh">
      <header className="scope-dark glass-dark sticky top-0 z-20 border-b text-ink-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Crest size={40} priority />
            <span className="leading-none">
              <span className="block font-display text-xl font-bold tracking-[0.08em] text-white uppercase">{pub.club.name}</span>
              <span className="mt-1 block font-display text-[10px] font-semibold tracking-[0.3em] text-silver uppercase">{pub.org.name}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle initial={theme} />
            <Link href={user ? "/app" : "/login"} className="btn-primary">{user ? "Abrir painel" : "Área do clube"}</Link>
          </div>
        </div>
      </header>

      <section className="card-premium rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 md:flex-row md:py-20 md:text-left">
          <Crest size={240} priority />
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.4em] text-silver uppercase">EA SPORTS FC™ Pro Clubs</p>
            <h1 className="mt-2 font-display text-7xl leading-[0.9] font-bold tracking-[0.03em] text-white uppercase sm:text-8xl"><TextReveal text={pub.club.name} delay={0.1} /></h1>
            <p className="mt-4 font-display text-lg font-medium tracking-[0.45em] text-silver">{pub.org.motto}</p>
            <Link href="/seja-do-ascend" className="btn shine mt-6 bg-white text-[#0c1d4f] hover:bg-[#e6ecfd]">Seja do Ascend</Link>
            <p className="mt-6 text-sm text-ink-300">{season ? `Temporada ${season.name}` : "Temporada em definição"}{season?.division ? ` · ${season.division}` : ""}</p>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <div className="scope-dark border-b border-white/5 bg-[#060a16] py-3 text-ink-100">
          <Marquee duration={Math.max(20, recent.length * 7)}>
            {recent.map(({ match: m }) => {
              const r = matchResult(m.goalsFor!, m.goalsAgainst!);
              return (
                <span key={m.id} className="flex items-center gap-3 font-display text-sm font-semibold tracking-[0.12em] whitespace-nowrap uppercase">
                  <span className={r === "W" ? "text-win" : r === "L" ? "text-loss" : "text-ink-400"}>●</span>
                  Ascend CF <span className="text-lg text-white tabular-nums">{m.goalsFor} – {m.goalsAgainst}</span> {m.opponentName}
                  <span className="text-ink-500">{fmtDate(m.kickoffAt)}</span>
                </span>
              );
            })}
          </Marquee>
        </div>
      )}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <RevealItem><StatTile label="Partidas" value={<NumberTicker value={record.played} />} /></RevealItem>
          <RevealItem><StatTile label="Vitórias" value={<NumberTicker value={record.wins} />} accent="win" /></RevealItem>
          <RevealItem><StatTile label="Empates" value={<NumberTicker value={record.draws} />} accent="draw" /></RevealItem>
          <RevealItem><StatTile label="Derrotas" value={<NumberTicker value={record.losses} />} accent="loss" /></RevealItem>
          <RevealItem><StatTile label="Aproveitamento" value={record.pointsPct == null ? fmtPct(null) : <NumberTicker value={record.pointsPct} decimals={1} suffix="%" />} accent="gold" /></RevealItem>
        </Stagger>
      </section>

      <Reveal className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-xl font-bold tracking-[0.1em] uppercase">Últimos resultados</h2>
          {recent.length === 0 ? <p className="text-sm text-ink-400">Nenhum resultado publicado.</p> : (
            <ul className="divide-y divide-ink-700">
              {recent.map(({ match: m, competition }) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <ResultPill result={matchResult(m.goalsFor!, m.goalsAgainst!)} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">vs {m.opponentName}</span><span className="text-xs text-ink-400">{fmtDate(m.kickoffAt)} · {competition ?? "Sem competição"}</span></span>
                  <span className="font-display text-2xl font-bold tabular-nums">{m.goalsFor}–{m.goalsAgainst}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-display text-xl font-bold tracking-[0.1em] uppercase">Comunicados</h2>
          {news.length === 0 ? <p className="text-sm text-ink-400">Nenhum comunicado público.</p> : <div className="space-y-3">{news.map((a) => <AnnouncementCard key={a.id} a={a} compact />)}</div>}
        </div>
      </Reveal>

      <footer className="scope-dark bg-[#060a16] py-8 text-center text-xs text-ink-400">
        <p className="mb-2 font-display text-sm tracking-[0.4em] text-silver">RISE. CONQUER. ASCEND.</p>
        © {pub.org.name} · {pub.club.name}. EA SPORTS FC é marca da Electronic Arts; esta plataforma não é afiliada à EA.
        <p className="mt-2"><Link href="/privacidade" className="hover:text-ink-100">Privacidade</Link> · <Link href="/privacidade#cookies" className="hover:text-ink-100">Cookies</Link> · <Link href="/seja-do-ascend" className="hover:text-ink-100">Seja do Ascend</Link></p>
      </footer>
    </main>
  );
}
