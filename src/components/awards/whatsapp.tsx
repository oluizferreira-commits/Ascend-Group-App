"use client";
import { MessageCircle } from "lucide-react";

/** Opens WhatsApp with a ready-made message + link (works on phones and WhatsApp Web). */
export function WhatsAppShare({ path, text, label = "Enviar no WhatsApp", className }: { path: string; text: string; label?: string; className?: string }) {
  return (
    <button type="button" className={className ?? "btn bg-[#25D366] text-[#073e1f] hover:bg-[#3ee07c]"}
      onClick={() => {
        const url = new URL(path, window.location.origin).href;
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
      }}>
      <MessageCircle className="size-4" />{label}
    </button>
  );
}
