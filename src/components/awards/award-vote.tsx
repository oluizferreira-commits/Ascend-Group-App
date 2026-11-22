"use client";
import { useOptimistic, useState, useTransition } from "react";
import { motion } from "motion/react";
import { voteAwardAction } from "@/server/actions/awards";
import { Avatar } from "@/components/ui/basics";
import { cn } from "@/lib/cn";

type Cand = { id: string; nickname: string; shirtNumber: number | null; position: string; avatarUrl: string | null; votes: number; line: string };

export function AwardVote({ editionId, candidates, myVote, open, total, selfId, winnerId }: {
  editionId: string; candidates: Cand[]; myVote: string | null; open: boolean; total: number; selfId: string | null; winnerId: string | null;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [vote, setVote] = useOptimistic(myVote);
  const showResults = !!vote || !open;
  const totalShown = total + (vote && !myVote ? 1 : 0);
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {candidates.map((c) => {
          const mine = vote === c.id;
          const votes = c.votes + (mine && myVote !== c.id ? 1 : 0) - (myVote === c.id && vote !== c.id ? 1 : 0);
          const pct = totalShown ? Math.round((votes / totalShown) * 100) : 0;
          const disabled = !open || pending || c.id === selfId;
          return (
            <li key={c.id}>
              <button type="button" disabled={disabled}
                onClick={() => start(async () => { setErr(null); setVote(c.id); navigator.vibrate?.(12); const r = await voteAwardAction(editionId, c.id); if (!r.ok) setErr(r.error); })}
                className={cn("relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition active:scale-[0.98]",
                  mine ? "border-accent-500 bg-accent-500/10" : "border-ink-700 bg-ink-900 hover:border-accent-500/60",
                  winnerId === c.id && "border-accent-400 ring-2 ring-accent-400/40")}>
                {showResults && <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-accent-500/15" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />}
                <span className="relative"><Avatar name={c.nickname} src={c.avatarUrl} size={44} /></span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.shirtNumber != null && <span className="mr-1 text-accent-400">#{c.shirtNumber}</span>}{c.nickname}{c.id === selfId && <span className="ml-1 text-xs font-normal text-ink-400">(você)</span>}</span>
                  <span className="block truncate text-xs text-ink-400">{c.position} · {c.line}</span>
                </span>
                {showResults && <span className="relative font-display text-lg font-bold tabular-nums">{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {err && <p className="mt-2 text-sm text-loss">{err}</p>}
      {vote && open && <p className="mt-2 text-xs text-ink-400">Voto registrado — você pode mudar até o encerramento.</p>}
      {showResults && <p className="mt-1 text-xs text-ink-400">{totalShown} voto(s)</p>}
    </div>
  );
}
