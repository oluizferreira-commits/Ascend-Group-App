/**
 * AP Engine — quality-point (AP) calculations for EA SPORTS FC Clubs builds.
 *
 * Pure and UI-independent. Every number comes from a CostTable — one table per
 * (game version, season, archetype) — and nothing is assumed:
 *  - cost(A→B) = Σ cost(v→v+1) for every increment, read from the table step by step;
 *  - removing levels refunds exactly what those levels cost;
 *  - the level budget comes from the table's verified `levelBudget`, never from a formula;
 *  - height / weight / specialisation modifiers only exist if the table declares them, and they
 *    change the DISPLAYED value, never the purchased levels or their cost;
 *  - a result is "validated" only when the table is verified and has every rule the build needs.
 */
import { ATTR_KEYS, ATTR_LABEL, type AttrKey } from "./game-data";

// ─── Table model ────────────────────────────────────────────────────────────

/** Per attribute: archetype base value, hard cap, and the cost of each +1 from `base` upwards. */
export type AttrCostRule = { base: number; max: number; costs: number[] };
export type ModifierBand = { min: number; max: number; deltas: Partial<Record<AttrKey, number>> };

export type CostTableData = {
  attrs: Partial<Record<AttrKey, AttrCostRule>>;
  /** Total AP available at each level (verified values only). Keys are levels as strings. */
  levelBudget: Record<string, number>;
  modifiers?: {
    heightCm?: ModifierBand[];
    weightKg?: ModifierBand[];
    specializations?: Record<string, Partial<Record<AttrKey, number>>>;
  };
};

export type TableStatus = "draft" | "verified" | "archived";
export type CostTable = {
  id: string; gameVersion: string; season: string; archetype: string; revision: number;
  status: TableStatus; source: string | null; verifiedOn: string | null; data: CostTableData;
};

export type TableIssue = { level: "error" | "warning"; code: string; message: string; attr?: AttrKey };

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** Structural validation of a table (used on import and before verification). */
export function validateTable(data: CostTableData): TableIssue[] {
  const out: TableIssue[] = [];
  const attrs = data?.attrs ?? {};
  for (const [k, r] of Object.entries(attrs) as [string, AttrCostRule][]) {
    if (!ATTR_KEYS.includes(k as AttrKey)) { out.push({ level: "error", code: "unknown_attr", message: `Atributo desconhecido: ${k}` }); continue; }
    const a = k as AttrKey, label = ATTR_LABEL[a];
    if (!r || !isInt(r.base) || !isInt(r.max)) { out.push({ level: "error", code: "bad_range", attr: a, message: `${label}: base e máximo precisam ser números inteiros.` }); continue; }
    if (r.base < 1 || r.max > 99 || r.base > r.max) out.push({ level: "error", code: "bad_range", attr: a, message: `${label}: faixa inválida (${r.base}–${r.max}).` });
    if (!Array.isArray(r.costs) || r.costs.length !== r.max - r.base) {
      out.push({ level: "error", code: "costs_length", attr: a, message: `${label}: são necessários ${Math.max(0, r.max - r.base)} custos (de ${r.base} até ${r.max}), recebidos ${Array.isArray(r.costs) ? r.costs.length : 0}.` });
    } else if (r.costs.some((c) => !isInt(c) || c < 0)) {
      out.push({ level: "error", code: "bad_cost", attr: a, message: `${label}: custos precisam ser inteiros ≥ 0.` });
    } else if (r.costs.some((c, i) => i > 0 && c < r.costs[i - 1])) {
      out.push({ level: "warning", code: "non_progressive", attr: a, message: `${label}: há custos que diminuem ao subir — confira a fonte.` });
    }
  }
  const missing = ATTR_KEYS.filter((k) => !attrs[k]);
  if (missing.length) out.push({ level: "warning", code: "incomplete", message: `${missing.length} atributo(s) sem regra de custo: ${missing.map((k) => ATTR_LABEL[k]).join(", ")}.` });
  const lv = Object.entries(data?.levelBudget ?? {}).map(([l, v]) => [Number(l), v] as const);
  if (!lv.length) out.push({ level: "warning", code: "no_budget", message: "Sem orçamento por nível: o total de pontos não poderá ser validado." });
  for (const [l, v] of lv) if (!isInt(l) || l < 1 || !isInt(v) || v < 0) out.push({ level: "error", code: "bad_budget", message: `Orçamento inválido no nível ${l}.` });
  const sorted = [...lv].sort((a, b) => a[0] - b[0]);
  if (sorted.some(([, v], i) => i > 0 && v < sorted[i - 1][1])) out.push({ level: "warning", code: "budget_decreases", message: "O orçamento diminui em algum nível — confira a fonte." });
  for (const [kind, bands] of [["altura", data?.modifiers?.heightCm], ["peso", data?.modifiers?.weightKg]] as const) {
    for (const b of bands ?? []) {
      if (!isInt(b.min) || !isInt(b.max) || b.min > b.max) out.push({ level: "error", code: "bad_band", message: `Faixa de ${kind} inválida (${b.min}–${b.max}).` });
      for (const [k, d] of Object.entries(b.deltas ?? {})) if (!ATTR_KEYS.includes(k as AttrKey) || !isInt(d)) out.push({ level: "error", code: "bad_modifier", message: `Modificador de ${kind} inválido: ${k}.` });
    }
  }
  return out;
}

