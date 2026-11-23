/**
 * Diagnostic Engine — deterministic, explainable rules over the Statistics Analyzer.
 *
 * Method (transparent on purpose):
 *  - "Recent" = last 5 matches. "Baseline" = every earlier match (needs ≥ 5), so the two never overlap.
 *  - Change is tested against match-to-match variability: z = (recent − baseline) / (σ_baseline / √n_recent).
 *    |z| ≥ 2.0 with a full sample → confiança alta; |z| ≥ 1.4 → média; below that we stay silent.
 *  - A minimum practical change is also required (e.g. 4 p.p. of pass accuracy), so tiny but
 *    consistent wiggles are not reported.
 *  - Only metrics relevant to the player's position group are diagnosed.
 *  - Wording is factual and never judgemental; every insight lists evidence, interpretation,
 *    possible causes, practical recommendations and a link to the matching training topic.
 */
import type { PositionGroup } from "@/lib/domain";
import { computeWindow, fmtMetric, mean, METRIC_BY_KEY, stdev, type LabMatch, type MetricDef } from "./metrics";
import type { TopicKey } from "./trainer";

export type Confidence = "alta" | "média" | "baixa";
export type Tone = "positive" | "attention" | "problem" | "info";

export type Insight = {
  id: string;
  tone: Tone;
  title: string;
  metric?: string;
  evidence: string[];
  interpretation: string;
  causes: string[];
  recommendations: string[];
  topic?: TopicKey;
  variant?: string;
  confidence: Confidence;
  /** Larger = more important (used for ordering and the main diagnosis). */
  weight: number;
};

export type Trend = {
  metric: MetricDef;
  recent: number; baseline: number; diff: number; z: number;
  nRecent: number; nBase: number; confidence: Confidence; direction: "up" | "down";
};

const RECENT = 5;
const MIN_BASE = 5;
/** Minimum practical change per metric (p.p. for %, relative for rates). */
const MIN_CHANGE: Record<string, { abs?: number; rel?: number }> = {
  rating: { abs: 0.3 }, passAccuracy: { abs: 4 }, conversion: { abs: 8 }, shotAccuracy: { abs: 10 }, tackleSuccess: { abs: 8 }, savePct: { abs: 8 },
  involvements: { rel: 0.25 }, passesAttempted: { rel: 0.15 }, assists: { rel: 0.3 }, goals: { rel: 0.3 }, shots: { rel: 0.2 },
  tackles: { rel: 0.25 }, interceptions: { rel: 0.25 }, saves: { rel: 0.25 }, conceded: { rel: 0.25 },
};

/** Recent (last 5) vs everything before it. Null when there is not enough data to say anything. */
export function trendOf(def: MetricDef, matches: LabMatch[]): Trend | null {
  if (matches.length < RECENT + MIN_BASE || !def.perMatch) return null;
  const recentW = matches.slice(-RECENT), baseW = matches.slice(0, -RECENT);
  const r = computeWindow(def, recentW), b = computeWindow(def, baseW);
  if (r.value == null || b.value == null || b.n < MIN_BASE || r.n < 3) return null;
  const baseSeries = baseW.map(def.perMatch).filter((v): v is number => v != null);
  const sd = stdev(baseSeries);
  if (!Number.isFinite(sd) || sd === 0) return null;
  const diff = r.value - b.value;
  const z = diff / (sd / Math.sqrt(r.n));
  const min = MIN_CHANGE[def.key] ?? {};
  const practical = (min.abs == null || Math.abs(diff) >= min.abs) && (min.rel == null || Math.abs(diff) >= min.rel * Math.max(Math.abs(b.value), 0.1));
  if (!practical) return null;
  const az = Math.abs(z);
  const confidence: Confidence = az >= 2 && r.n >= RECENT && b.n >= 10 ? "alta" : az >= 1.4 ? "média" : "baixa";
  if (confidence === "baixa") return null;
  return { metric: def, recent: r.value, baseline: b.value, diff, z, nRecent: r.n, nBase: b.n, confidence, direction: diff > 0 ? "up" : "down" };
}

const better = (t: Trend) => (t.metric.better === "up" ? t.direction === "up" : t.direction === "down");
const ev = (t: Trend) => `${t.metric.label}: ${fmtMetric(t.metric, t.recent)} nas últimas ${t.nRecent} partidas com dados, contra ${fmtMetric(t.metric, t.baseline)} nas ${t.nBase} anteriores.`;
const conf = (t: Trend): number => (t.confidence === "alta" ? 2 : 1);

