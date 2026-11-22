import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { currentSeasonInfo, getCardsData, overallTrend } from "@/server/services/player-card";
import { OverallTrend } from "@/components/cards/overall-trend";
import { PlayerCard } from "@/components/cards/player-card";
import { ShareImageButton } from "@/components/share/share-image";
import { PageHeader } from "@/components/ui/basics";
import { ATTRIBUTES, type AttributeKey } from "@/lib/attributes";

export const metadata: Metadata = { title: "Carta do jogador" };

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("players.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { seasonId, seasonName } = await currentSeasonInfo(ctx.club.id);
  const { cards } = await getCardsData(ctx.club.id, seasonId);
  const c = cards.get(id);
  if (!c) notFound();
  const p = c.player;
  const trend = await overallTrend(p.id, p.overall);
  return (
    <>
      <PageHeader eyebrow="Carta" title={p.nickname} actions={<>
        <ShareImageButton url={`/api/card/${id}`} filename={`ascend-carta-${p.shirtNumber ?? p.nickname}.png`} title={`${p.nickname} · Ascend CF`} />
        <Link href={`/app/comparar?a=${id}`} className="btn-secondary"><GitCompareArrows className="size-4" />Comparar</Link>
      </>} />
      <div className="grid items-start gap-8 md:grid-cols-[auto_1fr]">
        <div className="mx-auto"><PlayerCard nickname={p.nickname} position={p.primaryPosition} shirtNumber={p.shirtNumber} avatarUrl={p.avatarUrl}
          ovr={c.ovr.value} ovrSource={c.ovr.source} attributes={c.attributes} seasonLabel={seasonName ? `Temporada ${seasonName}` : "Ascend CF"} size="lg" tilt /></div>
        <section className="card p-5">
          <OverallTrend trend={trend} synced={p.overallSource === "ea" ? p.overallSyncedAt : null} className="mb-3 text-ink-400" />
          <p className="mb-3 text-sm text-ink-400">
            {c.ovr.source === "ea" ? "O número grande é o overall informado do EA FC." : c.ovr.source === "rating" ? "O número grande é a nota média da temporada × 10." : "Ainda sem partidas registradas."}{" "}
            Os atributos mostram a posição do jogador <b className="text-ink-200">em relação ao elenco</b> (30 = menor, 99 = maior) e só usam estatísticas registradas.
          </p>
          <dl className="divide-y divide-ink-800">
            {(Object.keys(ATTRIBUTES) as AttributeKey[]).map((k) => (
              <div key={k} className="flex items-center gap-3 py-2.5">
                <dt className="w-10 font-display font-bold text-accent-400">{k}</dt>
                <dd className="flex-1 text-sm"><span className="text-ink-100">{ATTRIBUTES[k].label}</span> <span className="text-xs text-ink-400">· {ATTRIBUTES[k].hint}</span></dd>
                <dd className="w-28">
                  {c.attributes[k] == null ? <span className="text-xs text-ink-400">sem dados</span> : (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800"><span className="block h-full rounded-full bg-accent-500" style={{ width: `${c.attributes[k]}%` }} /></span>
                      <b className="w-6 text-right font-display tabular-nums">{c.attributes[k]}</b>
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
