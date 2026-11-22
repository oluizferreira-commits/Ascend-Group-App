"use client";
import { useActionState, useMemo, useState } from "react";
import { Shield, X } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { POSITION_LABELS, PLAYER_STATUS_LABELS, type Position } from "@/lib/domain";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/server/errors";

type Slot = { key: string; label: string; position: string; x: number; y: number };
type Formation = { id: string; name: string; slots: Slot[] };
type P = { id: string; nickname: string; shirtNumber: number | null; primaryPosition: Position; secondaryPositions: Position[]; status: string; overall: number | null };

export type LineupInitial = {
  name?: string; formationId?: string; opponentName?: string | null; matchId?: string | null; notes?: string | null;
  captainId?: string | null; freeKickTakerId?: string | null; penaltyTakerId?: string | null; cornerTakerId?: string | null;
  slots?: Record<string, string>; bench?: string[];
};

const TAKERS = [
  ["captainId", "Capitão", "C"], ["penaltyTakerId", "Pênaltis", "PN"], ["freeKickTakerId", "Faltas", "FT"], ["cornerTakerId", "Escanteios", "ES"],
] as const;

function Chip({ p, compact, selected, readOnly, onSelect }: { p: P; compact?: boolean; selected: boolean; readOnly?: boolean; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      draggable={!readOnly}
      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
      onClick={() => !readOnly && onSelect(p.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition",
        selected ? "border-accent-400 bg-accent-500/15" : "border-ink-600 bg-ink-850 hover:border-accent-600/60",
        p.status === "unavailable" || p.status === "sidelined" ? "opacity-60" : "",
      )}
      title={PLAYER_STATUS_LABELS[p.status as keyof typeof PLAYER_STATUS_LABELS]}
    >
      <span className="font-display text-accent-400">{p.shirtNumber ?? "–"}</span>
      <span className="truncate">{p.nickname}</span>
      {!compact && <span className="ml-auto text-[10px] text-ink-400">{POSITION_LABELS[p.primaryPosition]}</span>}
    </button>
  );
}

