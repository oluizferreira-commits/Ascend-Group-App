/**
 * Ascend CF design-system building blocks (server-safe, no client JS).
 * Panels, compact stat strips, info chips, result/score badges, date badges and rank markers.
 * Every value comes from props — these components never invent data.
 */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MatchResult } from "@/lib/domain";

type Icon = React.ComponentType<{ className?: string }>;

/** Card with an optional header row (icon + title + action link). */
export function Panel({ title, icon: I, link, extra, className, bodyClassName, children, id, as: Tag = "section" }: {
  title?: React.ReactNode; icon?: Icon; link?: { href: string; label: string }; extra?: React.ReactNode;
  className?: string; bodyClassName?: string; children: React.ReactNode; id?: string; as?: "section" | "article" | "div";
}) {
  return (
    <Tag id={id} className={cn("card min-w-0 overflow-hidden", className)}>
      {title && (
        <header className="flex items-center gap-2.5 border-b px-4 py-3 hairline sm:px-5">
          {I && <I className="size-[18px] shrink-0 text-accent-400" />}
          <h2 className="min-w-0 flex-1 truncate font-display text-[17px] font-bold tracking-[0.08em] text-ink-100 uppercase">{title}</h2>
          {extra}
          {link && (
            <Link href={link.href} className="flex shrink-0 items-center gap-0.5 font-display text-[13px] font-semibold tracking-[0.08em] text-accent-400 uppercase hover:text-accent-300">
              {link.label}<ChevronRight className="size-4" />
            </Link>
          )}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Tag>
  );
}

/** Small pill with icon, label and value (season, division, position…). */
export function InfoChip({ icon: I, label, value, className }: { icon: Icon; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("card flex min-w-0 items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5", className)}>
      <span className="hidden size-9 shrink-0 place-items-center rounded-lg border hairline bg-accent-500/10 text-accent-400 sm:grid"><I className="size-[18px]" /></span>
      <dl className="min-w-0 leading-tight">
        <dt className="kicker flex items-center gap-1 truncate text-[10px] sm:text-[11px]"><I className="size-3 shrink-0 text-accent-400 sm:hidden" />{label}</dt>
        <dd className="truncate font-display text-base font-bold text-ink-100 sm:text-lg">{value}</dd>
      </dl>
    </div>
  );
}

/** Compact row of stats separated by hairlines. */
export function StatStrip({ items, className, size = "md" }: {
  items: { label: string; value: React.ReactNode; tone?: "win" | "loss" | "draw" | "accent" }[]; className?: string; size?: "sm" | "md";
}) {
  const tone = { win: "text-win", loss: "text-loss", draw: "text-ink-200", accent: "text-accent-400" };
  return (
    <dl className={cn("tile grid divide-x divide-[var(--line)]", className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className={cn("flex min-w-0 flex-col items-center justify-center px-1 text-center", size === "sm" ? "py-2" : "py-3")}>
          <dd className={cn("font-display leading-none font-bold tabular-nums", size === "sm" ? "text-xl" : "text-[28px]", it.tone ? tone[it.tone] : "text-ink-100")}>{it.value}</dd>
          <dt className="kicker mt-1.5 truncate text-[10px] sm:text-[11px]">{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Coloured result chip (V / E / D). */
export function FormChip({ result, size = 22 }: { result: MatchResult; size?: number }) {
  const map = { W: ["V", "bg-win/15 text-win border-win/40"], D: ["E", "bg-ink-500/15 text-ink-300 border-ink-500/50"], L: ["D", "bg-loss/15 text-loss border-loss/40"] } as const;
  return (
    <span title={{ W: "Vitória", D: "Empate", L: "Derrota" }[result]} style={{ width: size, height: size, fontSize: size * 0.55 }}
      className={cn("inline-grid shrink-0 place-items-center rounded-md border font-display font-bold", map[result][1])}>
      {map[result][0]}
    </span>
  );
}

/** Score box tinted by result. */
export function ScoreBox({ gf, ga, result, size = "md" }: { gf: number; ga: number; result: MatchResult; size?: "md" | "lg" }) {
  const tint = { W: "border-win/45 bg-win/10", D: "border-ink-500/60 bg-ink-500/10", L: "border-loss/45 bg-loss/10" }[result];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg border font-display font-bold tabular-nums text-ink-100", tint, size === "lg" ? "px-4 py-1.5 text-4xl" : "px-2.5 py-0.5 text-xl")}>
      {gf}<span className="text-ink-500">–</span>{ga}
    </span>
  );
}

/** Opponent badge built from the name's initials (we never draw other clubs' crests). */
export function TeamMonogram({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="inline-grid shrink-0 place-items-center rounded-xl border border-[var(--line-strong)] bg-gradient-to-b from-ink-700 to-ink-850 font-display font-bold text-ink-200">
      {initials}
    </span>
  );
}

/** Day/month block for agendas and match lists. */
export function DateBadge({ date, tz = "America/Sao_Paulo", className }: { date: Date; tz?: string; className?: string }) {
  const day = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit" }).format(date);
  const mon = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, month: "short" }).format(date).replace(".", "");
  return (
    <span className={cn("tile inline-flex w-12 shrink-0 flex-col items-center py-1.5 leading-none", className)}>
      <span className="font-display text-xl font-bold text-ink-100 tabular-nums">{day}</span>
      <span className="mt-0.5 font-display text-[10px] font-semibold tracking-[0.14em] text-accent-400 uppercase">{mon}</span>
    </span>
  );
}

/** Rank marker: 1–3 get silver-blue medals, the rest a plain number. */
export function RankMark({ n }: { n: number }) {
  if (n > 3) return <span className="inline-grid w-7 shrink-0 place-items-center font-display text-base font-semibold text-ink-400 tabular-nums">{n}</span>;
  const style = [
    "border-[#bcd0ff]/70 bg-gradient-to-b from-[#3a63f0] to-[#15318a] text-white shadow-[0_0_14px_-2px_rgb(58_99_240/0.7)]",
    "border-[#c9d1dc]/70 bg-gradient-to-b from-[#c9d1dc] to-[#6d7891] text-[#0a1330]",
    "border-[#8b96ad]/60 bg-gradient-to-b from-[#56627a] to-[#2b3650] text-white",
  ][n - 1];
  return <span className={cn("inline-grid size-7 shrink-0 place-items-center rounded-full border font-display text-sm font-bold", style)}>{n}</span>;
}

/** Thin horizontal meter (0–100). */
export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("block h-1 overflow-hidden rounded-full bg-ink-700/70", className)}>
      <span className="block h-full rounded-full bg-gradient-to-r from-[#1c3fb0] to-[#6f8fff]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}
