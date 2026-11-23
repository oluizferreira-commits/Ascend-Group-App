/**
 * Build Builder + Optimizer + Comparator (pure, deterministic).
 *
 * The generator reads a free-text brief in Portuguese with transparent keyword rules (no paid AI),
 * combines it with the position and an optional training focus, and ranks attributes into tiers.
 * Without a verified cost table it NEVER outputs exact point distributions — only an ordered
 * investment plan with the reason for every attribute.
 */
import type { PositionGroup } from "@/lib/domain";
import { ATTRIBUTES, ATTR_CATEGORIES, ATTR_LABEL, PLAYSTYLE_BY_KEY, buildCost, type AttrCategory, type AttrKey, type PlaystyleKey } from "./game-data";
import { topicVariant, type TopicKey } from "./trainer";

type W = Partial<Record<AttrKey, number>>;

/** Baseline relevance per position group (0–3). Deliberately modest: the brief and the focus decide. */
const BASE: Record<PositionGroup, W> = {
  GK: { gkDiving: 3, gkReflexes: 3, gkPositioning: 3, gkHandling: 2.5, gkKicking: 1.5, reactions: 1.5, jumping: 1 },
  DEF: { defAwareness: 3, standingTackle: 2.5, interceptions: 2.5, strength: 2, headingAccuracy: 1.5, jumping: 1.5, slidingTackle: 1.5, sprintSpeed: 1.5, acceleration: 1, shortPassing: 1, reactions: 1, composure: 1, aggression: 1 },
  MID: { shortPassing: 2.5, vision: 2, ballControl: 2, stamina: 2, reactions: 1.5, composure: 1.5, longPassing: 1.5, interceptions: 1, defAwareness: 1, agility: 1, dribbling: 1, acceleration: 1 },
  ATT: { finishing: 2.5, attPositioning: 2.5, acceleration: 2, sprintSpeed: 2, ballControl: 1.5, dribbling: 1.5, composure: 1.5, reactions: 1.5, agility: 1, shotPower: 1, shortPassing: 1 },
};

