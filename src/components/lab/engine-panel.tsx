"use client";
/** Build editor — calculated mode (AP engine). Every number comes from the selected cost table. */
import { AlertTriangle, BadgeCheck, Minus, Plus, Wand2 } from "lucide-react";
import { changeLevels, EngineError, type CostTable, type EngineBuild, type Evaluation } from "@/lib/lab/ap-engine";
import { ATTRIBUTES, type AttrCategory, type AttrKey } from "@/lib/lab/game-data";
import { cn } from "@/lib/cn";

export function EngineAttrList({ table, build, cat, onChange, onError, tierLabel, disabled }: {
  table: Pick<CostTable, "status" | "data">; build: EngineBuild; cat: AttrCategory;
  onChange: (b: EngineBuild) => void; onError: (msg: string | null) => void;
  tierLabel: (k: AttrKey) => React.ReactNode; disabled?: boolean;
}) {
  const step = (attr: AttrKey, d: number) => {
    try { onChange(changeLevels(table, build, attr, d).build); onError(null); }
    catch (e) { onError(e instanceof EngineError ? e.message : "Não foi possível calcular."); }
  };
  return (
    <ul className="divide-y divide-[var(--line)]">
      {ATTRIBUTES.filter((a) => a.cat === cat).map((a) => {
        const r = table.data.attrs[a.key];
        if (!r) return (
          <li key={a.key} className="flex items-center justify-between py-2.5 text-sm"><span>{a.label}</span><span className="text-xs text-amber-500">Sem custo na tabela — não calculável</span></li>
        );
        const bought = build.purchases[a.key] ?? 0;
        const value = r.base + bought;
        let spent = 0;
        for (let i = 0; i < bought; i++) spent += r.costs[i];
        const next = value < r.max ? r.costs[bought] : null;
        return (
          <li key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink-100">{a.label}</span>
              <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-400 tabular-nums">
                <span>base {r.base}</span><span>· máx. {r.max}</span>{tierLabel(a.key)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <button type="button" disabled={disabled || bought === 0} aria-label={`Remover nível de ${a.label}`} onClick={() => step(a.key, -1)} className="btn-secondary min-h-9 w-9 px-0"><Minus className="size-4" /></button>
              <span className="w-10 text-center font-display text-xl font-bold tabular-nums" aria-label={`${a.label}: ${value}`}>{value}</span>
              <button type="button" disabled={disabled || value >= r.max} aria-label={`Comprar nível de ${a.label}`} onClick={() => step(a.key, 1)} className="btn-secondary min-h-9 w-9 px-0"><Plus className="size-4" /></button>
            </span>
            <span className="col-span-2 flex flex-wrap justify-end gap-x-3 text-[11px] text-ink-400 tabular-nums">
              <span>comprados <b className="text-ink-200">+{bought}</b></span>
              <span>gasto <b className="text-ink-200">{spent} AP</b></span>
              <span>próximo <b className="text-ink-200">{next == null ? "—" : `${next} AP`}</b></span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function EngineBudget({ table, evaluation, level, onOptimize, optimizeNote, disabled }: {
  table: Pick<CostTable, "status" | "source" | "verifiedOn" | "revision" | "archetype" | "season" | "gameVersion">; evaluation: Evaluation; level: number | null;
  onOptimize: () => void; optimizeNote: string | null; disabled?: boolean;
}) {
  const ev = evaluation;
  const mods = ev.lines.filter((l) => l.modifier !== 0);
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-400">Tabela: <b className="text-ink-200">{table.archetype}</b> · {table.season} · {table.gameVersion} · rev. {table.revision}{table.status === "verified" ? ` · verificada em ${table.verifiedOn?.split("-").reverse().join("/")} (${table.source})` : " · rascunho (não validado)"}</p>
      <dl className="grid grid-cols-3 gap-2">
        <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Nível {level ?? "—"}</dt><dd className="font-display text-xl font-bold tabular-nums">{ev.budget ?? "—"}<span className="ml-1 text-xs font-normal text-ink-400">AP</span></dd></div>
        <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Gastos</dt><dd className="font-display text-xl font-bold tabular-nums">{ev.spent}</dd></div>
        <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Restantes</dt><dd className={cn("font-display text-xl font-bold tabular-nums", ev.remaining != null && ev.remaining < 0 ? "text-loss" : "text-win")}>{ev.remaining ?? "—"}</dd></div>
      </dl>
      {ev.validated ? (
        <p className="flex items-center gap-2 rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win"><BadgeCheck className="size-4" />Build validada pela tabela verificada.</p>
      ) : (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-ink-200">
          <p className="mb-1 flex items-center gap-1 font-semibold text-amber-500"><AlertTriangle className="size-3.5" />Não validada matematicamente</p>
          <ul className="space-y-0.5">{ev.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
        </div>
      )}
      {ev.issues.filter((i) => i.level === "error").map((i) => <p key={i.code + (i.attr ?? "")} className="text-xs text-loss">{i.message}</p>)}
      {mods.length > 0 && (
        <p className="text-xs text-ink-400">Modificadores (altura/peso/especializações) no valor exibido: {mods.map((l) => `${ATTRIBUTES.find((a) => a.key === l.attr)!.label} ${l.modifier > 0 ? "+" : ""}${l.modifier} → ${l.displayed}`).join(" · ")}. Não alteram custo nem níveis comprados.</p>
      )}
      <button type="button" disabled={disabled} onClick={onOptimize} className="btn-primary w-full sm:w-auto"><Wand2 className="size-4" />Distribuir pontos automaticamente</button>
      {optimizeNote && <p className="text-xs text-ink-300">{optimizeNote}</p>}
    </div>
  );
}
