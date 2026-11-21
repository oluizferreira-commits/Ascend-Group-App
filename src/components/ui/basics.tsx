import { cn } from "@/lib/cn";
import type { MatchResult } from "@/lib/domain";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-wide text-ink-100 uppercase sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-semibold tracking-wider text-ink-100 uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-600 px-6 py-10 text-center">
      <p className="font-display text-base font-semibold tracking-wider text-ink-300 uppercase">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-400">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "gold" | "wine" | "win" | "loss" | "draw"; className?: string }) {
  const tones = {
    neutral: "border-ink-600 bg-ink-800 text-ink-300",
    gold: "border-gold-600/50 bg-gold-500/10 text-gold-300",
    wine: "border-wine-600/60 bg-wine-900/60 text-wine-400",
    win: "border-win/40 bg-win/10 text-green-300",
    loss: "border-loss/40 bg-loss/10 text-red-300",
    draw: "border-ink-500 bg-ink-700/50 text-ink-300",
  };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function ResultPill({ result, className }: { result: MatchResult; className?: string }) {
  const map = { W: ["V", "bg-win text-ink-950"], D: ["E", "bg-draw text-ink-950"], L: ["D", "bg-loss text-white"] } as const;
  return (
    <span className={cn("inline-grid size-7 place-items-center rounded-md font-display text-sm font-bold", map[result][1], className)} title={{ W: "Vitória", D: "Empate", L: "Derrota" }[result]}>
      {map[result][0]}
    </span>
  );
}

export function StatTile({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: "gold" | "win" | "loss" | "draw" }) {
  const color = { gold: "text-gold-300", win: "text-green-300", loss: "text-red-300", draw: "text-ink-300" };
  return (
    <div className="card p-4">
      <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">{label}</p>
      <p className={cn("mt-1 font-display text-3xl font-bold", accent ? color[accent] : "text-ink-100")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn("shrink-0 rounded-full border border-gold-600/40 object-cover", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full border border-gold-600/40 bg-gradient-to-br from-wine-800 to-ink-800 font-display font-semibold text-gold-300", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "?"}
    </span>
  );
}