type Intent = { key: string; label: string; patterns: RegExp[]; weights: W; playstyles: PlaystyleKey[] };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Order matters: specific phrases first, so "atrair a marcação" is not read as "marcação" (defending). */
const INTENTS: Intent[] = [
  { key: "hold", label: "Atrair a marcação / segurar a bola", patterns: [/atrai\w* (a )?marcacao/, /segurar (a )?bola/, /prender (a )?bola/, /\bpivo\b/, /proteg\w*/, /de costas/],
    weights: { strength: 2, ballControl: 2, composure: 2, balance: 1 }, playstyles: ["pressProven", "firstTouch"] },
  { key: "through", label: "Passes em profundidade", patterns: [/profundidade/, /enfiad\w*/, /passe\w* (para|pros?) (os )?(pontas?|atacantes?) infiltr/, /\bassisten/, /criar (jogadas|chances)/],
    weights: { vision: 3, shortPassing: 1.5, curve: 0.5, composure: 0.5 }, playstyles: ["incisivePass"] },
  { key: "longball", label: "Lançamentos / inversões", patterns: [/lancament\w*/, /inversa\w*/, /passe\w* long\w*/, /bola long\w*/],
    weights: { longPassing: 3, curve: 1.5, vision: 1 }, playstyles: ["longBallPass"] },
  { key: "cross", label: "Cruzamentos", patterns: [/cruzament\w*/, /cruzar/, /linha de fundo/],
    weights: { crossing: 3, curve: 1.5 }, playstyles: ["whippedPass"] },
  { key: "longshot", label: "Chutes de longe", patterns: [/chute\w* de (longe|fora)/, /de fora da area/, /finaliza\w* de longe/],
    weights: { longShots: 3, shotPower: 2, curve: 1 }, playstyles: ["powerShot", "finesseShot"] },
  { key: "header", label: "Jogo aéreo / cabeceio", patterns: [/cabec\w*/, /\baere\w*/, /bola alta/],
    weights: { headingAccuracy: 3, jumping: 2.5, strength: 1.5 }, playstyles: ["powerHeader", "aerial"] },
  { key: "finish", label: "Finalização / fazer gols", patterns: [/finaliz\w*/, /\bgols?\b/, /artilheir\w*/, /matador/, /fazer gol/],
    weights: { finishing: 3, attPositioning: 2.5, composure: 1.5 }, playstyles: ["finesseShot", "lowDrivenShot"] },
  { key: "dribble", label: "Drible / 1×1", patterns: [/dribl\w*/, /1 ?(x|contra) ?1/, /\bum contra um\b/, /conduc\w*/],
    weights: { ballControl: 2.5, dribbling: 2.5, agility: 2, balance: 1.5 }, playstyles: ["technical", "trickster"] },
  { key: "pace", label: "Velocidade", patterns: [/velocidade/, /\brapid\w*/, /\bvelo\w*/, /arrancad\w*/, /contra-?ataque/, /explos\w*/],
    weights: { acceleration: 3, sprintSpeed: 2.5 }, playstyles: ["rapid", "quickStep"] },
  { key: "pass", label: "Passe / distribuição", patterns: [/\bpasse\w*/, /distribu\w*/, /tabela\w*/, /toque de bola/, /organiz\w*/],
    weights: { shortPassing: 2.5, vision: 1.5, ballControl: 0.5 }, playstyles: ["tikiTaka", "pingedPass"] },
  { key: "defend", label: "Defesa / recuperar a bola", patterns: [/defend\w*/, /\bmarca\w*/, /desarm\w*/, /recupera\w*/, /intercept\w*/, /combate/],
    weights: { defAwareness: 3, standingTackle: 2.5, interceptions: 2 }, playstyles: ["jockey", "anticipate", "intercept"] },
  { key: "physical", label: "Força física", patterns: [/fisic\w*/, /\bforca\b/, /trombad\w*/, /\bforte\b/, /duelos?/],
    weights: { strength: 3, aggression: 1, balance: 1 }, playstyles: ["bruiser"] },
  { key: "stamina", label: "Intensidade / fôlego", patterns: [/folego/, /box.to.box/, /intensidade/, /incansavel/, /corre\w* (o jogo|muito)/],
    weights: { stamina: 3 }, playstyles: ["relentless"] },
  { key: "gk", label: "Goleiro", patterns: [/goleiro/, /\bgol(eiro)?\b.*defes/, /defesas/],
    weights: { gkReflexes: 2, gkDiving: 2, gkPositioning: 2 }, playstyles: ["quickReflexes"] },
];

const ROLE_HINTS: { pattern: RegExp; label: string; group: PositionGroup }[] = [
  { pattern: /segundo atacante|falso 9|meia.atacante|meia ofensiv/, label: "Segundo atacante / meia ofensivo", group: "ATT" },
  { pattern: /centroavante|camisa 9|atacante|\bponta\b|extremo/, label: "Atacante", group: "ATT" },
  { pattern: /volante|meio.campo|meia|box.to.box|armador/, label: "Meio-campista", group: "MID" },
  { pattern: /zagueiro|lateral|\bala\b|defensor/, label: "Defensor", group: "DEF" },
  { pattern: /goleiro/, label: "Goleiro", group: "GK" },
];

export type ParsedBrief = { intents: { key: string; label: string; matched: string[] }[]; roleHint: { label: string; group: PositionGroup } | null };

export function parseBrief(text: string): ParsedBrief {
  let t = norm(text);
  const sou = t.match(/\bsou (um |o )?([a-z0-9 -]{3,30})/);
  const roleHint = sou ? ROLE_HINTS.find((r) => r.pattern.test(sou[2])) ?? null : null;
  const intents: ParsedBrief["intents"] = [];
  for (const it of INTENTS) {
    const matched: string[] = [];
    for (const p of it.patterns) {
      const g = new RegExp(p.source, "g");
      for (const m of t.matchAll(g)) matched.push(m[0]);
      t = t.replace(g, " ");
    }
    if (matched.length) intents.push({ key: it.key, label: it.label, matched: [...new Set(matched)] });
  }
  return { intents, roleHint: roleHint ? { label: roleHint.label, group: roleHint.group } : null };
}

