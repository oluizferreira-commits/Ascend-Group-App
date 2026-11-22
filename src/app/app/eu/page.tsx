import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GitCompareArrows, Pencil } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { currentSeasonInfo, getCardsData, getMe, overallTrend } from "@/server/services/player-card";
import { OverallTrend } from "@/components/cards/overall-trend";
import { pendingCallupsFor } from "@/server/services/calendar";
import { PlayerCard } from "@/components/cards/player-card";
import { ShareImageButton } from "@/components/share/share-image";
import { NumberTicker } from "@/components/fx/number-ticker";
import { Reveal, RevealItem, Stagger } from "@/components/fx/reveal";
import { SectionTitle, StatTile } from "@/components/ui/basics";
import { POSITION_NAMES } from "@/lib/domain";
import { fmtNum, fmtWeekdayTime } from "@/lib/format";

export const metadata: Metadata = { title: "Meu espaço" };

export default async function MePage() {
  const ctx = await requirePage("dashboard.view");
  const me = await getMe(ctx);
  if (!me) redirect("/app/conta");
  const { seasonId, seasonName } = await currentSeasonInfo(ctx.club.id);
  const [{ cards }, callups] = await Promise.all([getCardsData(ctx.club.id, seasonId), pendingCallupsFor(me.id)]);
  const c = cards.get(me.id)!;
  const trend = await overallTrend(me.id, me.overall);
  const s = c.summary;

  return (
    <div className="space-y-8">
      <section className="card-premium relative overflow-hidden px-5 py-8 sm:px-10">
        {me.shirtNumber != null && (
          <span aria-hidden className="pointer-events-none absolute -top-6 right-[-2%] font-display text-[13rem] leading-none font-bold text-transparent sm:text-[18rem]"
            style={{ WebkitTextStroke: "2px rgb(255 255 255 / 0.12)" }}>{me.shirtNumber}</span>
        )}
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center">
          <Reveal><PlayerCard nickname={me.nickname} position={me.primaryPosition} shirtNumber={me.shirtNumber} avatarUrl={me.avatarUrl}
            ovr={c.ovr.value} ovrSource={c.ovr.source} attributes={c.attributes} seasonLabel={seasonName ? `Temporada ${seasonName}` : "Ascend CF"} size="lg" tilt /></Reveal>
          <div className="text-center md:text-left">
            <p className="font-display text-sm font-semibold tracking-[0.35em] text-silver uppercase">{me.shirtNumber != null ? `Camisa ${me.shirtNumber}` : "Ascend CF"}</p>
            <h1 className="mt-1 font-display text-5xl leading-none font-bold tracking-[0.03em] text-white uppercase sm:text-6xl">{me.nickname}</h1>
            <p className="mt-2 text-ink-300">{POSITION_NAMES[me.primaryPosition]}</p>
            <OverallTrend trend={trend} synced={me.overallSource === "ea" ? me.overallSyncedAt : null} className="mt-2 justify-center text-ink-300 md:justify-start" />
            <p className="mt-1 text-xs text-ink-400">{c.ovr.source === "ea" ? "Geral = overall do EA FC" : c.ovr.source === "rating" ? "Geral = nota média × 10" : "Sem jogos registrados ainda"} · atributos comparados ao elenco</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 md:justify-start">
              <ShareImageButton url={`/api/card/${me.id}`} filename={`ascend-carta-${me.shirtNumber ?? me.nickname}.png`} title={`Minha carta no Ascend CF`} label="Compartilhar carta"
                className="btn bg-white text-[#0c1d4f] hover:bg-[#e6ecfd]" />
              <Link href={`/app/comparar?a=${me.id}`} className="btn border border-white/25 text-white hover:bg-white/10"><GitCompareArrows className="size-4" />Comparar</Link>
              <Link href={`/app/elenco/${me.id}`} className="btn border border-white/25 text-white hover:bg-white/10">Meu perfil</Link>
            </div>
          </div>
        </div>
      </section>

      {callups.length > 0 && (
        <section className="rounded-lg border border-accent-500/50 border-l-4 border-l-accent-500 bg-accent-500/10 p-4">
          <p className="eyebrow mb-2">Convocações aguardando sua resposta</p>
          <ul className="space-y-1">{callups.map(({ e }) => (
            <li key={e.id}><Link href={`/app/calendario/${e.id}`} className="text-sm hover:text-accent-400"><b>{e.title}</b> · <span className="capitalize">{fmtWeekdayTime(e.startsAt)}</span> — <span className="text-accent-400 underline">responder</span></Link></li>
          ))}</ul>
        </section>
      )}

      <section>
        <SectionTitle>Minha temporada{seasonName ? ` · ${seasonName}` : ""}</SectionTitle>
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RevealItem><StatTile label="Jogos" value={<NumberTicker value={s.matches} />} sub={`${s.wins}V ${s.draws}E ${s.losses}D`} /></RevealItem>
          <RevealItem><StatTile label="Gols" value={<NumberTicker value={s.goals} />} accent="gold" sub={`${fmtNum(s.goalsPerMatch, 2)} por jogo`} /></RevealItem>
          <RevealItem><StatTile label="Assistências" value={<NumberTicker value={s.assists} />} accent="gold" sub={`${fmtNum(s.assistsPerMatch, 2)} por jogo`} /></RevealItem>
          <RevealItem><StatTile label="Nota média" value={s.avgRating != null ? <NumberTicker value={s.avgRating} decimals={1} /> : "—"} sub={s.optional.motm?.total ? `${s.optional.motm.total}× melhor em campo` : undefined} /></RevealItem>
        </Stagger>
      </section>

      {ctx.permissions.has("players.manage") && (
        <Link href={`/app/elenco/${me.id}/editar`} className="btn-secondary"><Pencil className="size-4" />Editar meus dados</Link>
      )}
    </div>
  );
}
