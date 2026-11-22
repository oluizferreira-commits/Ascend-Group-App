import { cn } from "@/lib/cn";

export function OverallTrend({ trend, synced, className }: { trend: { delta: number; days: number } | null; synced?: Date | null; className?: string }) {
  if (!trend && !synced) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2 text-xs", className)}>
      {trend && (
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", trend.delta > 0 ? "bg-win/15 text-win" : "bg-loss/15 text-loss")}>
          {trend.delta > 0 ? "▲" : "▼"} {trend.delta > 0 ? "+" : ""}{trend.delta} no overall · {trend.days} dias
        </span>
      )}
      {synced && <span className="opacity-80">Overall sincronizado com a EA</span>}
    </span>
  );
}
