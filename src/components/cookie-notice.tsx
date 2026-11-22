"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ascend_cookie_notice";

/** Informative notice — only essential cookies are used, so there is nothing to opt into. */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = "1";
    try { seen = localStorage.getItem(KEY) ?? ""; } catch { /* private mode: don't nag */ }
    const t = setTimeout(() => setShow(!seen), 0);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="scope-dark glass-dark fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-lg flex-col gap-3 rounded-2xl border p-4 text-sm text-ink-300 sm:flex-row sm:items-center lg:bottom-6" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <p className="flex-1">
        Usamos apenas <b className="text-ink-100">cookies essenciais</b> para login e preferências — sem anúncios ou rastreamento.{" "}
        <Link href="/privacidade#cookies" className="text-accent-300 underline">Saiba mais</Link>
      </p>
      <button className="btn-primary shrink-0" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setShow(false); }}>Entendi</button>
    </div>
  );
}
