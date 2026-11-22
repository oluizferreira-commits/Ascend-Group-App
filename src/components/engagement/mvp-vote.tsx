"use client";
import { useOptimistic, useState, useTransition } from "react";
import { Crown } from "lucide-react";
import { motion } from "motion/react";
import { voteMvpAction } from "@/server/actions/engagement";
import { Avatar } from "@/components/ui/basics";
import { cn } from "@/lib/cn";

type Cand = { id: string; nickname: string; shirtNumber: number | null; position: string; avatarUrl: string | null; votes: number };

export function MvpVote({ matchId, candidates, myVote, open, closesAtLabel, total, winners, selfId }: {
  matchId: string; candidates: Cand[]; myVote: string | null; open: boolean; closesAtLabel: string | null; total: number; winners: string[]; selfId: string | null;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [vote, setVote] = useOptimistic(myVote);
  const showResults = !!vote || !open;
  const totalShown = total + (vote && !myVote ? 1 : 0);

  return (
    <div>
      <p className="mb-3 text-sm text-ink-400">
        {open ? <>Todo o elenco e a comissão votam. {closesAtLabel && <>Encerra {closesAtLabel}.</>}</> : <>Votação encerrada · {total} voto(s).</>}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {candidates.map((c) => {
          const mine = vote === c.id;
          const votes = c.votes + (mine && myVote !== c.id ? 1 : 0) - (myVote === c.id && vote !== c.id ? 1 : 0);
          const pct = totalShown ? Math.round((votes / totalShown) * 100) : 0;
          const winner = !open && winners.includes(c.id);
          const disabled = !open || pending || c.id === selfId;
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => start(async () => {
                  setErr(null);
                  setVote(c.id);
                  const r = await voteMvpAction(matchId, c.id);
                  if (!r.ok) setErr(r.error);
                })}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-3 text-left transition active:scale-[0.98]",
                  mine ? "border-accent-500 bg-accent-500/10" : "border-ink-700 bg-ink-900 hover:border-accent-500/60",
                  winner && "border-accent-400 ring-2 ring-accent-400/40",
                  disabled && !mine && "cursor-default",
                )}
              >
                {showResults && (
                  <motion.span aria-hidden className="absolute inset-y-0 left-0 bg-accent-500/15" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                )}
                <span className="relative"><Avatar name={c.nickname} src={c.avatarUrl} size={40} /></span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.shirtNumber != null && <span className="mr-1 text-accent-400">#{c.shirtNumber}</span>}{c.nickname}</span>
                  <span className="block text-xs text-ink-400">{c.position}{c.id === selfId ? " · você" : ""}</span>
                </span>
                {winner && <Crown className="relative size-5 text-accent-400" aria-label="Craque da partida" />}
                {showResults && <span className="relative font-display text-lg font-bold tabular-nums">{pct}%</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {err && <p className="mt-2 text-sm text-loss">{err}</p>}
      {vote && open && <p className="mt-2 text-xs text-ink-400">Você pode mudar seu voto até o encerramento.</p>}
    </div>
  );
}
