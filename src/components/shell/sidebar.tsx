"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, CalendarDays, GitCompareArrows, CalendarRange, ClipboardList, Image as ImageIcon, LayoutDashboard, LogOut, Medal, Megaphone, Menu,
  RefreshCw, ScrollText, Shield, SlidersHorizontal, Swords, Trophy, User, UserCheck, UserCircle, UserPlus, Users, X,
} from "lucide-react";
import { Crest } from "@/components/crest";
import { cn } from "@/lib/cn";
import type { NavItem } from "./nav";
import { logoutAction } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { motion } from "motion/react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard, users: Users, swords: Swords, trophy: Trophy, megaphone: Megaphone,
  clipboard: ClipboardList, refresh: RefreshCw, medal: Medal, calendar: CalendarDays, image: ImageIcon,
  shield: Shield, "calendar-range": CalendarRange, sliders: SlidersHorizontal, scroll: ScrollText, "user-check": UserCheck, "user-plus": UserPlus, user: User, compare: GitCompareArrows,
};

type Section = { section: string; items: NavItem[] };

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
}

function NavList({ sections, onNavigate }: { sections: Section[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6" aria-label="Navegação principal">
      {sections.map((s) => (
        <div key={s.section}>
          <p className="mb-2 px-3 font-display text-[11px] font-semibold tracking-[0.24em] text-ink-500 uppercase">{s.section}</p>
          <ul className="space-y-0.5">
            {s.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const Glyph = item.number != null
                ? () => <span className="relative grid size-5 place-items-center rounded bg-[#1c3fb0] font-display text-[11px] font-bold text-white">{item.number}</span>
                : null;
              if (item.soon) {
                return (
                  <li key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-400/70" title="Módulo em desenvolvimento">
                    <Icon className="size-4" />
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded border border-ink-700 px-1.5 text-[10px]">{item.soon}</span>
                  </li>
                );
              }
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                      active ? "text-white" : "text-ink-400 hover:bg-white/[0.04] hover:text-ink-100",
                    )}
                  >
                    {active && <motion.span layoutId={onNavigate ? "nav-active-m" : "nav-active"} className="absolute inset-0 rounded-md bg-white/[0.06]"><span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-[#3a63f0]" /></motion.span>}
                    {Glyph ? <Glyph /> : <Icon className={cn("relative size-4", active && "text-accent-400")} />}
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserBox({ name, roles, theme }: { name: string; roles: string; theme: "system" | "light" | "dark" }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <Link href="/app/conta" className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/[0.04]">
        <UserCircle className="size-8 text-silver" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-ink-400">{roles}</span>
        </span>
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <form action={logoutAction}>
          <button className="btn-ghost justify-start text-xs"><LogOut className="size-4" /> Sair</button>
        </form>
        <ThemeToggle initial={theme} showLabel />
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/app" className="flex items-center gap-3 px-2">
      <Crest size={42} />
      <span className="leading-none">
        <span className="block font-display text-xl font-bold tracking-[0.08em] text-white uppercase">Ascend CF</span>
        <span className="mt-1 block font-display text-[10px] font-semibold tracking-[0.3em] text-silver uppercase">Ascend Group</span>
      </span>
    </Link>
  );
}

function BellLink({ unread }: { unread: number }) {
  return (
    <Link href="/app/notificacoes" className="btn-ghost relative px-2" aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}>
      <Bell className="size-5" />
      {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-ink-950">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

export function Sidebar({ sections, userName, roleNames, unread, theme }: { sections: Section[]; userName: string; roleNames: string; unread: number; theme: "system" | "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="scope-dark fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-[#060a16] px-3 py-5 text-ink-100 lg:flex">
        <div className="flex items-center justify-between"><Brand /><BellLink unread={unread} /></div>
        <div className="accent-rule my-5" />
        <div className="flex-1 overflow-y-auto"><NavList sections={sections} /></div>
        <UserBox name={userName} roles={roleNames} theme={theme} />
      </aside>

      {/* Mobile top bar */}
      <header className="scope-dark glass-dark sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 text-ink-100 lg:hidden" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <Brand />
        <div className="flex items-center gap-1"><BellLink unread={unread} />
        <button onClick={() => setOpen(true)} className="btn-ghost px-2" aria-label="Abrir menu" aria-expanded={open}>
          <Menu className="size-6" />
        </button></div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="scope-dark glass-dark absolute inset-y-2 right-2 flex w-80 max-w-[85vw] flex-col rounded-2xl border px-3 py-5 text-ink-100 animate-rise">
            <div className="mb-4 flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} className="btn-ghost px-2" aria-label="Fechar menu"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavList sections={sections} onNavigate={() => setOpen(false)} /></div>
            <UserBox name={userName} roles={roleNames} theme={theme} />
          </div>
        </div>
      )}
    </>
  );
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Atalhos"
      className="glass fixed inset-x-3 z-30 grid rounded-2xl p-1.5 lg:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-colors", active ? "text-white" : "text-ink-400 active:text-ink-100")}>
            {active && <motion.span layoutId="tab-active" className="absolute inset-0 rounded-xl bg-[#1c3fb0] shadow-[0_6px_16px_-6px_rgb(28_63_176/0.8)]" />}
            {item.number != null
              ? <span className={cn("relative grid size-5 place-items-center font-display text-[17px] leading-none font-bold", active ? "text-white" : "text-accent-400")}>{item.number}</span>
              : <Icon className="relative size-5" />}
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
