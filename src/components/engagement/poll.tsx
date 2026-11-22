"use client";
import { useOptimistic, useTransition } from "react";
import { motion } from "motion/react";
import { votePollAction } from "@/server/actions/engagement";
import { cn } from "@/lib/cn";
import type { PollView } from "@/server/services/polls";

export function PollWidget({ announcementId, poll, canVote }: { announcementId: string; poll: PollView; canVote: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useOptimistic(poll, (s: PollView, idx: number) => {
    const counts = [...s.counts];
    if (s.myVote != null) counts[s.myVote]--;
    counts[idx]++;
    return { ...s, counts, myVote: idx, total: s.myVote == null ? s.total + 1 : s.total };
  });
  const voted = state.myVote != null;
  return (
    <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900/60 p-3">
      <p className="mb-2 text-sm font-semibold">{state.question}</p>
      <div className="space-y-1.5">
        {state.options.map((o, i) => {
          const pct = state.total ? Math.round((state.counts[i] / state.total) * 100) : 0;
          const mine = state.myVote === i;
          return (
            <button key={i} type="button" disabled={!canVote || pending}
              onClick={() => start(async () => { setState(i); navigator.vibrate?.(10); await votePollAction(announcementId, i); })}
              className={cn("relative flex w-full items-center justify-between overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition active:scale-[0.99]",
                mine ? "border-accent-500 font-semibold" : "border-ink-700 hover:border-accent-500/60", !canVote && "cursor-default")}>
              {voted && <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-accent-500/15" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />}
              <span className="relative">{o}{mine && " ✓"}</span>
              {voted && <span className="relative font-display font-bold tabular-nums">{pct}%</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-400">{state.total} voto(s){voted && canVote ? " · toque em outra opção para mudar" : ""}</p>
    </div>
  );
}
