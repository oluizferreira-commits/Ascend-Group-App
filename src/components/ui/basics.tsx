import { cn } from "@/lib/cn";
import type { MatchResult } from "@/lib/domain";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2 flex items-center gap-2"><span className="inline-block h-3 w-1 bg-accent-500" />{eyebrow}</p>}
        <h1 className="font-display text-4xl font-bold tracking-[0.03em] text-ink-100 uppercase sm:text-5xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-bold tracking-[0.1em] text-ink-100 uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-600 bg-ink-900/50 px-6 py-10 text-center">
      <p className="font-display text-base font-semibold tracking-wider text-ink-300 uppercase">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-400">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "gold" | "wine" | "win" | "loss" | "draw"; className?: string }) {
  const tones = {
    neutral: "border-ink-600 bg-ink-800 text-ink-300",
    gold: "border-accent-500/40 bg-accent-500/10 text-accent-400",
    wine: "border-brand-700 bg-brand-900 text-brand-400",
    win: "border-win/40 bg-win/10 text-win",
    loss: "border-loss/40 bg-loss/10 text-loss",
    draw: "border-ink-500 bg-ink-700/50 text-ink-300",
  };
  return <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase", tones[tone], className)}>{children}</span>;
}

export function ResultPill({ result, className }: { result: MatchResult; className?: string }) {
  const map = { W: ["V", "bg-win text-white"], D: ["E", "bg-draw text-white"], L: ["D", "bg-loss text-white"] } as const;
  return (
    <span className={cn("inline-grid size-7 place-items-center rounded font-display text-sm font-bold", map[result][1], className)} title={{ W: "Vitória", D: "Empate", L: "Derrota" }[result]}>
      {map[result][0]}
    </span>
  );
}

export function StatTile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: "gold" | "win" | "loss" | "draw" }) {
  const color = { gold: "text-accent-400", win: "text-win", loss: "text-loss", draw: "text-ink-300" };
  return (
    <div className="card p-4">
      <p className="font-display text-xs font-semibold tracking-[0.14em] text-ink-400 uppercase">{label}</p>
      <p className={cn("mt-1 font-display text-4xl font-bold tabular-nums", accent ? color[accent] : "text-ink-100")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn("shrink-0 rounded-full border border-ink-600 object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1c3fb0] to-[#0c1d4f] font-display font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}
