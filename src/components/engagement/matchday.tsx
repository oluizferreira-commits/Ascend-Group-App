"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, ClipboardList, Users } from "lucide-react";
import { respondCallupAction } from "@/server/actions/calendar";
import { BorderBeam } from "@/components/fx/border-beam";
import { SlideToConfirm } from "@/components/mobile/slide-to-confirm";
import { cn } from "@/lib/cn";

type Props = {
  serverNow: number;
  kickoffIso: string; opponent: string; competition: string | null; matchId: string;
  lineup: { id: string; name: string; formation: string } | null;
  eventId: string | null; called: number; confirmed: number; pending: number; myStatus: string | null;
};

function useCountdown(target: number, serverNow: number) {
  // Start from the server clock so the first client render matches the HTML (no hydration mismatch).
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return target - now;
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

export function MatchdayHero(p: Props) {
  const kickoff = new Date(p.kickoffIso).getTime();
  const left = useCountdown(kickoff, p.serverNow);
  const live = left <= 0;
  const [status, setStatus] = useState(p.myStatus);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const h = Math.floor(left / 3600_000), mi = Math.floor((left % 3600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(kickoff);

  const confirm = () => start(async () => {
    if (!p.eventId) return;
    setErr(null);
    const prev = status;
    setStatus("confirmed");
    const fd = new FormData();
    fd.set("status", "confirmed");
    const r = await respondCallupAction(p.eventId, null, fd);
    if (!r.ok) { setStatus(prev); setErr(r.error); }
    else navigator.vibrate?.(15);
  });

  return (
    <section className="card-premium px-5 py-6 sm:px-8">
      <BorderBeam duration={6} color="#9db4ff" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-xs font-bold tracking-[0.2em] uppercase", live ? "bg-loss text-white" : "bg-white text-[#0c1d4f]")}>
            {live && <span className="size-2 animate-pulse rounded-full bg-white" />}{live ? "Em andamento" : "Dia de jogo"}
          </span>
          <span className="text-xs text-ink-300">{p.competition ?? "Amistoso"} · {time}</span>
        </div>
        <p className="mt-4 font-display text-sm tracking-[0.3em] text-silver uppercase">Ascend CF ×</p>
        <h2 className="font-display text-4xl leading-none font-bold text-white uppercase sm:text-5xl">{p.opponent}</h2>

        {!live && (
          <div className="mt-5 flex gap-2 font-display text-white" aria-label={`Faltam ${h} horas, ${mi} minutos e ${s} segundos`}>
            {[[pad(h), "h"], [pad(mi), "min"], [pad(s), "s"]].map(([v, l]) => (
              <div key={l} className="w-20 rounded-lg bg-white/10 py-2 text-center">
                <motion.div key={v} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-bold tabular-nums">{v}</motion.div>
                <div className="text-[10px] tracking-[0.2em] text-ink-300 uppercase">{l}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {p.eventId && status && status !== "confirmed" && status !== "present" && !live && (
            <SlideToConfirm label="Tô dentro!" onConfirm={confirm} disabled={pending} />
          )}
          {(status === "confirmed" || status === "present") && (
            <span className="inline-flex h-12 items-center gap-2 rounded-md bg-win/20 px-4 font-display font-bold tracking-wider text-win uppercase"><Check className="size-5" />Você está dentro</span>
          )}
          {p.lineup && <Link href={`/app/escalacoes/${p.lineup.id}`} className="btn h-12 border border-white/25 text-white hover:bg-white/10"><ClipboardList className="size-4" />Escalação · {p.lineup.formation}</Link>}
          {p.eventId && <Link href={`/app/calendario/${p.eventId}`} className="btn h-12 border border-white/25 text-white hover:bg-white/10"><Users className="size-4" />{p.confirmed}/{p.called} confirmados</Link>}
          {!p.eventId && <Link href={`/app/partidas/${p.matchId}`} className="btn h-12 border border-white/25 text-white hover:bg-white/10">Detalhes da partida</Link>}
        </div>
        {err && <p className="mt-2 text-sm text-red-200">{err}</p>}
      </div>
    </section>
  );
}