// ─── Costs ──────────────────────────────────────────────────────────────────

export class EngineError extends Error {
  constructor(readonly code: "missing_rule" | "out_of_range" | "over_budget" | "below_base" | "no_budget", message: string, readonly attr?: AttrKey) { super(message); }
}

function rule(t: CostTableData, attr: AttrKey): AttrCostRule {
  const r = t.attrs[attr];
  if (!r) throw new EngineError("missing_rule", `A tabela não tem custos para ${ATTR_LABEL[attr]}.`, attr);
  return r;
}

/** Cost of a single increment value → value+1 (from the table, never interpolated). */
export function stepCost(t: CostTableData, attr: AttrKey, value: number): number {
  const r = rule(t, attr);
  if (!isInt(value) || value < r.base || value >= r.max) throw new EngineError("out_of_range", `${ATTR_LABEL[attr]}: não existe incremento a partir de ${value} (faixa ${r.base}–${r.max}).`, attr);
  return r.costs[value - r.base];
}

/**
 * AP to move a purchased value from `from` to `to`: positive = spend, negative = exact refund.
 * Values are purchased values (base + bought levels), without height/weight modifiers.
 */
export function costBetween(t: CostTableData, attr: AttrKey, from: number, to: number): number {
  const r = rule(t, attr);
  for (const v of [from, to]) if (!isInt(v) || v < r.base || v > r.max) throw new EngineError("out_of_range", `${ATTR_LABEL[attr]}: ${v} está fora da faixa ${r.base}–${r.max}.`, attr);
  let sum = 0;
  for (let v = Math.min(from, to); v < Math.max(from, to); v++) sum += stepCost(t, attr, v);
  return to >= from ? sum : -sum;
}

/** Verified AP budget for a level, or null when the table has no value for it (never extrapolated). */
export function levelBudget(t: CostTableData, level: number | null | undefined): number | null {
  if (level == null) return null;
  const v = t.levelBudget?.[String(level)];
  return isInt(v) ? v : null;
}

/** Display modifiers declared by the table for this body / specialisations. */
export function modifiersFor(t: CostTableData, body: { heightCm?: number | null; weightKg?: number | null; specializations?: string[] }) {
  const out: Partial<Record<AttrKey, number>> = {};
  const add = (d: Partial<Record<AttrKey, number>>) => { for (const [k, v] of Object.entries(d) as [AttrKey, number][]) out[k] = (out[k] ?? 0) + v; };
  const band = (bands: ModifierBand[] | undefined, x: number | null | undefined) => {
    if (x == null || !bands) return;
    const b = bands.find((b) => x >= b.min && x <= b.max);
    if (b) add(b.deltas);
  };
  band(t.modifiers?.heightCm, body.heightCm);
  band(t.modifiers?.weightKg, body.weightKg);
  for (const s of body.specializations ?? []) { const d = t.modifiers?.specializations?.[s]; if (d) add(d); }
  return out;
}

// ─── Build evaluation ──────────────────────────────────────────────────────

/** A build in engine terms: purchased levels per attribute above the archetype base. */
export type EngineBuild = { level: number | null; heightCm?: number | null; weightKg?: number | null; specializations?: string[]; purchases: Partial<Record<AttrKey, number>> };

