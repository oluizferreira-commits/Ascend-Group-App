/**
 * Game Data Registry — everything the Performance Lab knows about the game itself.
 *
 * Rules:
 *  - Only data we can stand behind goes here, each block with a `verified` flag and a source note.
 *  - Attribute upgrade COSTS for FC 27 Clubs are NOT verified, so `COSTS` is null and the Build
 *    Builder runs in "planning mode" (no point maths, clear "orçamento não validado" label).
 *    When a verified table exists, fill `COSTS` (and bump `GAME_DATA_REVISION`) — nothing else changes.
 *  - Archetype names for FC 27 are not verified either: the builder takes the archetype as free text
 *    and shows the archetype id that EA reports in match data (player_statistics.extra.archetypeId).
 */

export const GAME_VERSION = "EA SPORTS FC 27";
export const GAME_DATA_REVISION = "2026-11-23";

export const ATTR_CATEGORIES = {
  pace: "Ritmo",
  shooting: "Finalização",
  passing: "Passe",
  dribbling: "Drible",
  defending: "Defesa",
  physical: "Físico",
  goalkeeping: "Goleiro",
} as const;
export type AttrCategory = keyof typeof ATTR_CATEGORIES;

/**
 * In-game attributes (the long-standing EA FC sub-attributes, 1–99).
 * Names follow the Portuguese version of the game; confirm small wording differences in FC 27.
 */
export const ATTRIBUTES = [
  { key: "acceleration", label: "Aceleração", cat: "pace" },
  { key: "sprintSpeed", label: "Pique", cat: "pace" },
  { key: "attPositioning", label: "Posicionamento ofensivo", cat: "shooting" },
  { key: "finishing", label: "Finalização", cat: "shooting" },
  { key: "shotPower", label: "Força do chute", cat: "shooting" },
  { key: "longShots", label: "Chute de longe", cat: "shooting" },
  { key: "volleys", label: "Voleio", cat: "shooting" },
  { key: "penalties", label: "Pênaltis", cat: "shooting" },
  { key: "vision", label: "Visão de jogo", cat: "passing" },
  { key: "crossing", label: "Cruzamento", cat: "passing" },
  { key: "fkAccuracy", label: "Cobrança de falta", cat: "passing" },
  { key: "shortPassing", label: "Passe curto", cat: "passing" },
  { key: "longPassing", label: "Passe longo", cat: "passing" },
  { key: "curve", label: "Curva", cat: "passing" },
  { key: "agility", label: "Agilidade", cat: "dribbling" },
  { key: "balance", label: "Equilíbrio", cat: "dribbling" },
  { key: "reactions", label: "Reação", cat: "dribbling" },
  { key: "ballControl", label: "Controle de bola", cat: "dribbling" },
  { key: "dribbling", label: "Condução", cat: "dribbling" },
  { key: "composure", label: "Compostura", cat: "dribbling" },
  { key: "interceptions", label: "Interceptação", cat: "defending" },
  { key: "headingAccuracy", label: "Precisão de cabeceio", cat: "defending" },
  { key: "defAwareness", label: "Noção defensiva", cat: "defending" },
  { key: "standingTackle", label: "Desarme em pé", cat: "defending" },
  { key: "slidingTackle", label: "Carrinho", cat: "defending" },
  { key: "jumping", label: "Impulsão", cat: "physical" },
  { key: "stamina", label: "Fôlego", cat: "physical" },
  { key: "strength", label: "Força", cat: "physical" },
  { key: "aggression", label: "Agressividade", cat: "physical" },
  { key: "gkDiving", label: "Elasticidade (GOL)", cat: "goalkeeping" },
  { key: "gkHandling", label: "Manejo (GOL)", cat: "goalkeeping" },
  { key: "gkKicking", label: "Chute (GOL)", cat: "goalkeeping" },
  { key: "gkPositioning", label: "Posicionamento (GOL)", cat: "goalkeeping" },
  { key: "gkReflexes", label: "Reflexos (GOL)", cat: "goalkeeping" },
] as const satisfies readonly { key: string; label: string; cat: AttrCategory }[];
export type AttrKey = (typeof ATTRIBUTES)[number]["key"];
export const ATTR_KEYS = ATTRIBUTES.map((a) => a.key) as AttrKey[];
export const ATTR_LABEL = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a.label])) as Record<AttrKey, string>;
export const ATTR_MIN = 1;
export const ATTR_MAX = 99;
export const ATTRIBUTES_VERIFIED = { verified: true, note: "Sub-atributos padrão do EA FC (1–99)." };

export const PLAYSTYLE_CATEGORIES = { shooting: "Finalização", passing: "Passe", ballControl: "Controle de bola", defending: "Defesa", physical: "Físico", goalkeeping: "Goleiro" } as const;
export type PlaystyleCategory = keyof typeof PLAYSTYLE_CATEGORIES;

/**
 * PlayStyles known from EA FC 24–26 (English in-game name kept for reference).
 * FC 27 may add, rename or rebalance some of them — confirm in game before relying on a specific effect.
 */
