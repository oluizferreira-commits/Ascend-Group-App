import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { getCardsData } from "@/server/services/player-card";
import { togetherStats } from "@/server/services/compare";
import { PageHeader, SectionTitle, EmptyState } from "@/components/ui/basics";
import { PlayerCard } from "@/components/cards/player-card";
import { CompareRadar } from "@/components/compare/radar";
import { ComparePicker } from "@/components/compare/picker";
import { ShareImageButton } from "@/components/share/share-image";
import { Reveal } from "@/components/fx/reveal";
import { NumberTicker } from "@/components/fx/number-ticker";
import { compareSummaries, type RowResult } from "@/lib/compare";
import { ATTRIBUTES, type AttributeKey } from "@/lib/attributes";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Comparar jogadores" };

const isId = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

function Bar({ r }: { r: RowResult }) {
  const max = Math.max(Math.abs(r.a ?? 0), Math.abs(r.b ?? 0)) || 1;
  const wa = r.a == null ? 0 : (Math.abs(r.a) / max) * 100;
  const wb = r.b == null ? 0 : (Math.abs(r.b) / max) * 100;
  const fmt = (v: number | null) => (v == null ? "sem dados" : r.row.format(v));
  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className={cn("font-display text-lg font-bold tabular-nums", r.winner === "a" ? "text-accent-400" : r.a == null ? "text-xs font-normal text-ink-500" : "text-ink-300")}>{fmt(r.a)}</span>
        <span className="text-center text-xs font-medium tracking-wide text-ink-400 uppercase">{r.row.label}{r.row.better === "low" && <span className="normal-case"> (menos é melhor)</span>}</span>
        <span className={cn("font-display text-lg font-bold tabular-nums", r.winner === "b" ? "text-ink-100" : r.b == null ? "text-xs font-normal text-ink-500" : "text-ink-300")}>{fmt(r.b)}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="flex h-2 justify-end overflow-hidden rounded-l-full bg-ink-800">
          <div className={cn("h-full rounded-l-full transition-all duration-700", r.winner === "a" ? "bg-accent-500" : "bg-accent-500/40")} style={{ width: `${wa}%` }} />
        </div>
        <div className="flex h-2 overflow-hidden rounded-r-full bg-ink-800">
          <div className={cn("h-full rounded-r-full transition-all duration-700", r.winner === "b" ? "bg-ink-200" : "bg-ink-400/50")} style={{ width: `${wb}%` }} />
        </div>
      </div>
    </div>
  );
}