export function diagnose(matches: LabMatch[], group: PositionGroup): Insight[] {
  const out: Insight[] = [];
  if (matches.length < RECENT + MIN_BASE) {
    out.push({
      id: "insufficient", tone: "info", confidence: "alta", weight: 0,
      title: "Ainda não existem partidas suficientes para identificar uma tendência confiável",
      evidence: [`${matches.length} ${matches.length === 1 ? "partida registrada" : "partidas registradas"}. A comparação precisa de pelo menos ${RECENT + MIN_BASE} (as 5 mais recentes contra as anteriores).`],
      interpretation: "Com poucas partidas, uma boa ou má atuação isolada distorce qualquer conclusão. Os números abaixo já valem como referência, mas sem tendência.",
      causes: [], recommendations: ["Continue jogando pelo clube — as partidas da EA entram sozinhas.", "Enquanto isso, use o Treinador para escolher algo que você quer melhorar."],
    });
    return out;
  }
  const T = (k: string) => (METRIC_BY_KEY[k].relevant.includes(group) ? trendOf(METRIC_BY_KEY[k], matches) : null);
  const pass = T("passAccuracy"), volume = T("passesAttempted"), conv = T("conversion"), shots = T("shots"), inv = T("involvements"),
    tackles = T("tackles"), tsucc = T("tackleSuccess"), savePct = T("savePct"), rating = T("rating"), goals = T("goals"), assists = T("assists");

  if (pass && !better(pass)) {
    const riskier = volume && volume.direction === "up";
    // Red only when the drop is large AND not explained by more ambitious passing.
    const big = Math.abs(pass.diff) >= 10 && pass.confidence === "alta" && !riskier;
    out.push({
      id: "pass-down", tone: big ? "problem" : "attention", metric: "passAccuracy", confidence: pass.confidence, weight: 6 + conf(pass) + (big ? 2 : 0),
      title: "Sua precisão de passes caiu nas últimas partidas",
      evidence: [ev(pass), ...(volume ? [ev(volume)] : [])],
      interpretation: riskier
        ? "Você está tentando mais passes. Parte da queda pode vir de passes mais arriscados (profundidade, verticalidade) — isso nem sempre é ruim se gerar chances."
        : "A queda aconteceu sem aumento no volume de passes, o que sugere mais erros de execução ou de escolha.",
      causes: ["Passes sob pressão sem opção de apoio", "Mais tentativas em profundidade ou elevadas", "Função tática diferente nas últimas partidas", "Atributos de passe abaixo do que o estilo de jogo exige"],
      recommendations: ["Revise no replay onde os passes erram (pressão, distância, tipo).", "Use o passe de segurança quando não houver vantagem clara.", "Abra o plano de passes no Treinador para ver atributos e estilos de jogo indicados."],
      topic: "passes", variant: riskier ? "through" : "pressure",
    });
  } else if (pass && better(pass)) {
    out.push({ id: "pass-up", tone: "positive", metric: "passAccuracy", confidence: pass.confidence, weight: 3 + conf(pass),
      title: "Sua precisão de passes melhorou", evidence: [ev(pass)],
      interpretation: "Você está errando menos passes do que no seu histórico.", causes: [],
      recommendations: ["Mantenha a escolha de passe — e teste passes mais verticais quando a linha existir."], topic: "assists" });
  }

  if (conv && !better(conv) && shots && shots.direction === "up") {
    out.push({ id: "shots-up-conv-down", tone: "attention", metric: "conversion", confidence: conv.confidence, weight: 6 + conf(conv),
      title: "Você está finalizando mais, mas convertendo menos", evidence: [ev(shots), ev(conv)],
      interpretation: "Mais chutes com menos gols costuma indicar finalizações de baixa probabilidade (ângulo fechado, longe, com marcação) ou execução abaixo do normal.",
      causes: ["Chutes de longe ou de ângulo difícil", "Pressa na finalização", "Atributos de finalização para o tipo de chute que você usa"],
      recommendations: ["Prefira dar um toque a mais para abrir o ângulo.", "Reduza chutes com 2+ defensores à frente.", "Veja o plano de finalização no Treinador."],
      topic: "goals", variant: "wasteful" });
  } else if (conv && !better(conv)) {
    out.push({ id: "conv-down", tone: "attention", metric: "conversion", confidence: conv.confidence, weight: 5 + conf(conv),
      title: "Sua conversão de chutes caiu", evidence: [ev(conv)],
      interpretation: "Você está precisando de mais chutes para marcar do que no seu histórico.",
      causes: ["Qualidade das chances", "Execução da finalização"], recommendations: ["Revise as chances perdidas no replay.", "Veja o plano de finalização no Treinador."], topic: "finishing" });
  } else if (conv && better(conv)) {
    out.push({ id: "conv-up", tone: "positive", metric: "conversion", confidence: conv.confidence, weight: 3 + conf(conv),
      title: "Você está convertendo mais chutes em gols", evidence: [ev(conv)], interpretation: "Sua eficiência na finalização subiu em relação ao seu histórico.", causes: [], recommendations: ["Continue escolhendo bem o momento de chutar."] });
  }

  if (inv && better(inv) && (group === "MID" || group === "ATT")) {
    out.push({ id: "inv-up", tone: "positive", metric: "involvements", confidence: inv.confidence, weight: 4 + conf(inv),
      title: "Sua participação ofensiva aumentou", evidence: [ev(inv)],
      interpretation: "Você está participando de mais gols do time — criando ou finalizando mais.", causes: [], recommendations: ["Mantenha a movimentação que está gerando essas jogadas."] });
  } else if (inv && !better(inv) && group === "ATT") {
    out.push({ id: "inv-down", tone: "attention", metric: "involvements", confidence: inv.confidence, weight: 5 + conf(inv),
      title: "Sua participação em gols diminuiu", evidence: [ev(inv), ...(goals ? [ev(goals)] : []), ...(assists ? [ev(assists)] : [])],
      interpretation: "Você está participando de menos gols do que no seu histórico. Pode ser fase do time — compare com o resultado das partidas.",
      causes: ["Menos bolas chegando", "Posicionamento fora das zonas de finalização", "Mudança de função tática"],
      recommendations: ["Ataque mais o espaço dentro da área.", "Converse com os meias sobre o tempo da infiltração."], topic: "goals", variant: "fewChances" });
  }

  if (tsucc && !better(tsucc)) {
    out.push({ id: "tackle-eff-down", tone: "attention", metric: "tackleSuccess", confidence: tsucc.confidence, weight: 5 + conf(tsucc),
      title: "Sua eficiência nos desarmes caiu", evidence: [ev(tsucc)],
      interpretation: "Você está acertando uma parcela menor dos botes que tenta.",
      causes: ["Bote dado cedo (antes do atacante errar o toque)", "Desarmes de frente contra atacantes rápidos"],
      recommendations: ["Use mais a contenção e espere o toque longo do atacante.", "Veja o plano de defesa no Treinador."], topic: "defending", variant: "tackling" });
  }
  const defUp = (tackles && better(tackles)) || (tsucc && better(tsucc));
  if (defUp && (group === "DEF" || group === "MID")) {
    const t = (tsucc && better(tsucc) ? tsucc : tackles)!;
    out.push({ id: "def-up", tone: "positive", metric: t.metric.key, confidence: t.confidence, weight: 3 + conf(t),
      title: "Seu desempenho defensivo melhorou", evidence: [ev(t)], interpretation: "Você está ganhando mais duelos defensivos do que no seu histórico.", causes: [], recommendations: ["Mantenha o timing dos botes."] });
  }

  if (savePct && group === "GK") {
    out.push(better(savePct)
      ? { id: "gk-up", tone: "positive", metric: "savePct", confidence: savePct.confidence, weight: 4 + conf(savePct), title: "Seu aproveitamento de defesas subiu", evidence: [ev(savePct)], interpretation: "Você está defendendo uma parcela maior dos chutes no gol.", causes: [], recommendations: ["Mantenha o posicionamento."] }
      : { id: "gk-down", tone: "attention", metric: "savePct", confidence: savePct.confidence, weight: 6 + conf(savePct), title: "Seu aproveitamento de defesas caiu", evidence: [ev(savePct)],
          interpretation: "Uma parcela maior dos chutes no gol virou gol. Isso também depende da defesa à sua frente — olhe a qualidade das chances.",
          causes: ["Chances claras concedidas pela defesa", "Movimentação manual do goleiro no último segundo", "Saídas fora de hora"],
          recommendations: ["Evite mexer o goleiro manualmente no momento do chute.", "Veja o plano de goleiro no Treinador."], topic: "goalkeeping", variant: "shots" });
  }

  if (rating && out.length === 0) {
    out.push(better(rating)
      ? { id: "rating-up", tone: "positive", metric: "rating", confidence: rating.confidence, weight: 2 + conf(rating), title: "Sua nota média está subindo", evidence: [ev(rating)], interpretation: "Seu desempenho geral recente está acima do seu histórico.", causes: [], recommendations: ["Continue assim."] }
      : { id: "rating-down", tone: "attention", metric: "rating", confidence: rating.confidence, weight: 3 + conf(rating), title: "Sua nota média caiu nas últimas partidas", evidence: [ev(rating)],
          interpretation: "Nenhuma estatística isolada explica a queda — pode ser o contexto das partidas (adversários, resultado do time).", causes: ["Fase do time", "Adversários mais fortes"],
          recommendations: ["Escolha um ponto no Treinador para focar nas próximas partidas."] });
  }

  if (out.length === 0) {
    out.push({ id: "stable", tone: "info", confidence: "média", weight: 1,
      title: "Desempenho estável", evidence: [`${matches.length} partidas analisadas: nenhuma métrica mudou de forma consistente nas últimas ${RECENT}.`],
      interpretation: "Seus números recentes estão dentro da variação normal do seu histórico.", causes: [],
      recommendations: ["Escolha um objetivo no Treinador para evoluir um ponto específico."] });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** Up to 3 development priorities: problems/attention first, then weak spots vs same-position peers. */
export function priorities(insights: Insight[], peerGaps: { topic: TopicKey; variant?: string; text: string; weight: number }[]) {
  const list: { topic: TopicKey; variant?: string; title: string; reason: string }[] = [];
  for (const i of insights) {
    if ((i.tone === "problem" || i.tone === "attention") && i.topic && !list.some((x) => x.topic === i.topic)) list.push({ topic: i.topic, variant: i.variant, title: i.title, reason: i.evidence[0] });
  }
  for (const g of [...peerGaps].sort((a, b) => b.weight - a.weight)) {
    if (!list.some((x) => x.topic === g.topic)) list.push({ topic: g.topic, variant: g.variant, title: g.text, reason: "Abaixo da média do elenco na mesma posição." });
  }
  return list.slice(0, 3);
}

/** Compare the player with same-position teammates (career values). Needs ≥ 3 peers with data. */
export function peerComparison(defs: MetricDef[], mine: LabMatch[], peers: LabMatch[][]) {
  return defs.map((def) => {
    const me = computeWindow(def, mine).value;
    const vals = peers.map((p) => computeWindow(def, p)).filter((v) => v.value != null && v.n >= def.minN).map((v) => v.value!);
    if (me == null || vals.length < 3) return { def, me, avg: null as number | null, peers: vals.length, position: null as "acima" | "abaixo" | "na média" | null };
    const avg = mean(vals), sd = stdev(vals);
    const gap = (me - avg) * (def.better === "up" ? 1 : -1);
    const position = !Number.isFinite(sd) || Math.abs(gap) < Math.max(sd * 0.5, Math.abs(avg) * 0.05) ? "na média" : gap > 0 ? "acima" : "abaixo";
    return { def, me, avg, peers: vals.length, position };
  });
}

/** Which training topic addresses a weak metric. */
export const METRIC_TOPIC: Record<string, { topic: TopicKey; variant?: string; text: string }> = {
  passAccuracy: { topic: "passes", text: "Melhorar a precisão de passes" },
  conversion: { topic: "finishing", text: "Aumentar a eficiência nas finalizações" },
  goals: { topic: "goals", text: "Marcar mais gols" },
  shots: { topic: "goals", variant: "fewChances", text: "Chegar mais vezes à finalização" },
  assists: { topic: "assists", text: "Criar mais assistências" },
  involvements: { topic: "positioning", variant: "attacking", text: "Participar mais das jogadas de gol" },
  tackleSuccess: { topic: "defending", variant: "tackling", text: "Acertar mais desarmes" },
  tackles: { topic: "defending", variant: "reading", text: "Recuperar mais bolas" },
  savePct: { topic: "goalkeeping", variant: "shots", text: "Defender mais chutes" },
  conceded: { topic: "goalkeeping", variant: "crosses", text: "Sofrer menos gols" },
};