export const PLAYSTYLES = [
  { key: "finesseShot", label: "Chute colocado", en: "Finesse Shot", cat: "shooting" },
  { key: "powerShot", label: "Chute forte", en: "Power Shot", cat: "shooting" },
  { key: "chipShot", label: "Cavadinha", en: "Chip Shot", cat: "shooting" },
  { key: "deadBall", label: "Bola parada", en: "Dead Ball", cat: "shooting" },
  { key: "powerHeader", label: "Cabeceio forte", en: "Power Header", cat: "shooting" },
  { key: "acrobatic", label: "Acrobático", en: "Acrobatic", cat: "shooting" },
  { key: "lowDrivenShot", label: "Chute rasteiro", en: "Low Driven Shot", cat: "shooting" },
  { key: "incisivePass", label: "Passe incisivo", en: "Incisive Pass", cat: "passing" },
  { key: "pingedPass", label: "Passe tenso", en: "Pinged Pass", cat: "passing" },
  { key: "longBallPass", label: "Lançamento", en: "Long Ball Pass", cat: "passing" },
  { key: "tikiTaka", label: "Tiki-taka", en: "Tiki Taka", cat: "passing" },
  { key: "whippedPass", label: "Cruzamento chicote", en: "Whipped Pass", cat: "passing" },
  { key: "trivela", label: "Trivela", en: "Trivela", cat: "passing" },
  { key: "technical", label: "Técnico", en: "Technical", cat: "ballControl" },
  { key: "rapid", label: "Rápido", en: "Rapid", cat: "ballControl" },
  { key: "flair", label: "Habilidoso", en: "Flair", cat: "ballControl" },
  { key: "firstTouch", label: "Primeiro toque", en: "First Touch", cat: "ballControl" },
  { key: "trickster", label: "Malabarista", en: "Trickster", cat: "ballControl" },
  { key: "pressProven", label: "À prova de pressão", en: "Press Proven", cat: "ballControl" },
  { key: "intercept", label: "Interceptação", en: "Intercept", cat: "defending" },
  { key: "block", label: "Bloqueio", en: "Block", cat: "defending" },
  { key: "jockey", label: "Contenção", en: "Jockey", cat: "defending" },
  { key: "slideTackle", label: "Carrinho", en: "Slide Tackle", cat: "defending" },
  { key: "anticipate", label: "Antecipação", en: "Anticipate", cat: "defending" },
  { key: "aerial", label: "Jogo aéreo", en: "Aerial", cat: "defending" },
  { key: "bruiser", label: "Brigador", en: "Bruiser", cat: "physical" },
  { key: "quickStep", label: "Arranque", en: "Quick Step", cat: "physical" },
  { key: "relentless", label: "Incansável", en: "Relentless", cat: "physical" },
  { key: "longThrow", label: "Lateral longo", en: "Long Throw", cat: "physical" },
  { key: "farThrow", label: "Reposição longa (GOL)", en: "Far Throw", cat: "goalkeeping" },
  { key: "footwork", label: "Jogo com os pés (GOL)", en: "Footwork", cat: "goalkeeping" },
  { key: "crossClaimer", label: "Sai bem no cruzamento (GOL)", en: "Cross Claimer", cat: "goalkeeping" },
  { key: "rushOut", label: "Sai do gol (GOL)", en: "Rush Out", cat: "goalkeeping" },
  { key: "farReach", label: "Alcance (GOL)", en: "Far Reach", cat: "goalkeeping" },
  { key: "quickReflexes", label: "Reflexo rápido (GOL)", en: "Quick Reflexes", cat: "goalkeeping" },
] as const satisfies readonly { key: string; label: string; en: string; cat: PlaystyleCategory }[];
export type PlaystyleKey = (typeof PLAYSTYLES)[number]["key"];
export const PLAYSTYLE_BY_KEY = Object.fromEntries(PLAYSTYLES.map((p) => [p.key, p])) as Record<PlaystyleKey, (typeof PLAYSTYLES)[number]>;
export const PLAYSTYLES_VERIFIED = { verified: false, note: "Lista de referência do EA FC 24–26. Confirme no FC 27 antes de contar com um estilo específico." };

/** Archetype names for FC 27 are not verified → free text in the builder. */
export const ARCHETYPES_VERIFIED = { verified: false, note: "Nomes e regras dos arquétipos do FC 27 ainda não verificados. Informe o seu arquétipo como aparece no jogo." };

/**
 * Upgrade cost table — NOT available. Shape ready for a verified table:
 * cost to go from value v to v+1 for an attribute, per archetype if needed.
 */
export type CostTable = { source: string; verifiedOn: string; costPerStep: (attr: AttrKey, from: number, archetype: string | null) => number | null };
export const COSTS = null as CostTable | null;
export const COSTS_STATUS = COSTS
  ? { verified: true as const, note: `Custos verificados (${COSTS.source}).` }
  : { verified: false as const, note: "Nenhuma tabela de custos verificada selecionada. Use o planejamento como guia de prioridades — o jogo é quem confirma os pontos." };

/** Planned point cost of a build — null when no verified cost table exists (never a guess). */
export function buildCost(attrs: Partial<Record<AttrKey, { initial: number | null; planned: number | null }>>, archetype: string | null): number | null {
  if (!COSTS) return null;
  let total = 0;
  for (const [k, v] of Object.entries(attrs) as [AttrKey, { initial: number | null; planned: number | null }][]) {
    if (v?.initial == null || v.planned == null || v.planned <= v.initial) continue;
    for (let x = v.initial; x < v.planned; x++) {
      const c = COSTS.costPerStep(k, x, archetype);
      if (c == null) return null;
      total += c;
    }
  }
  return total;
}

export const TACTICAL_ROLES = [
  "Goleiro tradicional", "Goleiro líbero", "Zagueiro de marcação", "Zagueiro construtor", "Lateral defensivo", "Lateral ofensivo", "Ala",
  "Volante de contenção", "Volante construtor", "Meia box-to-box", "Meia organizador", "Meia ofensivo", "Segundo atacante",
  "Ponta driblador", "Ponta de infiltração", "Centroavante finalizador", "Centroavante pivô", "Falso 9",
];
