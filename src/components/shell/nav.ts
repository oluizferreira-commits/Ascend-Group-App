import type { Permission } from "@/server/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission?: Permission; soon?: string; number?: number | null };

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Clube",
    items: [
      { href: "/app", label: "Painel", icon: "layout-dashboard", permission: "dashboard.view" },
      { href: "/app/elenco", label: "Elenco", icon: "users", permission: "players.view" },
      { href: "/app/partidas", label: "Partidas", icon: "swords", permission: "matches.view" },
      { href: "/app/escalacoes", label: "Escalações", icon: "clipboard", permission: "lineups.view" },
      { href: "/app/comparar", label: "Comparar", icon: "compare", permission: "stats.view" },
      { href: "/app/rankings", label: "Rankings", icon: "trophy", permission: "stats.view" },
      { href: "/app/avisos", label: "Avisos", icon: "megaphone", permission: "announcements.view" },
      { href: "/app/calendario", label: "Calendário", icon: "calendar", permission: "dashboard.view" },
      { href: "/app/competicoes", label: "Competições", icon: "medal", permission: "competitions.view" },
      { href: "/app/disponibilidade", label: "Disponibilidade", icon: "user-check", permission: "dashboard.view" },
    ],
  },
  {
    section: "Administração",
    items: [
      { href: "/app/propostas", label: "Seja do Ascend", icon: "user-plus", permission: "recruitment.manage" },
      { href: "/app/midia", label: "Central de mídia", icon: "image", permission: "media.manage" },
      { href: "/app/integracao", label: "Integração EA FC", icon: "refresh", permission: "integration.manage" },
      { href: "/app/admin/usuarios", label: "Usuários e cargos", icon: "shield", permission: "users.manage" },
      { href: "/app/admin/temporadas", label: "Temporadas", icon: "calendar-range", permission: "seasons.manage" },
      { href: "/app/admin/avaliacao", label: "Critérios de avaliação", icon: "sliders", permission: "ratings.configure" },
      { href: "/app/admin/auditoria", label: "Auditoria", icon: "scroll", permission: "audit.view" },
    ],
  },
];
