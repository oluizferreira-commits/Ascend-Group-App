/** Domain vocabulary shared by server and client (pt-BR labels). */

export const POSITIONS = [
  "GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST",
] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  GK: "GOL", CB: "ZAG", LB: "LE", RB: "LD", LWB: "ALE", RWB: "ALD",
  CDM: "VOL", CM: "MC", CAM: "MEI", LM: "ME", RM: "MD", LW: "PE", RW: "PD", CF: "SA", ST: "ATA",
};
export const POSITION_NAMES: Record<Position, string> = {
  GK: "Goleiro", CB: "Zagueiro", LB: "Lateral-esquerdo", RB: "Lateral-direito",
  LWB: "Ala esquerdo", RWB: "Ala direito", CDM: "Volante", CM: "Meio-campista central",
  CAM: "Meia ofensivo", LM: "Meia esquerda", RM: "Meia direita", LW: "Ponta esquerda",
  RW: "Ponta direita", CF: "Segundo atacante", ST: "Centroavante",
};

export const POSITION_GROUPS = ["GK", "DEF", "MID", "ATT"] as const;
export type PositionGroup = (typeof POSITION_GROUPS)[number];
export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  GK: "Goleiros", DEF: "Defensores", MID: "Meio-campistas", ATT: "Atacantes",
};

export function positionGroup(p: Position): PositionGroup {
  if (p === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(p)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(p)) return "MID";
  return "ATT";
}

export const PLAYER_STATUSES = ["starter", "reserve", "available", "unavailable", "sidelined", "inactive"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];
export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  starter: "Titular", reserve: "Reserva", available: "Disponível",
  unavailable: "Indisponível", sidelined: "Afastado", inactive: "Inativo",
};

export const FEET = ["right", "left", "both"] as const;
export const FOOT_LABELS: Record<(typeof FEET)[number], string> = { right: "Direito", left: "Esquerdo", both: "Ambos" };

export const MATCH_STATUS_LABELS = { scheduled: "Agendada", finished: "Encerrada", cancelled: "Cancelada" } as const;
export const SOURCE_LABELS = { manual: "Manual", ea_fc: "EA SPORTS FC", file_import: "Arquivo" } as const;

export type MatchResult = "W" | "D" | "L";
export function matchResult(goalsFor: number, goalsAgainst: number): MatchResult {
  return goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
}
export const RESULT_LABELS: Record<MatchResult, string> = { W: "Vitória", D: "Empate", L: "Derrota" };

export const ANNOUNCEMENT_CATEGORIES = [
  "administrative", "callup", "match_schedule", "calendar_change", "coaching_staff", "general",
] as const;
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<(typeof ANNOUNCEMENT_CATEGORIES)[number], string> = {
  administrative: "Administrativo", callup: "Convocação", match_schedule: "Horário de partida",
  calendar_change: "Alteração de calendário", coaching_staff: "Comissão técnica", general: "Geral",
};
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const PRIORITY_LABELS: Record<(typeof PRIORITIES)[number], string> = {
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};
export const VISIBILITIES = ["public", "members", "staff"] as const;
export const VISIBILITY_LABELS: Record<(typeof VISIBILITIES)[number], string> = {
  public: "Público", members: "Membros do clube", staff: "Somente comissão/diretoria",
};