export const TIERS = [
  { key: "max", label: "Prioridade máxima", size: 5 },
  { key: "high", label: "Alta", size: 6 },
  { key: "mid", label: "Complementar", size: 7 },
] as const;

export type GeneratedPlan = {
  group: PositionGroup;
  parsed: ParsedBrief;
  ranked: { key: AttrKey; label: string; score: number; tier: "max" | "high" | "mid" | "low"; reasons: string[] }[];
  playstyles: { key: PlaystyleKey; label: string; reason: string }[];
  drawbacks: string[];
  notes: string[];
};

export function generatePlan(opts: { group: PositionGroup; brief: string; focus?: { topic: TopicKey; variant?: string | null } | null; positionLabel?: string }): GeneratedPlan {
  const parsed = parseBrief(opts.brief);
  const group = parsed.roleHint?.group ?? opts.group;
  const score = new Map<AttrKey, { s: number; reasons: string[] }>();
  const add = (k: AttrKey, w: number, why: string) => {
    const cur = score.get(k) ?? { s: 0, reasons: [] };
    cur.s += w;
    if (!cur.reasons.includes(why)) cur.reasons.push(why);
    score.set(k, cur);
  };
  const posLabel = parsed.roleHint?.label ?? opts.positionLabel ?? group;
  for (const [k, w] of Object.entries(BASE[group]) as [AttrKey, number][]) add(k, w, `Base da posição (${posLabel})`);
  const ps = new Map<PlaystyleKey, string>();
  for (const it of parsed.intents) {
    const def = INTENTS.find((x) => x.key === it.key)!;
    for (const [k, w] of Object.entries(def.weights) as [AttrKey, number][]) add(k, w, `Seu objetivo: ${def.label.toLowerCase()} (“${it.matched[0]}”)`);
    for (const p of def.playstyles) if (!ps.has(p)) ps.set(p, def.label);
  }
  if (opts.focus) {
    const { topic, variant } = topicVariant(opts.focus.topic, opts.focus.variant);
    // The trainer lists primary attributes in order of importance → the first one weighs most.
    variant.primary.forEach((k, i) => add(k, i === 0 ? 4.5 : 3, `Plano do Treinador: ${topic.short} — ${variant.label} (prioritário)`));
    for (const k of variant.complementary) add(k, 1.5, `Plano do Treinador: ${topic.short} — ${variant.label} (complementar)`);
    for (const p of variant.playstyles) if (!ps.has(p)) ps.set(p, `${topic.short} — ${variant.label}`);
  }
  const isGk = group === "GK";
  const all = ATTRIBUTES.filter((a) => (isGk ? true : a.cat !== "goalkeeping"))
    .map((a) => ({ key: a.key as AttrKey, label: a.label, score: Math.round((score.get(a.key)?.s ?? 0) * 10) / 10, reasons: score.get(a.key)?.reasons ?? [] }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  let i = 0;
  const ranked = all.map((a) => {
    let tier: GeneratedPlan["ranked"][number]["tier"] = "low";
    let acc = 0;
    for (const t of TIERS) { acc += t.size; if (i < acc && a.score > 0) { tier = t.key; break; } }
    i++;
    return { ...a, tier };
  });

  const catScore = new Map<AttrCategory, number>();
  for (const a of ATTRIBUTES) if (isGk || a.cat !== "goalkeeping") catScore.set(a.cat, (catScore.get(a.cat) ?? 0) + (score.get(a.key)?.s ?? 0));
  const weakest = [...catScore.entries()].filter(([c]) => c !== "goalkeeping").sort((a, b) => a[1] - b[1]).slice(0, 2);
  const drawbacks = weakest.map(([c]) => `${ATTR_CATEGORIES[c]} fica em segundo plano — ${DRAWBACK[c]}`);
  const keys = new Set(parsed.intents.map((x) => x.key));
  if (keys.has("hold") && keys.has("pace")) drawbacks.push("Força e velocidade disputam pontos: corpo mais forte costuma custar arrancada (e vice-versa, pela altura e peso).");
  if (keys.has("header") && (keys.has("dribble") || keys.has("pace"))) drawbacks.push("Altura ajuda no jogo aéreo mas costuma reduzir agilidade e aceleração.");
  if (!parsed.intents.length && !opts.focus) drawbacks.push("Nenhum objetivo identificado no texto — as prioridades refletem apenas a posição.");

  const notes = [
    "Ordem de investimento sugerida, não uma distribuição exata de pontos.",
    "Sem tabela de custos verificada do FC 27, não dá para garantir quantos atributos da prioridade máxima cabem no seu orçamento — confirme no jogo.",
  ];
  return {
    group, parsed, ranked,
    playstyles: [...ps.entries()].slice(0, 5).map(([k, reason]) => ({ key: k, label: PLAYSTYLE_BY_KEY[k].label, reason })),
    drawbacks, notes,
  };
}

const DRAWBACK: Record<AttrCategory, string> = {
  pace: "você pode perder corridas contra defensores rápidos.",
  shooting: "suas finalizações dependem mais de boas chances do que de qualidade de chute.",
  passing: "passes longos e de risco tendem a errar mais.",
  dribbling: "vai sofrer mais em espaços curtos e sob pressão.",
  defending: "contribuição defensiva limitada — combine com a cobertura do time.",
  physical: "tende a perder duelos de corpo e a cansar antes no fim do jogo.",
  goalkeeping: "",
};

// ─── Build documents ────────────────────────────────────────────────────────

export type BuildAttrs = Partial<Record<AttrKey, { initial: number | null; planned: number | null }>>;
export type BuildDoc = { name: string; archetype: string | null; attributes: BuildAttrs; playstyles: { key: string; plus: boolean }[]; pointsAvailable: number | null };

const val = (v?: { initial: number | null; planned: number | null }) => v?.planned ?? v?.initial ?? null;

export function budget(doc: BuildDoc) {
  const used = buildCost(doc.attributes, doc.archetype);
  return { used, available: doc.pointsAvailable, remaining: used != null && doc.pointsAvailable != null ? doc.pointsAvailable - used : null, validated: used != null };
}

export function compareBuilds(a: BuildDoc, b: BuildDoc) {
  const rows = ATTRIBUTES.map((x) => {
    const va = val(a.attributes[x.key]), vb = val(b.attributes[x.key]);
    return { key: x.key, label: x.label, cat: x.cat, a: va, b: vb, diff: va != null && vb != null ? vb - va : null };
  }).filter((r) => r.a != null || r.b != null);
  const sa = new Set(a.playstyles.map((p) => p.key)), sb = new Set(b.playstyles.map((p) => p.key));
  const byCat = Object.keys(ATTR_CATEGORIES).map((c) => {
    const rs = rows.filter((r) => r.cat === c && r.a != null && r.b != null);
    if (!rs.length) return null;
    const avg = (f: (r: (typeof rs)[number]) => number) => rs.reduce((s, r) => s + f(r), 0) / rs.length;
    return { cat: c as AttrCategory, label: ATTR_CATEGORIES[c as AttrCategory], a: avg((r) => r.a!), b: avg((r) => r.b!) };
  }).filter((x): x is NonNullable<typeof x> => x != null);
  return {
    rows, byCat,
    onlyA: [...sa].filter((k) => !sb.has(k)), onlyB: [...sb].filter((k) => !sa.has(k)), both: [...sa].filter((k) => sb.has(k)),
    budgetA: budget(a), budgetB: budget(b),
  };
}

export function attrLabel(k: string) {
  return ATTR_LABEL[k as AttrKey] ?? k;
}