export type AttrLine = { attr: AttrKey; base: number; purchased: number; modifier: number; value: number; displayed: number; max: number; cost: number };
export type Evaluation = {
  lines: AttrLine[]; spent: number; budget: number | null; remaining: number | null;
  issues: TableIssue[];
  /** True only with a verified, error-free table that covers every attribute + a budget for the level, and no violations. */
  validated: boolean;
  reasons: string[];
};

export function evaluateBuild(table: Pick<CostTable, "status" | "data">, b: EngineBuild): Evaluation {
  const t = table.data;
  const issues: TableIssue[] = [];
  const mods = modifiersFor(t, b);
  const lines: AttrLine[] = [];
  let spent = 0;
  for (const attr of ATTR_KEYS) {
    const r = t.attrs[attr];
    const bought = b.purchases[attr] ?? 0;
    if (!r) {
      if (bought) issues.push({ level: "error", code: "missing_rule", attr, message: `${ATTR_LABEL[attr]}: a tabela não tem custos — compra não pode ser calculada.` });
      continue;
    }
    if (!isInt(bought) || bought < 0) { issues.push({ level: "error", code: "below_base", attr, message: `${ATTR_LABEL[attr]}: compras negativas não existem.` }); continue; }
    const value = r.base + bought;
    if (value > r.max) { issues.push({ level: "error", code: "above_max", attr, message: `${ATTR_LABEL[attr]}: ${value} passa do limite do arquétipo (${r.max}).` }); continue; }
    const cost = costBetween(t, attr, r.base, value);
    spent += cost;
    const modifier = mods[attr] ?? 0;
    lines.push({ attr, base: r.base, purchased: bought, modifier, value, displayed: Math.max(1, Math.min(99, value + modifier)), max: r.max, cost });
  }
  const budget = levelBudget(t, b.level);
  const remaining = budget == null ? null : budget - spent;
  if (budget != null && spent > budget) issues.push({ level: "error", code: "over_budget", message: `Orçamento insuficiente: ${spent} AP gastos para ${budget} disponíveis no nível ${b.level}.` });
  const tableIssues = validateTable(t);
  const reasons: string[] = [];
  if (table.status !== "verified") reasons.push("A tabela de custos ainda não foi verificada.");
  if (tableIssues.some((i) => i.level === "error")) reasons.push("A tabela tem erros estruturais.");
  if (tableIssues.some((i) => i.code === "incomplete")) reasons.push("A tabela não cobre todos os atributos.");
  if (budget == null) reasons.push(b.level == null ? "Informe o nível do jogador." : `A tabela não tem o orçamento verificado do nível ${b.level}.`);
  if (issues.some((i) => i.level === "error")) reasons.push("A build viola regras da tabela.");
  return { lines, spent, budget, remaining, issues, validated: reasons.length === 0, reasons };
}

/** Buy (+n) or remove (−n) levels on one attribute, enforcing cap, base and budget. Returns the AP delta. */
export function changeLevels(table: Pick<CostTable, "data">, b: EngineBuild, attr: AttrKey, delta: number): { build: EngineBuild; apDelta: number } {
  const t = table.data;
  const r = rule(t, attr);
  const cur = r.base + (b.purchases[attr] ?? 0);
  const next = cur + delta;
  if (next < r.base) throw new EngineError("below_base", `${ATTR_LABEL[attr]} já está no valor base do arquétipo (${r.base}).`, attr);
  if (next > r.max) throw new EngineError("out_of_range", `${ATTR_LABEL[attr]} está no limite do arquétipo (${r.max}).`, attr);
  const apDelta = costBetween(t, attr, cur, next);
  const budget = levelBudget(t, b.level);
  if (apDelta > 0 && budget != null) {
    const spent = evaluateBuild({ status: "draft", data: t }, b).spent;
    if (spent + apDelta > budget) throw new EngineError("over_budget", `Pontos insuficientes: faltam ${spent + apDelta - budget} AP.`, attr);
  }
  return { build: { ...b, purchases: { ...b.purchases, [attr]: next - r.base } }, apDelta };
}

/** Moving to another level keeps purchases; reports whether they still fit the new level's budget. */
export function changeLevel(table: Pick<CostTable, "status" | "data">, b: EngineBuild, level: number) {
  const nb = { ...b, level };
  return { build: nb, evaluation: evaluateBuild(table, nb) };
}

// ─── Optimizer ──────────────────────────────────────────────────────────────

