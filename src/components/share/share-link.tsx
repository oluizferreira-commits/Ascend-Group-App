"use client";
import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Native share sheet for a link (falls back to copying it). */
export function ShareLinkButton({ url, title, text, className, label = "Compartilhar link" }: { url: string; title: string; text?: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className={className ?? "btn-secondary"} onClick={async () => {
      const full = url.startsWith("http") ? url : new URL(url, window.location.origin).href;
      try {
        if (navigator.share) { await navigator.share({ url: full, title, text }); return; }
        await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 2000);
      } catch { /* cancelled */ }
    }}>
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}{copied ? "Link copiado!" : label}
    </button>
  );
}
