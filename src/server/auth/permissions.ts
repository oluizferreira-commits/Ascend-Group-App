/**
 * Role-based access control — single source of truth.
 * The seed script mirrors this into the roles / permissions / role_permissions
 * tables; the server checks permissions on every action and data read.
 */
export const PERMISSIONS = {
  "org.manage": "Gerenciar dados da organização e do clube",
  "roles.manage": "Atribuir cargos de Presidente e Administrador",
  "users.manage": "Criar contas e atribuir cargos (abaixo de Administrador)",
  "audit.view": "Consultar o registro de auditoria",
  "seasons.manage": "Gerenciar temporadas",
  "dashboard.view": "Acessar o painel do clube",
  "players.view": "Consultar o elenco",
  "players.manage": "Cadastrar e editar jogadores",
  "matches.view": "Consultar partidas",
  "matches.manage": "Cadastrar e editar partidas",
  "stats.view": "Consultar estatísticas e rankings",
  "stats.manage": "Registrar estatísticas de partidas",
  "ratings.configure": "Ajustar critérios do sistema de avaliação",
  "lineups.view": "Consultar escalações",
  "lineups.manage": "Criar e editar escalações e táticas",
  "competitions.view": "Consultar competições",
  "competitions.manage": "Gerenciar competições",
  "announcements.view": "Consultar comunicados internos",
  "announcements.manage": "Publicar comunicados",
  "calendar.manage": "Agendar eventos",
  "callups.manage": "Fazer convocações",
  "availability.self": "Informar a própria disponibilidade",
  "reports.view": "Consultar relatórios técnicos",
  "integration.manage": "Gerenciar a integração EA SPORTS FC",
  "media.manage": "Gerar artes na central de mídia",
  "recruitment.manage": "Ver e avaliar propostas do “Seja do Ascend” (inclui contatos)",
  "gamedata.manage": "Importar, revisar e verificar tabelas de custos de builds (Performance Lab)",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_KEYS = ["president", "admin", "coach", "assistant_coach", "analyst", "player", "visitor"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLES: Record<RoleKey, { name: string; rank: number; permissions: Permission[] }> = {
  president: { name: "Presidente", rank: 100, permissions: ALL_PERMISSIONS },
  admin: {
    name: "Administrador",
    rank: 80,
    permissions: [
      "users.manage", "audit.view", "seasons.manage", "dashboard.view",
      "players.view", "players.manage", "matches.view", "matches.manage",
      "stats.view", "stats.manage", "lineups.view", "competitions.view", "competitions.manage",
      "announcements.view", "announcements.manage", "calendar.manage", "callups.manage",
      "reports.view", "integration.manage", "media.manage", "recruitment.manage", "gamedata.manage",
    ],
  },
  coach: {
    name: "Treinador",
    rank: 60,
    permissions: [
      "dashboard.view", "players.view", "matches.view", "stats.view", "stats.manage", "ratings.configure",
      "lineups.view", "lineups.manage", "competitions.view", "announcements.view", "announcements.manage",
      "calendar.manage", "callups.manage", "reports.view", "media.manage", "recruitment.manage",
    ],
  },
  assistant_coach: {
    name: "Auxiliar técnico",
    rank: 50,
    permissions: [
      "dashboard.view", "players.view", "matches.view", "stats.view", "stats.manage",
      "lineups.view", "lineups.manage", "competitions.view", "announcements.view", "callups.manage", "reports.view",
    ],
  },
  analyst: {
    name: "Analista",
    rank: 40,
    permissions: [
      "dashboard.view", "players.view", "matches.view", "stats.view", "stats.manage",
      "lineups.view", "competitions.view", "announcements.view", "reports.view", "gamedata.manage",
    ],
  },
  player: {
    name: "Jogador",
    rank: 20,
    permissions: [
      "dashboard.view", "players.view", "matches.view", "stats.view", "lineups.view",
      "competitions.view", "announcements.view", "availability.self",
    ],
  },
  visitor: { name: "Visitante", rank: 0, permissions: [] },
};

export function permissionsForRoles(roles: readonly RoleKey[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) for (const p of ROLES[r].permissions) set.add(p);
  return set;
}

export function highestRank(roles: readonly RoleKey[]): number {
  return roles.reduce((max, r) => Math.max(max, ROLES[r].rank), -1);
}

/**
 * Whether an actor holding `actorRoles` may grant or revoke `target` role.
 * - President may manage every role.
 * - Others need `users.manage` and may only manage roles strictly below Administrator
 *   and strictly below their own rank.
 */
export function canManageRole(actorRoles: readonly RoleKey[], target: RoleKey): boolean {
  if (actorRoles.includes("president")) return true;
  const perms = permissionsForRoles(actorRoles);
  if (!perms.has("users.manage")) return false;
  return ROLES[target].rank < ROLES.admin.rank && ROLES[target].rank < highestRank(actorRoles);
}

/**
 * Validates a change of a member's roles. Returns an error message or null.
 * Rules: actor must be able to manage every role added or removed; non-presidents
 * cannot touch members whose rank is >= their own; the club must keep at least
 * one president; nobody edits their own roles (prevents self-escalation).
 */
export function checkRoleChange(opts: {
  actorRoles: readonly RoleKey[];
  targetRoles: readonly RoleKey[];
  newRoles: readonly RoleKey[];
  isSelf: boolean;
  presidentCount: number;
}): string | null {
  const { actorRoles, targetRoles, newRoles, isSelf, presidentCount } = opts;
  if (isSelf) return "Você não pode alterar os próprios cargos.";
  const actorIsPresident = actorRoles.includes("president");
  if (!actorIsPresident && highestRank(targetRoles) >= highestRank(actorRoles)) {
    return "Você não pode alterar membros com cargo igual ou superior ao seu.";
  }
  const added = newRoles.filter((r) => !targetRoles.includes(r));
  const removed = targetRoles.filter((r) => !newRoles.includes(r));
  for (const r of [...added, ...removed]) {
    if (!canManageRole(actorRoles, r)) return `Você não pode atribuir ou remover o cargo ${ROLES[r].name}.`;
  }
  if (removed.includes("president") && presidentCount <= 1) return "O clube precisa ter ao menos um Presidente.";
  return null;
}
