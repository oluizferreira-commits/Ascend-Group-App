"use client";
import { useActionState, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { POSITIONS, POSITION_LABELS, type Position } from "@/lib/domain";
import type { SheetRow } from "@/lib/validation/match";
import type { ActionResult } from "@/server/errors";
import { cn } from "@/lib/cn";

type PlayerOpt = { id: string; nickname: string; primaryPosition: Position; shirtNumber: number | null };

const NUM_FIELDS: { key: keyof SheetRow; label: string; max: number; step?: number }[] = [
  { key: "minutesPlayed", label: "Minutos", max: 130 },
  { key: "shots", label: "Finalizações", max: 200 },
  { key: "shotsOnTarget", label: "No alvo", max: 200 },
  { key: "passesAttempted", label: "Passes tentados", max: 400 },
  { key: "passesCompleted", label: "Passes certos", max: 400 },
  { key: "tackles", label: "Desarmes", max: 200 },
  { key: "interceptions", label: "Interceptações", max: 200 },
  { key: "clearances", label: "Cortes", max: 200 },
  { key: "saves", label: "Defesas", max: 200 },
  { key: "goalsConceded", label: "Gols sofridos", max: 50 },
  { key: "yellowCards", label: "Amarelos", max: 2 },
  { key: "redCards", label: "Vermelhos", max: 1 },
  { key: "externalRating", label: "Nota EA (0–10)", max: 10, step: 0.1 },
];

const TRI = [
  { key: "cleanSheet" as const, label: "Sem sofrer gols" },
  { key: "isMotm" as const, label: "Melhor em campo" },
];

export function emptyRow(p: PlayerOpt): SheetRow {
  return {
    playerId: p.id, role: "starter", position: p.primaryPosition, isCaptain: false, minutesPlayed: null, goals: 0, assists: 0,
    shots: null, shotsOnTarget: null, passesAttempted: null, passesCompleted: null, tackles: null, interceptions: null,
    clearances: null, saves: null, goalsConceded: null, cleanSheet: null, yellowCards: null, redCards: null, externalRating: null, isMotm: null,
  };
}

export function SheetEditor({
  action, players, initial, goalsFor, canEdit,
}: {
  action: (prev: ActionResult | null, f: FormData) => Promise<ActionResult>;
  players: PlayerOpt[];
  initial: SheetRow[];
  goalsFor: number | null;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<SheetRow[]>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [state, formAction] = useActionState(action, null);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const available = players.filter((p) => !rows.some((r) => r.playerId === p.id));
  const goals = rows.reduce((a, r) => a + r.goals, 0);
  const assists = rows.reduce((a, r) => a + r.assists, 0);

  const update = (id: string, patch: Partial<SheetRow>) =>
    setRows((rs) => rs.map((r) => (r.playerId === id ? { ...r, ...patch } : patch.isCaptain ? { ...r, isCaptain: false } : r)));
  const num = (v: string, step?: number) => (v === "" ? null : step ? Number(v) : Math.trunc(Number(v)));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sheet" value={JSON.stringify(rows)} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink-400">Participantes: <b className="text-ink-100">{rows.length}</b></span>
        <span className={cn("text-ink-400", goalsFor != null && goals > goalsFor && "text-red-300")}>
          Gols atribuídos: <b>{goals}</b>{goalsFor != null && ` / ${goalsFor}`}
        </span>
        <span className="text-ink-400">Assistências: <b className="text-ink-100">{assists}</b></span>
        {goalsFor != null && goals < goalsFor && <span className="text-xs text-ink-400">(gols não atribuídos contam como gol contra/sem autor)</span>}
      </div>

      {rows.length === 0 && <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-sm text-ink-400">Nenhum jogador na súmula.</p>}

      <ul className="space-y-2">
        {rows.map((r) => {
          const p = byId.get(r.playerId);
          const expanded = open === r.playerId;
          return (
            <li key={r.playerId} className="rounded-lg border border-ink-700 bg-ink-850/60">
              <div className="grid grid-cols-2 items-end gap-2 p-3 sm:grid-cols-[minmax(140px,1fr)_120px_90px_70px_70px_auto_auto]">
                <div className="col-span-2 sm:col-span-1">
                  <p className="font-medium">{p?.shirtNumber != null && <span className="mr-1 text-gold-400">#{p.shirtNumber}</span>}{p?.nickname ?? "Jogador removido"}</p>
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                    <input type="checkbox" disabled={!canEdit} checked={r.isCaptain} onChange={(e) => update(r.playerId, { isCaptain: e.target.checked })} /> Capitão
                  </label>
                </div>
                <label className="text-xs text-ink-400">Função
                  <select disabled={!canEdit} value={r.role} onChange={(e) => update(r.playerId, { role: e.target.value as SheetRow["role"], ...(e.target.value === "unused" ? { goals: 0, assists: 0 } : {}) })} className="input mt-1 py-1.5">
                    <option value="starter">Titular</option><option value="substitute">Reserva (entrou)</option><option value="unused">Não utilizado</option>
                  </select>
                </label>
                <label className="text-xs text-ink-400">Posição
                  <select disabled={!canEdit} value={r.position ?? ""} onChange={(e) => update(r.playerId, { position: (e.target.value || null) as Position | null })} className="input mt-1 py-1.5">
                    <option value="">—</option>
                    {POSITIONS.map((x) => <option key={x} value={x}>{POSITION_LABELS[x]}</option>)}
                  </select>
                </label>
                <label className="text-xs text-ink-400">Gols
                  <input disabled={!canEdit || r.role === "unused"} type="number" min={0} max={30} value={r.goals} onChange={(e) => update(r.playerId, { goals: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} className="input mt-1 py-1.5" />
                </label>
                <label className="text-xs text-ink-400">Assist.
                  <input disabled={!canEdit || r.role === "unused"} type="number" min={0} max={30} value={r.assists} onChange={(e) => update(r.playerId, { assists: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} className="input mt-1 py-1.5" />
                </label>
                <button type="button" onClick={() => setOpen(expanded ? null : r.playerId)} className="btn-ghost px-2 text-xs" aria-expanded={expanded}>
                  Detalhes <ChevronDown className={cn("size-4 transition", expanded && "rotate-180")} />
                </button>
                {canEdit && (
                  <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.playerId !== r.playerId))} className="btn-ghost px-2 text-red-300" aria-label={`Remover ${p?.nickname}`}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {expanded && (
                <div className="grid grid-cols-2 gap-2 border-t border-ink-700 p-3 sm:grid-cols-4 lg:grid-cols-7">
                  {NUM_FIELDS.map((f) => (
                    <label key={f.key} className="text-xs text-ink-400">{f.label}
                      <input disabled={!canEdit || r.role === "unused"} type="number" min={0} max={f.max} step={f.step ?? 1} placeholder="—"
                        value={(r[f.key] as number | null) ?? ""} onChange={(e) => update(r.playerId, { [f.key]: num(e.target.value, f.step) } as Partial<SheetRow>)}
                        className="input mt-1 py-1.5" />
                    </label>
                  ))}
                  {TRI.map((t) => (
                    <label key={t.key} className="text-xs text-ink-400">{t.label}
                      <select disabled={!canEdit || r.role === "unused"} value={r[t.key] == null ? "" : r[t.key] ? "1" : "0"}
                        onChange={(e) => update(r.playerId, { [t.key]: e.target.value === "" ? null : e.target.value === "1" } as Partial<SheetRow>)} className="input mt-1 py-1.5">
                        <option value="">Não registrado</option><option value="1">Sim</option><option value="0">Não</option>
                      </select>
                    </label>
                  ))}
                  <p className="col-span-full text-xs text-ink-400">Deixe vazio o que não foi registrado — campos vazios não entram nas médias nem na avaliação.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select id="add-player" className="input w-56" defaultValue="" onChange={(e) => {
              const p = byId.get(e.target.value);
              if (p) setRows((rs) => [...rs, emptyRow(p)]);
              e.target.value = "";
            }} aria-label="Adicionar jogador">
              <option value="" disabled>{available.length ? "+ Adicionar jogador" : "Todos adicionados"}</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.nickname} ({POSITION_LABELS[p.primaryPosition]})</option>)}
            </select>
            {available.length > 0 && (
              <button type="button" className="btn-ghost text-xs" onClick={() => setRows((rs) => [...rs, ...available.map(emptyRow)])}><Plus className="size-4" />Todos</button>
            )}
          </div>
          <SubmitButton>Salvar súmula</SubmitButton>
        </div>
      )}
      <FormMessage state={state} />
    </form>
  );
}
