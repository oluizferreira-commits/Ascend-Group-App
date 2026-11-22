"use client";
import { useState } from "react";
import { Download, Share2 } from "lucide-react";

/** Shares a generated PNG with the phone's native share sheet (Instagram, WhatsApp…), falling back to download. */
export function ShareImageButton({ url, filename, title, className, label = "Compartilhar" }: { url: string; filename: string; title: string; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Não foi possível gerar a imagem.");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={go} disabled={busy} className={className ?? "btn-primary"}>
        {canShare ? <Share2 className="size-4" /> : <Download className="size-4" />}{busy ? "Gerando…" : label}
      </button>
      {err && <span className="text-xs text-loss">{err}</span>}
    </span>
  );
}
