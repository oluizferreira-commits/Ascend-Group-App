import { AlertTriangle, Pin } from "lucide-react";
import { Badge } from "@/components/ui/basics";
import { ANNOUNCEMENT_CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { schema } from "@/db";
import type { PollView } from "@/server/services/polls";
import { PollWidget } from "@/components/engagement/poll";

type A = typeof schema.announcements.$inferSelect;

export function AnnouncementCard({ a, compact, poll, canVote = false }: { a: A; compact?: boolean; poll?: PollView; canVote?: boolean }) {
  const urgent = a.priority === "urgent";
  const high = a.priority === "high";
  return (
    <article className={cn("relative overflow-hidden rounded-xl border p-4 pl-5", urgent ? "border-loss/45 bg-loss/[0.06]" : "tile")}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", urgent ? "bg-loss" : high ? "bg-[#3a63f0]" : "bg-ink-600")} />
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {urgent && <AlertTriangle className="size-4 text-loss" aria-label="Urgente" />}
        {a.pinned && <Pin className="size-3.5 text-accent-400" aria-label="Fixado" />}
        <Badge tone={urgent ? "loss" : high ? "gold" : "neutral"}>{PRIORITY_LABELS[a.priority]}</Badge>
        <Badge tone="wine">{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
        <time className="ml-auto text-[11px] text-ink-400 tabular-nums">{fmtDateTime(a.publishedAt)}</time>
      </div>
      <h4 className="font-display text-lg leading-snug font-bold tracking-wide text-ink-100">{a.title}</h4>
      <p className={cn("mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-300", compact && "line-clamp-3")}>{a.body}</p>
      {poll && <PollWidget announcementId={a.id} poll={poll} canVote={canVote} />}
      {a.expiresAt && <p className="mt-2 text-xs text-ink-400">Válido até {fmtDateTime(a.expiresAt)}</p>}
    </article>
  );
}
