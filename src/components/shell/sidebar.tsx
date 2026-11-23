"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, Award, Bell, CalendarDays, GitCompareArrows, CalendarRange, ClipboardList, Image as ImageIcon, LayoutDashboard, LogOut, Medal, Megaphone, Menu,
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
  shield: Shield, "calendar-range": CalendarRange, sliders: SlidersHorizontal, scroll: ScrollText, "user-check": UserCheck, "user-plus": UserPlus, user: User, compare: GitCompareArrows, award: Award, activity: Activity,
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

function Brand({ motto }: { motto?: boolean }) {
  return (
    <Link href="/app" className="flex min-w-0 items-center gap-3 px-1">
      <Crest size={40} clear />
      <span aria-hidden className="h-8 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent" />
      <span className="min-w-0 leading-none">
        <span className="block truncate font-display text-[21px] font-bold tracking-[0.06em] text-white uppercase italic">Ascend CF</span>
        <span className="mt-1 block truncate font-display text-[10px] font-semibold tracking-[0.34em] text-silver uppercase">Ascend Group</span>
      </span>
      {motto && <span className="ml-4 hidden font-display text-[11px] font-semibold tracking-[0.3em] text-silver/80 uppercase sm:inline">Rise. Conquer. Ascend.</span>}
    </Link>
  );
}

const iconBtn = "relative grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-ink-200 transition hover:border-white/25 hover:text-white active:scale-95";

function BellLink({ unread }: { unread: number }) {
  return (
    <Link href="/app/notificacoes" className={iconBtn} aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ""}`}>
      <Bell className="size-[19px]" />
      {unread > 0 && <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-[#060a16] bg-[#3a63f0] px-1 text-[10px] leading-none font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

export function Sidebar({ sections, userName, roleNames, unread, theme }: { sections: Section[]; userName: string; roleNames: string; unread: number; theme: "system" | "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="scope-dark fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-[#060a16] px-3 py-5 text-ink-100 lg:flex">
        <div className="flex items-center justify-between gap-2"><Brand /><BellLink unread={unread} /></div>
        <div className="accent-rule my-5" />
        <div className="flex-1 overflow-y-auto"><NavList sections={sections} /></div>
        <UserBox name={userName} roles={roleNames} theme={theme} />
      </aside>

      {/* Mobile top bar */}
      <header className="scope-dark glass-dark sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-2.5 text-ink-100 lg:hidden" style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}>
        <Brand motto />
        <div className="flex shrink-0 items-center gap-2"><BellLink unread={unread} />
        <button onClick={() => setOpen(true)} className={iconBtn} aria-label="Abrir menu" aria-expanded={open}>
          <Menu className="size-5" />
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
      className="scope-dark glass-dark fixed inset-x-3 z-30 grid rounded-[20px] border p-1.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] lg:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={cn("relative flex min-w-0 flex-col items-center gap-1 rounded-2xl pt-2 pb-1.5 font-semibold transition-colors", items.length > 5 ? "text-[10px]" : "text-[10.5px] tracking-wide", active ? "text-white" : "text-ink-400 active:text-ink-100")}>
            {active && (
              <motion.span layoutId="tab-active" className="absolute inset-0 rounded-2xl border border-[#6f8fff]/40 bg-gradient-to-b from-[#1c3fb0]/80 to-[#0f2566]/80 shadow-[0_0_22px_-6px_rgb(58_99_240/0.9)]">
                <span className="absolute inset-x-5 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              </motion.span>
            )}
            {item.number != null
              ? <span className={cn("relative grid size-[22px] place-items-center font-display text-[19px] leading-none font-bold", active ? "text-white" : "text-accent-400")}>{item.number}</span>
              : <Icon className="relative size-[22px]" />}
            <span className="relative max-w-full truncate px-0.5">{item.short ?? item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