export function LineupEditor({ action, formations, players, matches, initial = {}, readOnly }: {
  action: (prev: ActionResult | null, f: FormData) => Promise<ActionResult>;
  formations: Formation[]; players: P[]; matches: { id: string; label: string }[]; initial?: LineupInitial; readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [name, setName] = useState(initial.name ?? "");
  const [formationId, setFormationId] = useState(initial.formationId ?? formations[0]?.id);
  const [opponentName, setOpponent] = useState(initial.opponentName ?? "");
  const [matchId, setMatchId] = useState(initial.matchId ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [slots, setSlots] = useState<Record<string, string>>(initial.slots ?? {});
  const [bench, setBench] = useState<string[]>(initial.bench ?? []);
  const [takers, setTakers] = useState({
    captainId: initial.captainId ?? "", penaltyTakerId: initial.penaltyTakerId ?? "",
    freeKickTakerId: initial.freeKickTakerId ?? "", cornerTakerId: initial.cornerTakerId ?? "",
  });
  const [selected, setSelected] = useState<string | null>(null);

  const formation = formations.find((f) => f.id === formationId)!;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const starters = Object.values(slots);
  const pool = players.filter((p) => !starters.includes(p.id) && !bench.includes(p.id));

  const changeFormation = (id: string) => {
    const next = formations.find((f) => f.id === id)!;
    // keep players whose slot key exists in the new formation; others go to the bench
    const kept: Record<string, string> = {};
    const moved: string[] = [];
    for (const [k, pid] of Object.entries(slots)) {
      if (next.slots.some((s) => s.key === k)) kept[k] = pid;
      else moved.push(pid);
    }
    setSlots(kept);
    setBench((b) => [...b, ...moved].slice(0, 12));
    setFormationId(id);
  };

  const removeEverywhere = (pid: string) => {
    setSlots((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== pid)));
    setBench((b) => b.filter((x) => x !== pid));
  };

  const placeInSlot = (slotKey: string, pid: string) => {
    if (readOnly) return;
    const prevSlotOfPid = Object.entries(slots).find(([, v]) => v === pid)?.[0];
    const occupant = slots[slotKey];
    const next = { ...slots };
    delete next[prevSlotOfPid ?? "__"];
    next[slotKey] = pid;
    if (occupant && occupant !== pid) {
      if (prevSlotOfPid) next[prevSlotOfPid] = occupant; // swap
    }
    setSlots(next);
    setBench((b) => {
      let nb = b.filter((x) => x !== pid);
      if (occupant && occupant !== pid && !prevSlotOfPid) nb = [...nb, occupant];
      return nb;
    });
    setSelected(null);
  };

  const toBench = (pid: string) => {
    if (readOnly) return;
    removeEverywhere(pid);
    setBench((b) => (b.length >= 12 ? b : [...b.filter((x) => x !== pid), pid]));
    setSelected(null);
  };

  const fits = (p: P, pos: string) => p.primaryPosition === pos || p.secondaryPositions.includes(pos as Position);
  const payload = JSON.stringify({
    name, formationId, opponentName, matchId, notes, slots, bench,
    captainId: takers.captainId || null, penaltyTakerId: takers.penaltyTakerId || null,
    freeKickTakerId: takers.freeKickTakerId || null, cornerTakerId: takers.cornerTakerId || null,
  });

  const toggleSel = (id: string) => setSelected((cur) => (cur === id ? null : id));
  const badgesFor = (pid: string) => TAKERS.filter(([k]) => takers[k] === pid).map(([, , s]) => s);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="payload" value={payload} />
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm"><span className="label">Nome *</span><input disabled={readOnly} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className="input" placeholder="Ex.: Base liga · 4-3-3" /></label>
        <label className="text-sm"><span className="label">Formação</span>
          <select disabled={readOnly} value={formationId} onChange={(e) => changeFormation(e.target.value)} className="input">
            {formations.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label className="text-sm"><span className="label">Estratégia contra (adversário)</span><input disabled={readOnly} value={opponentName} onChange={(e) => setOpponent(e.target.value)} maxLength={80} className="input" placeholder="Opcional" /></label>
        <label className="text-sm"><span className="label">Partida</span>
          <select disabled={readOnly} value={matchId} onChange={(e) => setMatchId(e.target.value)} className="input">
            <option value="">Nenhuma</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Pitch */}
        <div className="relative mx-auto aspect-[68/100] w-full max-w-[560px] overflow-hidden rounded-xl border border-accent-700/40 bg-gradient-to-b from-[#0f2a1c] to-[#0b1f15]">
          <svg viewBox="0 0 68 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <g fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="0.35">
              <rect x="2" y="2" width="64" height="96" />
              <line x1="2" y1="50" x2="66" y2="50" />
              <circle cx="34" cy="50" r="8" />
              <rect x="16" y="2" width="36" height="15" /><rect x="25" y="2" width="18" height="5" />
              <rect x="16" y="83" width="36" height="15" /><rect x="25" y="93" width="18" height="5" />
            </g>
          </svg>
          {formation.slots.map((s) => {
            const p = slots[s.key] ? byId.get(slots[s.key]) : undefined;
            const off = p && !fits(p, s.position);
            return (
              <div
                key={s.key}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${s.x}%`, top: `${100 - s.y}%` }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) placeInSlot(s.key, id); }}
              >
                <button
                  type="button"
                  onClick={() => (selected ? placeInSlot(s.key, selected) : p && !readOnly && setSelected(p.id))}
                  className={cn(
                    "flex w-[4.75rem] flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-center transition sm:w-24",
                    selected && !readOnly ? "ring-1 ring-accent-400/60" : "",
                    p && selected === p.id ? "bg-accent-500/25" : "",
                  )}
                  aria-label={`${s.label}${p ? `: ${p.nickname}` : " vazio"}`}
                >
                  <span className={cn(
                    "grid size-9 place-items-center rounded-full border-2 font-display text-sm font-bold sm:size-11",
                    p ? "border-accent-400 bg-gradient-to-br from-brand-700 to-brand-900 text-accent-200" : "border-dashed border-white/40 bg-black/30 text-white/60",
                  )}>
                    {p ? p.shirtNumber ?? p.nickname[0]?.toUpperCase() : s.label}
                  </span>
                  <span className={cn("max-w-full truncate rounded bg-black/55 px-1 text-[10px] leading-4 sm:text-xs", off ? "text-orange-300" : "text-white")} title={off ? "Fora da posição principal/secundária" : undefined}>
                    {p ? p.nickname : s.label}
                  </span>
                  {p && badgesFor(p.id).length > 0 && <span className="text-[9px] font-bold text-accent-300">{badgesFor(p.id).join(" · ")}</span>}
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {!readOnly && (
            <p className="rounded-lg border border-ink-700 bg-ink-850 p-3 text-xs text-ink-300">
              Toque num jogador e depois numa posição do campo (ou arraste no computador). Toque num titular e em outra posição para trocar.
              {selected && <span className="mt-1 block text-accent-300">Selecionado: {byId.get(selected)?.nickname} — <button type="button" className="underline" onClick={() => toBench(selected)}>mandar para o banco</button> · <button type="button" className="underline" onClick={() => { removeEverywhere(selected); setSelected(null); }}>remover</button></span>}
            </p>
          )}
          <section className="card p-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) toBench(id); }}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="eyebrow">Reservas ({bench.length}/12)</h3>
              {!readOnly && selected && !bench.includes(selected) && <button type="button" onClick={() => toBench(selected)} className="text-xs text-accent-400 underline">+ adicionar selecionado</button>}
            </div>
            {bench.length === 0 ? <p className="text-xs text-ink-400">Nenhum reserva.</p> : (
              <div className="flex flex-col gap-1.5">
                {bench.map((id) => byId.get(id) && (
                  <div key={id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1"><Chip p={byId.get(id)!} selected={selected === id} readOnly={readOnly} onSelect={toggleSel} /></div>
                    {!readOnly && <button type="button" onClick={() => removeEverywhere(id)} className="btn-ghost min-h-0 p-1" aria-label="Remover do banco"><X className="size-3.5" /></button>}
                  </div>
                ))}
              </div>
            )}
          </section>
          {!readOnly && (
            <section className="card p-4">
              <h3 className="eyebrow mb-2">Disponíveis ({pool.length})</h3>
              <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
                {pool.map((p) => <Chip key={p.id} p={p} selected={selected === p.id} readOnly={readOnly} onSelect={toggleSel} />)}
                {pool.length === 0 && <p className="text-xs text-ink-400">Todos escalados.</p>}
              </div>
            </section>
          )}
          <section className="card space-y-2 p-4">
            <h3 className="eyebrow mb-1 flex items-center gap-1"><Shield className="size-3.5" />Capitão e cobradores</h3>
            {TAKERS.map(([k, label]) => (
              <label key={k} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink-300">{label}</span>
                <select disabled={readOnly} value={takers[k]} onChange={(e) => setTakers((t) => ({ ...t, [k]: e.target.value }))} className="input w-40 py-1.5">
                  <option value="">—</option>
                  {starters.map((id) => byId.get(id) && <option key={id} value={id}>{byId.get(id)!.nickname}</option>)}
                </select>
              </label>
            ))}
          </section>
        </div>
      </div>

      <label className="block text-sm"><span className="label">Observações táticas</span>
        <textarea disabled={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={3000} className="input" placeholder="Instruções, comportamento sem bola, bolas paradas…" />
      </label>
      <FormMessage state={state} />
      {!readOnly && <div className="flex justify-end"><SubmitButton>Salvar escalação</SubmitButton></div>}
    </form>
  );
}
