import type { Permission } from "@/server/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission?: Permission; soon?: string };

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Clube",
    items: [
      { href: "/app", label: "Painel", icon: "layout-dashboard", permission: "dashboard.view" },
      { href: "/app/elenco", label: "Elenco", icon: "users", permission: "players.view" },
      { href: "/app/partidas", label: "Partidas", icon: "swords", permission: "matches.view" },
      { href: "/app/rankings", label: "Rankings", icon: "trophy", permission: "stats.view" },
      { href: "/app/avisos", label: "Avisos", icon: "megaphone", permission: "announcements.view" },
    ],
  },
  {
    section: "Em construção",
    items: [
      { href: "#", label: "Escalações e táticas", icon: "clipboard", soon: "Fase 3" },
      { href: "#", label: "Integração EA FC", icon: "refresh", soon: "Fase 4" },
      { href: "#", label: "Competições", icon: "medal", soon: "Fase 5" },
      { href: "#", label: "Calendário", icon: "calendar", soon: "Fase 5" },
      { href: "#", label: "Central de mídia", icon: "image", soon: "Fase 7" },
    ],
  },
  {
    section: "Administração",
    items: [
      { href: "/app/admin/usuarios", label: "Usuários e cargos", icon: "shield", permission: "users.manage" },
      { href: "/app/admin/temporadas", label: "Temporadas", icon: "calendar-range", permission: "seasons.manage" },
      { href: "/app/admin/avaliacao", label: "Critérios de avaliação", icon: "sliders", permission: "ratings.configure" },
      { href: "/app/admin/auditoria", label: "Auditoria", icon: "scroll", permission: "audit.view" },
    ],
  },
];