export type OptimizeInput = {
  table: Pick<CostTable, "status" | "data">;
  level: number;
  /** Importance per attribute (e.g. generator scores). Attributes with weight ≤ 0 are not bought. */
  weights: Partial<Record<AttrKey, number>>;
  /** Optional minimum purchased value per attribute (hard constraints). */
  minimums?: Partial<Record<AttrKey, number>>;
  body?: Omit<EngineBuild, "purchases" | "level">;
};
export type OptimizeResult =
  | { ok: true; build: EngineBuild; evaluation: Evaluation; utility: number; method: string }
  | { ok: false; reason: string };

/**
 * Exact optimizer (multiple-choice knapsack by dynamic programming):
 * maximise Σ weight(attr) × levels bought(attr) subject to Σ cost ≤ level budget, caps and minimums.
 * Because costs are progressive, the same weight buys fewer levels as an attribute gets expensive,
 * so the distribution follows the real cost curve — no fixed percentages.
 */
export function optimize(input: OptimizeInput): OptimizeResult {
  const t = input.table.data;
  const budget = levelBudget(t, input.level);
  if (budget == null) return { ok: false, reason: `Sem orçamento verificado para o nível ${input.level} nesta tabela.` };
  const attrs = ATTR_KEYS.filter((k) => t.attrs[k] && ((input.weights[k] ?? 0) > 0 || (input.minimums?.[k] ?? 0) > 0));
  // options[a] = list of (levels, cost) — cumulative cost for buying `levels`.
  type Opt = { levels: number; cost: number };
  const options = attrs.map((a) => {
    const r = t.attrs[a]!;
    const minLv = Math.max(0, (input.minimums?.[a] ?? r.base) - r.base);
    if (minLv > r.max - r.base) return null;
    const list: Opt[] = [];
    let c = 0;
    for (let k = 0; k <= r.max - r.base; k++) {
      if (k > 0) c += r.costs[k - 1];
      if (k >= minLv) list.push({ levels: k, cost: c });
      if (c > budget) break;
    }
    return list;
  });
  const bad = options.findIndex((o) => o == null || o.length === 0);
  if (bad >= 0) return { ok: false, reason: `Impossível cumprir o mínimo pedido para ${ATTR_LABEL[attrs[bad]]} dentro dos limites e do orçamento.` };
  const NEG = -Infinity;
  let dp = new Array<number>(budget + 1).fill(NEG); dp[0] = 0;
  const choice: Int32Array[] = [];
  options.forEach((opts, i) => {
    const w = Math.max(0, input.weights[attrs[i]] ?? 0);
    const next = new Array<number>(budget + 1).fill(NEG);
    const pick = new Int32Array(budget + 1).fill(-1);
    for (let s = 0; s <= budget; s++) {
      if (dp[s] === NEG) continue;
      opts!.forEach((o, j) => {
        const ns = s + o.cost;
        if (ns > budget) return;
        const v = dp[s] + w * o.levels;
        if (v > next[ns] + 1e-9 || (Math.abs(v - next[ns]) < 1e-9 && pick[ns] === -1)) { next[ns] = v; pick[ns] = j; }
      });
    }
    dp = next; choice.push(pick);
  });
  let best = -1;
  for (let s = 0; s <= budget; s++) if (dp[s] !== NEG && (best < 0 || dp[s] > dp[best] + 1e-9 || (Math.abs(dp[s] - dp[best]) < 1e-9 && s < best))) best = s;
  if (best < 0) return { ok: false, reason: "Os mínimos pedidos não cabem no orçamento deste nível." };
  // Reconstruct
  const purchases: Partial<Record<AttrKey, number>> = {};
  let s = best;
  for (let i = options.length - 1; i >= 0; i--) {
    const j = choice[i][s];
    const o = options[i]![j];
    if (o.levels) purchases[attrs[i]] = o.levels;
    s -= o.cost;
  }
  const build: EngineBuild = { level: input.level, ...input.body, purchases };
  return { ok: true, build, evaluation: evaluateBuild(input.table, build), utility: dp[best], method: "Programação dinâmica exata sobre a tabela de custos (maximiza a soma ponderada de níveis comprados)." };
}

/** Empty template for imports: every attribute with the right shape, values to be filled from the source. */
export function tableTemplate(): CostTableData {
  return {
    attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, { base: 0, max: 0, costs: [] }])) as CostTableData["attrs"],
    levelBudget: {},
    modifiers: { heightCm: [], weightKg: [], specializations: {} },
  };
}
