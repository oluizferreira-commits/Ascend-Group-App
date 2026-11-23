"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Minus, Plus, Sparkles, Wand2 } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionResult } from "@/server/errors";
import { POSITIONS, POSITION_NAMES, positionGroup, type Position } from "@/lib/domain";
import {
  ARCHETYPES_VERIFIED, ATTRIBUTES, ATTR_CATEGORIES, ATTR_MAX, ATTR_MIN, COSTS_STATUS, GAME_VERSION, PLAYSTYLES, PLAYSTYLE_CATEGORIES,
  PLAYSTYLES_VERIFIED, TACTICAL_ROLES, type AttrCategory, type AttrKey,
} from "@/lib/lab/game-data";
import { budget, generatePlan, type GeneratedPlan } from "@/lib/lab/builder";
import { TOPICS, TOPIC_KEYS, isTopic } from "@/lib/lab/trainer";
import { cn } from "@/lib/cn";

type Attrs = Partial<Record<AttrKey, { initial: number | null; planned: number | null }>>;
export type BuildInitial = {
  name: string; archetype: string | null; level: number | null; position: string | null; role: string | null;
  heightCm: number | null; weightKg: number | null; pointsAvailable: number | null; specializations: string | null; notes: string | null;
  brief: string | null; focusTopic: string | null; isPrimary: boolean; attributes: Attrs; playstyles: { key: string; plus: boolean }[];
};

const TIER_STYLE = {
  max: "border-accent-500/60 bg-accent-500/15 text-accent-300",
  high: "border-[#8fa9ff]/30 bg-[#8fa9ff]/10 text-ink-200",
  mid: "hairline bg-transparent text-ink-400",
  low: "",
} as const;
const TIER_LABEL = { max: "Máxima", high: "Alta", mid: "Compl.", low: "" } as const;

const clamp = (v: number) => Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round(v)));
const num = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : null);

