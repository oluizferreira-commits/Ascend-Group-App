import { AlertTriangle, Pin } from "lucide-react";
import { Badge } from "@/components/ui/basics";
import { ANNOUNCEMENT_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { schema } from "@/db";

type A = typeof schema.announcements.$inferSelect;

export function AnnouncementCard({ a, compact }: { a: A; compact?: boolean }) {
  const urgent = a.priority === "urgent";
  return (
    <article className={cn("rounded-lg border p-4", urgent ? "border-loss/50 bg-wine-950/60" : "border-ink-700 bg-ink-850/60")}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        {urgent && <AlertTriangle className="size-4 text-red-300" aria-label="Urgente" />}
        {a.pinned && <Pin className="size-3.5 text-gold-400" aria-label="Fixado" />}
        <Badge tone={urgent ? "loss" : a.priority === "high" ? "gold" : "neutral"}>{PRIORITY_LABELS[a.priority]}</Badge>
        <Badge tone="wine">{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
        <span className="ml-auto text-xs text-ink-400">{fmtDateTime(a.publishedAt)}</span>
      </div>
      <h4 className="font-semibold">{a.title}</h4>
      <p className={cn("mt-1 text-sm whitespace-pre-line text-ink-300", compact && "line-clamp-3")}>{a.body}</p>
      {a.expiresAt && <p className="mt-2 text-xs text-ink-400">Válido até {fmtDateTime(a.expiresAt)}</p>}
    </article>
  );
}
