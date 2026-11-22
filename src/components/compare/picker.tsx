"use client";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";

type Opt = { id: string; label: string };

/** Changes the comparison as soon as a select changes (no submit button needed). */
export function ComparePicker({ players, seasons, a, b, season }: { players: Opt[]; seasons: Opt[]; a?: string; b?: string; season: string }) {
  const router = useRouter();
  const go = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ a, b, season, ...patch }).filter(([, v]) => v) as [string, string][]);
    router.replace(`/app/comparar?${q}`, { scroll: false });
  };
  return (
    <div className="card grid grid-cols-[1fr_auto_1fr] items-end gap-2 p-4 sm:grid-cols-[1fr_auto_1fr_200px] sm:gap-3">
      <label className="text-sm"><span className="label">Jogador A</span>
        <select value={a ?? ""} onChange={(e) => go({ a: e.target.value })} className="input border-accent-500/60">
          <option value="">Escolha…</option>{players.map((p) => <option key={p.id} value={p.id} disabled={p.id === b}>{p.label}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => go({ a: b, b: a })} className="btn-ghost mb-0.5 px-2" aria-label="Trocar lados"><ArrowLeftRight className="size-4" /></button>
      <label className="text-sm"><span className="label">Jogador B</span>
        <select value={b ?? ""} onChange={(e) => go({ b: e.target.value })} className="input">
          <option value="">Escolha…</option>{players.map((p) => <option key={p.id} value={p.id} disabled={p.id === a}>{p.label}</option>)}
        </select>
      </label>
      <label className="col-span-3 text-sm sm:col-span-1"><span className="label">Período</span>
        <select value={season} onChange={(e) => go({ season: e.target.value })} className="input">
          <option value="current">Temporada atual</option><option value="all">Carreira (tudo)</option>
          {seasons.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
