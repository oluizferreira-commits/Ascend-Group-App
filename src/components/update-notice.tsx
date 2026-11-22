"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";

const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const SEEN_KEY = "ascend_seen_version";
const CHECK_EVERY_MS = 60_000;

async function hardReload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
    if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    // ignore — a normal reload still picks up the new version
  }
  window.location.reload();
}

/** Shows a banner when a newer deployment is live, and "what's new" once after updating. */
export function UpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showNews, setShowNews] = useState(false);

  const check = useCallback(async () => {
    if (CURRENT === "dev" || document.visibilityState !== "visible") return;
    try {
      const r = await fetch("/api/version", { cache: "no-store" });
      const { version } = await r.json();
      if (version && version !== CURRENT) setAvailable(true);
    } catch {
      // offline — try again later
    }
  }, []);

  useEffect(() => {
    let seen: string | null = null;
    try { seen = localStorage.getItem(SEEN_KEY); localStorage.setItem(SEEN_KEY, CURRENT); } catch { /* private mode */ }
    // first visit ever: don't show news; after an update: show it once
    const t = setTimeout(() => { if (seen && seen !== CURRENT && CHANGELOG.length) setShowNews(true); }, 0);
    const id = setInterval(check, CHECK_EVERY_MS);
    const onVis = () => check();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => { clearTimeout(t); clearInterval(id); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", onVis); };
  }, [check]);

  const latest = CHANGELOG[0];
  return (
    <>
      {available && (
        <div role="status" className="scope-dark glass-dark fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border p-3 text-ink-100 lg:bottom-6" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <RefreshCw className="size-5 shrink-0 text-accent-300" />
          <p className="flex-1 text-sm"><b>Nova versão disponível.</b> Atualize para ver as novidades.</p>
          <button className="btn bg-white text-[#0c1d4f] hover:bg-[#e6ecfd]" disabled={busy} onClick={() => { setBusy(true); hardReload(); }}>
            {busy ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      )}
      {showNews && latest && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="news-title">
          <div className="glass w-full max-w-md rounded-2xl p-6">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="eyebrow flex items-center gap-1.5"><Sparkles className="size-3.5" />App atualizado</p>
                <h2 id="news-title" className="mt-1 font-display text-2xl font-bold uppercase">{latest.title}</h2>
              </div>
              <button className="btn-ghost px-2" onClick={() => setShowNews(false)} aria-label="Fechar"><X className="size-5" /></button>
            </div>
            <ul className="space-y-2 text-sm text-ink-300">
              {latest.items.map((i) => <li key={i} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-500" />{i}</li>)}
            </ul>
            <button className="btn-primary mt-5 w-full" onClick={() => setShowNews(false)}>Entendi</button>
          </div>
        </div>
      )}
    </>
  );
}
