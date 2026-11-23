"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshEaAction, type RefreshState } from "@/server/actions/ea-refresh";
import { cn } from "@/lib/cn";

function ago(ms: number) {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} d`;
}

/** "Atualizar agora" — pulls the latest matches from EA on demand and shows when data was last updated. */
export function RefreshEaButton({ lastAt, serverNow, compact, className }: { lastAt: string | null; serverNow: number; compact?: boolean; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<RefreshState | null>(null);
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!res) return; const id = setTimeout(() => setRes(null), 6000); return () => clearTimeout(id); }, [res]);
  const last = res?.ok ? res.at : lastAt ? new Date(lastAt).getTime() : null;

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <button type="button" disabled={pending}
        onClick={() => start(async () => { const r = await refreshEaAction(); setRes(r); setNow(Date.now()); if (r.ok) router.refresh(); })}
        className={cn("btn-secondary gap-1.5", compact ? "min-h-8 px-2.5 py-1 text-xs" : "min-h-9 px-3 text-sm")}
        aria-label="Atualizar agora com a EA">
        <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        {pending ? "Atualizando…" : "Atualizar agora"}
      </button>
      <p role="status" aria-live="polite" className={cn("max-w-64 text-right text-[11px] leading-tight", res ? (res.ok ? "text-win" : "text-ink-300") : "text-ink-400")}>
        {res ? res.message : last ? `Dados da EA atualizados ${ago(now - last)}` : "Ainda sem sincronização com a EA"}
      </p>
    </div>
  );
}
