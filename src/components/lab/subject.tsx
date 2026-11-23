import Link from "next/link";
import { Eye, Lock } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui/basics";
import { POSITION_LABELS, POSITION_NAMES } from "@/lib/domain";
import type { LabPlayer, LabSubject } from "@/server/services/lab";

/** Whose Lab this is. Staff get a read-only badge and a player switcher. */
export function SubjectBar({ player, own, canPick, players, path }: { player: LabPlayer; own: boolean; canPick: boolean; players?: LabPlayer[]; path: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <Avatar name={player.nickname} src={player.avatarUrl} size={40} className="ring-2 ring-accent-500/30" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-tight font-bold text-ink-100 uppercase">{player.nickname}{player.shirtNumber != null && <span className="ml-2 text-accent-400">#{player.shirtNumber}</span>}</p>
        <p className="text-xs text-ink-400">{POSITION_NAMES[player.primaryPosition]} · {own ? "Seu laboratório — só você e a comissão técnica veem" : "Relatório individual"}</p>
      </div>
      {!own && <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-500"><Eye className="size-3.5" />Somente leitura</span>}
      {canPick && players && (
        <form method="get" action={path} className="flex gap-2">
          <select name="jogador" defaultValue={player.id} className="input min-h-9 py-1 text-sm" aria-label="Ver o Lab de outro jogador">
            {players.map((p) => <option key={p.id} value={p.id}>{p.shirtNumber != null ? `#${p.shirtNumber} ` : ""}{p.nickname} ({POSITION_LABELS[p.primaryPosition]})</option>)}
          </select>
          <button className="btn-secondary min-h-9 px-3 text-sm">Ver</button>
        </form>
      )}
    </div>
  );
}

/** Shown when there is no player to analyse (staff picks one; others get an explanation). */
export function LabGate({ subj, path }: { subj: Exclude<LabSubject, { kind: "player" }>; path: string }) {
  if (subj.kind === "pick") {
    return (
      <section>
        <p className="mb-3 text-sm text-ink-300">Escolha um jogador para ver o relatório individual. Os relatórios são visíveis apenas para a comissão e para o próprio jogador.</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subj.players.map((p) => (
            <li key={p.id}>
              <Link href={`${path}?jogador=${p.id}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-[var(--line-strong)]">
                <Avatar name={p.nickname} src={p.avatarUrl} size={36} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.nickname}</span><span className="text-xs text-ink-400">{POSITION_NAMES[p.primaryPosition]}</span></span>
                {p.shirtNumber != null && <span className="font-display text-lg font-bold text-accent-400">#{p.shirtNumber}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <EmptyState title="Seu Lab ainda não está disponível">
      <span className="inline-flex items-center gap-1"><Lock className="size-3.5" />O Performance Lab é individual: peça à diretoria para vincular sua conta ao seu cadastro de jogador.</span>
    </EmptyState>
  );
}