function Duo({ title, a, b }: { title: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-ink-850 p-3 text-center">
      <p className="font-display text-[11px] tracking-[0.14em] text-ink-400 uppercase">{title}</p>
      <div className="mt-1 grid grid-cols-2 font-display text-xl font-bold tabular-nums"><span className="text-accent-400">{a}</span><span>{b}</span></div>
    </div>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; season?: string }> }) {
  const ctx = await requirePage("stats.view");
  const sp = await searchParams;
  const [overview, seasons] = await Promise.all([getClubOverview(ctx.club.id), listSeasons(ctx.club.id)]);
  const seasonParam = sp.season === "all" ? "all" : isId(sp.season) && seasons.some((s) => s.id === sp.season) ? sp.season! : "current";
  const seasonId = seasonParam === "all" ? null : seasonParam === "current" ? overview.currentSeason?.id ?? null : seasonParam;
  const seasonLabel = seasonParam === "all" ? "Carreira" : seasons.find((s) => s.id === seasonId)?.name ? `Temporada ${seasons.find((s) => s.id === seasonId)!.name}` : "Todas as partidas";
  const { cards } = await getCardsData(ctx.club.id, seasonId);
  const options = [...cards.values()].filter((c) => c.player.status !== "inactive" || c.player.id === sp.a || c.player.id === sp.b)
    .sort((x, y) => x.player.nickname.localeCompare(y.player.nickname))
    .map((c) => ({ id: c.player.id, label: `${c.player.shirtNumber != null ? `#${c.player.shirtNumber} ` : ""}${c.player.nickname} (${POSITION_LABELS[c.player.primaryPosition]})` }));
  const A = isId(sp.a) ? cards.get(sp.a!) : undefined;
  const B = isId(sp.b) && sp.b !== sp.a ? cards.get(sp.b!) : undefined;

  const picker = <ComparePicker players={options} seasons={seasons.map((s) => ({ id: s.id, label: s.name }))} a={A?.player.id} b={B?.player.id} season={seasonParam} />;

  if (!A || !B) {
    return (
      <>
        <PageHeader eyebrow="Análise" title="Comparar jogadores" description="Escolha dois jogadores para ver cartas, radar de atributos, estatísticas frente a frente e o desempenho do time com os dois em campo." />
        {picker}
        <div className="mt-6"><EmptyState title={A ? "Agora escolha o jogador B" : "Escolha dois jogadores"}>A comparação usa apenas estatísticas registradas — o que não foi registrado aparece como “sem dados”.</EmptyState></div>
      </>
    );
  }

  const { rows, score } = compareSummaries(A.summary, B.summary);
  const groups = [...new Set(rows.map((r) => r.row.group))];
  const tog = await togetherStats(ctx.club.id, A.player.id, B.player.id, seasonId);
  const attrWinner = (k: AttributeKey, me: "a" | "b") => {
    const va = A.attributes[k], vb = B.attributes[k];
    return va != null && vb != null && (me === "a" ? va > vb : vb > va);
  };
  const leader = score.a === score.b ? null : score.a > score.b ? A.player.nickname : B.player.nickname;

  return (
    <>
      <PageHeader eyebrow={`Análise · ${seasonLabel}`} title="Comparar jogadores"
        actions={<ShareImageButton url={`/api/compare?a=${A.player.id}&b=${B.player.id}&season=${seasonParam}`} filename={`ascend-${A.player.nickname}-vs-${B.player.nickname}.png`} title={`${A.player.nickname} x ${B.player.nickname} · Ascend CF`} />} />
      {picker}

      <section className="card-premium mt-6 px-3 py-8 sm:px-8">
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          <Reveal className="flex min-w-0 justify-center"><PlayerCard nickname={A.player.nickname} position={A.player.primaryPosition} shirtNumber={A.player.shirtNumber} avatarUrl={A.player.avatarUrl} photoX={A.player.photoX} photoY={A.player.photoY} photoZoom={A.player.photoZoom}
            ovr={A.ovr.value} ovrSource={A.ovr.source} attributes={A.attributes} size="md" tilt
            highlight={Object.fromEntries((Object.keys(ATTRIBUTES) as AttributeKey[]).map((k) => [k, attrWinner(k, "a")]))} /></Reveal>
          <div className="flex flex-col items-center text-center">
            <span className="font-display text-sm tracking-[0.3em] text-silver">VS</span>
            <span className="mt-2 font-display text-4xl font-bold text-white tabular-nums sm:text-6xl">
              <NumberTicker value={score.a} /><span className="mx-1 text-silver sm:mx-2">×</span><NumberTicker value={score.b} />
            </span>
            <span className="mt-1 text-[11px] text-ink-300 sm:text-xs">categorias vencidas</span>
            {leader && <span className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">Vantagem: {leader}</span>}
            {score.ties > 0 && <span className="mt-1 text-[11px] text-ink-400">{score.ties} empate(s)</span>}
          </div>
          <Reveal delay={0.1} className="flex min-w-0 justify-center"><PlayerCard nickname={B.player.nickname} position={B.player.primaryPosition} shirtNumber={B.player.shirtNumber} avatarUrl={B.player.avatarUrl} photoX={B.player.photoX} photoY={B.player.photoY} photoZoom={B.player.photoZoom}
            ovr={B.ovr.value} ovrSource={B.ovr.source} attributes={B.attributes} size="md" tilt
            highlight={Object.fromEntries((Object.keys(ATTRIBUTES) as AttributeKey[]).map((k) => [k, attrWinner(k, "b")]))} /></Reveal>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Reveal className="space-y-6">
          <section className="card p-5">
            <SectionTitle>Radar de atributos</SectionTitle>
            <CompareRadar a={A.attributes} b={B.attributes} nameA={A.player.nickname} nameB={B.player.nickname} />
            <p className="mt-3 text-xs text-ink-400">Atributos relativos ao elenco (30–99). Sem dados = centro do gráfico.</p>
          </section>
          <section className="card p-5">
            <SectionTitle>Juntos em campo</SectionTitle>
            {tog.together.played === 0 ? <p className="text-sm text-ink-400">Os dois ainda não jogaram a mesma partida {seasonParam === "all" ? "" : "neste período"}.</p> : (
              <>
                <p className="text-sm text-ink-300"><b className="text-ink-100">{tog.together.played}</b> jogos juntos · {tog.together.wins}V {tog.together.draws}E {tog.together.losses}D · gols {tog.together.gf}:{tog.together.ga}</p>
                <p className="mt-1 font-display text-4xl font-bold text-accent-400">{fmtNum(tog.together.pointsPct, 1)}%<span className="ml-2 font-sans text-xs font-normal text-ink-400">de aproveitamento juntos</span></p>
              </>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Duo title={`Só ${A.player.nickname}`} a={tog.onlyA.played ? `${fmtNum(tog.onlyA.pointsPct, 0)}%` : "—"} b={<span className="text-xs font-normal text-ink-400">{tog.onlyA.played} jogos</span>} />
              <Duo title={`Só ${B.player.nickname}`} a={<span className="text-xs font-normal text-ink-400">{tog.onlyB.played} jogos</span>} b={tog.onlyB.played ? `${fmtNum(tog.onlyB.pointsPct, 0)}%` : "—"} />
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="card p-5">
            <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="truncate font-display text-lg font-bold text-accent-400 uppercase">{A.player.nickname}</span>
              <span className="text-xs text-ink-400">frente a frente</span>
              <span className="truncate text-right font-display text-lg font-bold uppercase">{B.player.nickname}</span>
            </div>
            {groups.map((g) => (
              <div key={g} className="border-t border-ink-800 pt-3 first:border-0">
                <p className="eyebrow mt-2">{g}</p>
                <div className="divide-y divide-ink-800/60">{rows.filter((r) => r.row.group === g).map((r) => <Bar key={r.row.key} r={r} />)}</div>
              </div>
            ))}
          </section>
        </Reveal>
      </div>
    </>
  );
}