export function BuildEditor({ initial, action, readOnly, defaultPosition, archetypeIdHint, autoGenerate }: {
  initial: BuildInitial; action?: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>; readOnly?: boolean;
  defaultPosition: Position; archetypeIdHint: number | null; autoGenerate?: boolean;
}) {
  const [state, formAction] = useActionState(action ?? (async () => ({ ok: false, error: "Somente leitura." }) as ActionResult), null);
  const [b, setB] = useState(initial);
  const [cat, setCat] = useState<AttrCategory>("pace");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const position = (POSITIONS as readonly string[]).includes(b.position ?? "") ? (b.position as Position) : defaultPosition;
  const group = positionGroup(position);
  const [focusTopic, focusVariant] = (b.focusTopic ?? "").split(":");

  const runGenerator = () => setPlan(generatePlan({
    group, brief: b.brief ?? "", positionLabel: POSITION_NAMES[position],
    focus: isTopic(focusTopic) ? { topic: focusTopic, variant: focusVariant || null } : null,
  }));
  // Opening from the Trainer ("Melhorar minha build") shows the recommended priorities immediately.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (autoGenerate) runGenerator(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tierOf = useMemo(() => new Map(plan?.ranked.map((r) => [r.key, r]) ?? []), [plan]);
  const set = <K extends keyof BuildInitial>(k: K, v: BuildInitial[K]) => setB((x) => ({ ...x, [k]: v }));
  const setAttr = (k: AttrKey, field: "initial" | "planned", v: number | null) =>
    setB((x) => ({ ...x, attributes: { ...x.attributes, [k]: { initial: x.attributes[k]?.initial ?? null, planned: x.attributes[k]?.planned ?? null, [field]: v == null ? null : clamp(v) } } }));
  const togglePs = (key: string) => setB((x) => ({ ...x, playstyles: x.playstyles.some((p) => p.key === key) ? x.playstyles.filter((p) => p.key !== key) : [...x.playstyles, { key, plus: false }] }));
  const togglePlus = (key: string) => setB((x) => ({ ...x, playstyles: x.playstyles.map((p) => (p.key === key ? { ...p, plus: !p.plus } : p)) }));

  const cats = (Object.keys(ATTR_CATEGORIES) as AttrCategory[]).filter((c) => c !== "goalkeeping" || group === "GK");
  const totals = useMemo(() => {
    let up = 0, count = 0;
    for (const v of Object.values(b.attributes)) if (v?.initial != null && v.planned != null && v.planned > v.initial) { up += v.planned - v.initial; count++; }
    return { up, count, budget: budget({ name: b.name, archetype: b.archetype, attributes: b.attributes, playstyles: b.playstyles, pointsAvailable: b.pointsAvailable }) };
  }, [b]);
  const dis = !!readOnly;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="attributes" value={JSON.stringify(b.attributes)} />
      <input type="hidden" name="playstyles" value={JSON.stringify(b.playstyles)} />
      <input type="hidden" name="focusTopic" value={b.focusTopic ?? ""} />
      <input type="hidden" name="position" value={position} />

      <fieldset disabled={dis} className="card min-w-0 space-y-3 p-4 sm:p-5">
        <legend className="sr-only">Configuração</legend>
        <h2 className="font-display text-[17px] font-bold tracking-[0.08em] text-ink-100 uppercase">Configuração · {GAME_VERSION}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="col-span-2"><span className="label">Nome da build *</span><input name="name" required maxLength={60} value={b.name} onChange={(e) => set("name", e.target.value)} className="input" placeholder="Ex.: Segundo atacante criativo" /></label>
          <label className="col-span-2"><span className="label">Arquétipo</span><input name="archetype" maxLength={60} value={b.archetype ?? ""} onChange={(e) => set("archetype", e.target.value)} className="input" placeholder="Como aparece no jogo" />
            <span className="mt-1 block text-[11px] text-ink-400">{archetypeIdHint != null ? `A EA registrou o arquétipo nº ${archetypeIdHint} nas suas últimas partidas. ` : ""}{ARCHETYPES_VERIFIED.note}</span></label>
          <label><span className="label">Posição</span>
            <select value={position} onChange={(e) => set("position", e.target.value)} className="input">{POSITIONS.map((p) => <option key={p} value={p}>{POSITION_NAMES[p]}</option>)}</select></label>
          <label><span className="label">Função tática</span><input name="role" list="lab-roles" maxLength={60} value={b.role ?? ""} onChange={(e) => set("role", e.target.value)} className="input" /></label>
          <datalist id="lab-roles">{TACTICAL_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
          <label><span className="label">Nível</span><input name="level" type="number" inputMode="numeric" min={1} max={200} value={b.level ?? ""} onChange={(e) => set("level", num(e.target.value))} className="input" /></label>
          <label><span className="label">Pontos disponíveis</span><input name="pointsAvailable" type="number" inputMode="numeric" min={0} max={5000} value={b.pointsAvailable ?? ""} onChange={(e) => set("pointsAvailable", num(e.target.value))} className="input" /></label>
          <label><span className="label">Altura (cm)</span><input name="heightCm" type="number" inputMode="numeric" min={150} max={210} value={b.heightCm ?? ""} onChange={(e) => set("heightCm", num(e.target.value))} className="input" /></label>
          <label><span className="label">Peso (kg)</span><input name="weightKg" type="number" inputMode="numeric" min={45} max={120} value={b.weightKg ?? ""} onChange={(e) => set("weightKg", num(e.target.value))} className="input" /></label>
          <label className="col-span-2"><span className="label">Especializações</span><input name="specializations" maxLength={200} value={b.specializations ?? ""} onChange={(e) => set("specializations", e.target.value)} className="input" placeholder="Como aparecem no jogo" /></label>
        </div>
      </fieldset>

      <section className="card-premium min-w-0 p-4 sm:p-5">
        <h2 className="relative flex items-center gap-2 font-display text-[17px] font-bold tracking-[0.08em] text-white uppercase"><Wand2 className="size-4 text-[#8fa9ff]" />Gerador automático</h2>
        <p className="relative mt-1 text-sm text-ink-300">Descreva seu estilo. O gerador lê seu objetivo, considera a posição e o plano do Treinador e explica cada prioridade.</p>
        <fieldset disabled={dis} className="relative mt-3 min-w-0 space-y-3">
          <textarea name="brief" rows={3} maxLength={600} value={b.brief ?? ""} onChange={(e) => set("brief", e.target.value)} className="input"
            placeholder="Ex.: Sou segundo atacante. Quero atrair a marcação pelo meio e usar passes em profundidade para os pontas infiltrarem." />
          <div className="flex flex-wrap gap-2">
            <select value={b.focusTopic ?? ""} onChange={(e) => set("focusTopic", e.target.value || null)} className="input w-full min-w-0 sm:w-auto sm:flex-1" aria-label="Foco do Treinador">
              <option value="">Sem foco do Treinador</option>
              {TOPIC_KEYS.flatMap((k) => Object.entries(TOPICS[k].variants).map(([vk, v]) => <option key={`${k}:${vk}`} value={`${k}:${vk}`}>{TOPICS[k].short} — {v.label}</option>))}
            </select>
            <button type="button" onClick={runGenerator} className="btn-primary w-full sm:w-auto"><Sparkles className="size-4" />Gerar prioridades</button>
          </div>
        </fieldset>
        {plan && (
          <div className="relative mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
            {plan.parsed.intents.length > 0 && <p className="text-xs text-ink-300">Entendi: {plan.parsed.roleHint ? <b className="text-white">{plan.parsed.roleHint.label}</b> : null}{plan.parsed.roleHint ? " · " : ""}{plan.parsed.intents.map((i) => i.label).join(" · ")}</p>}
            {(["max", "high", "mid"] as const).filter((tier) => plan.ranked.some((r) => r.tier === tier)).map((tier) => (
              <div key={tier}>
                <p className="kicker mb-1.5 text-[#8fa9ff]">{tier === "max" ? "Prioridade máxima" : tier === "high" ? "Prioridade alta" : "Complementares"}</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {plan.ranked.filter((r) => r.tier === tier).map((r) => (
                    <li key={r.key}>
                      <details className="group rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white">{r.label}<ChevronDown className="size-4 text-ink-400 transition group-open:rotate-180" /></summary>
                        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-300">{r.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {plan.playstyles.length > 0 && (
              <div>
                <p className="kicker mb-1.5 text-[#8fa9ff]">Estilos de jogo sugeridos</p>
                <ul className="flex flex-wrap gap-1.5">{plan.playstyles.map((p) => <li key={p.key} title={`Motivo: ${p.reason}`} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white">{p.label}</li>)}</ul>
                <p className="mt-1 text-[11px] text-ink-400">Marcados com borda tracejada na seção Estilos de jogo.</p>
              </div>
            )}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="mb-1 flex items-center gap-1 font-semibold"><AlertTriangle className="size-3.5" />Possíveis desvantagens</p>
              <ul className="space-y-0.5">{plan.drawbacks.map((d) => <li key={d}>• {d}</li>)}</ul>
            </div>
            <ul className="space-y-0.5 text-[11px] text-ink-400">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-[17px] font-bold tracking-[0.08em] text-ink-100 uppercase">Atributos</h2>
          <p className="text-xs text-ink-400">Inicial = valor atual no jogo · Planejado = onde você quer chegar</p>
        </div>
        <div data-no-swipe className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {cats.map((c) => {
            const hot = plan?.ranked.filter((r) => ATTRIBUTES.find((a) => a.key === r.key)?.cat === c && r.tier === "max").length ?? 0;
            return (
              <button key={c} type="button" role="tab" aria-selected={c === cat} onClick={() => setCat(c)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", c === cat ? "border-accent-500 bg-accent-500/15 text-ink-100" : "hairline text-ink-300")}>
                {ATTR_CATEGORIES[c]}{hot > 0 && <span className="ml-1.5 rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">{hot}</span>}
              </button>
            );
          })}
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {ATTRIBUTES.filter((a) => a.cat === cat).map((a) => {
            const v = b.attributes[a.key] ?? { initial: null, planned: null };
            const t = tierOf.get(a.key);
            const delta = v.initial != null && v.planned != null ? v.planned - v.initial : null;
            return (
              <li key={a.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-2.5 sm:grid-cols-[1fr_auto_auto]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-100">{a.label}</span>
                  {t && t.tier !== "low" && <span className={cn("mt-0.5 inline-block rounded border px-1.5 text-[10px] font-semibold", TIER_STYLE[t.tier])}>Prioridade {TIER_LABEL[t.tier]}</span>}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-ink-400">Inicial
                  <input type="number" inputMode="numeric" min={ATTR_MIN} max={ATTR_MAX} disabled={dis} value={v.initial ?? ""} aria-label={`${a.label} inicial`}
                    onChange={(e) => setAttr(a.key, "initial", num(e.target.value))} className="input w-16 px-2 py-1.5 text-center tabular-nums" />
                </label>
                <div className="col-span-2 flex items-center justify-end gap-1.5 sm:col-span-1">
                  <span className="text-xs text-ink-400">Planejado</span>
                  <button type="button" disabled={dis} aria-label={`Diminuir ${a.label}`} onClick={() => setAttr(a.key, "planned", (v.planned ?? v.initial ?? 50) - 1)} className="btn-secondary min-h-9 w-9 px-0"><Minus className="size-4" /></button>
                  <input type="number" inputMode="numeric" min={ATTR_MIN} max={ATTR_MAX} disabled={dis} value={v.planned ?? ""} aria-label={`${a.label} planejado`}
                    onChange={(e) => setAttr(a.key, "planned", num(e.target.value))} className="input w-16 px-2 py-1.5 text-center font-semibold tabular-nums" />
                  <button type="button" disabled={dis} aria-label={`Aumentar ${a.label}`} onClick={() => setAttr(a.key, "planned", (v.planned ?? v.initial ?? 50) + 1)} className="btn-secondary min-h-9 w-9 px-0"><Plus className="size-4" /></button>
                  <span className={cn("w-10 text-right font-display text-sm font-bold tabular-nums", delta == null ? "text-ink-600" : delta > 0 ? "text-win" : delta < 0 ? "text-amber-500" : "text-ink-400")}>{delta == null ? "—" : delta > 0 ? `+${delta}` : delta}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="mb-2 font-display text-[17px] font-bold tracking-[0.08em] text-ink-100 uppercase">Orçamento</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Disponíveis</dt><dd className="font-display text-xl font-bold">{b.pointsAvailable ?? "—"}</dd></div>
          <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Utilizados</dt><dd className="font-display text-xl font-bold">{totals.budget.used ?? "—"}</dd></div>
          <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Restantes</dt><dd className="font-display text-xl font-bold">{totals.budget.remaining ?? "—"}</dd></div>
          <div className="tile px-3 py-2"><dt className="kicker text-[10px]">Aumento planejado</dt><dd className="font-display text-xl font-bold text-win">+{totals.up}<span className="ml-1 text-xs font-normal text-ink-400">em {totals.count} atrib.</span></dd></div>
        </dl>
        {!COSTS_STATUS.verified && (
          <p className="mt-3 flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-ink-200">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" /><span><b className="text-amber-500">Orçamento não validado.</b> {COSTS_STATUS.note} “Aumento planejado” é a soma das diferenças de atributo — não é o custo em pontos.</span>
          </p>
        )}
      </section>

      <fieldset disabled={dis} className="card min-w-0 p-4 sm:p-5">
        <legend className="sr-only">Estilos de jogo</legend>
        <h2 className="font-display text-[17px] font-bold tracking-[0.08em] text-ink-100 uppercase">Estilos de jogo</h2>
        <p className="mb-3 text-xs text-ink-400">Toque para escolher; toque em “+” para marcar como estilo de jogo Plus. {PLAYSTYLES_VERIFIED.note}</p>
        {(Object.keys(PLAYSTYLE_CATEGORIES) as (keyof typeof PLAYSTYLE_CATEGORIES)[]).filter((c) => c !== "goalkeeping" || group === "GK").map((c) => (
          <div key={c} className="mb-3">
            <p className="kicker mb-1.5">{PLAYSTYLE_CATEGORIES[c]}</p>
            <div className="flex flex-wrap gap-1.5">
              {PLAYSTYLES.filter((p) => p.cat === c).map((p) => {
                const sel = b.playstyles.find((x) => x.key === p.key);
                const rec = plan?.playstyles.some((x) => x.key === p.key);
                return (
                  <span key={p.key} className={cn("inline-flex items-center overflow-hidden rounded-full border text-sm", sel ? "border-accent-500 bg-accent-500/15" : rec ? "border-[#8fa9ff]/50 border-dashed" : "hairline")}>
                    <button type="button" onClick={() => togglePs(p.key)} aria-pressed={!!sel} className={cn("px-3 py-1.5", sel ? "text-ink-100" : "text-ink-300")} title={p.en}>{p.label}</button>
                    {sel && <button type="button" onClick={() => togglePlus(p.key)} aria-pressed={sel.plus} aria-label={`${p.label} Plus`} className={cn("border-l px-2 py-1.5 font-display font-bold hairline", sel.plus ? "bg-accent-500 text-white" : "text-ink-400")}>+</button>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset disabled={dis} className="card min-w-0 space-y-3 p-4 sm:p-5">
        <legend className="sr-only">Notas</legend>
        <label className="block"><span className="label">Notas</span><textarea name="notes" rows={2} maxLength={1000} value={b.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="input" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" checked={b.isPrimary} onChange={(e) => set("isPrimary", e.target.checked)} className="size-4 accent-[#1c3fb0]" />Usar como build principal</label>
      </fieldset>

      {!readOnly && (
        <div className="sticky bottom-24 z-10 flex items-center gap-3 lg:bottom-4">
          <SubmitButton className="shadow-lg">Salvar build</SubmitButton>
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}
