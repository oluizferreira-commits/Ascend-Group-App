"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";
import { respondCallupAction } from "@/server/actions/calendar";

/** Opens a bottom sheet to answer a call-up without leaving the screen. */
export function CallupSheetButton({ eventId, title, when, className }: { eventId: string; title: string; when: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const answer = (status: "confirmed" | "declined") => start(async () => {
    const fd = new FormData();
    fd.set("status", status);
    if (note.trim()) fd.set("note", note.trim());
    const r = await respondCallupAction(eventId, null, fd);
    setResult(r.ok ? { ok: true, text: r.message ?? "Resposta enviada." } : { ok: false, text: r.error });
    if (r.ok) { navigator.vibrate?.(15); setTimeout(() => setOpen(false), 900); }
  });
  return (
    <>
      <button type="button" onClick={() => { setResult(null); setOpen(true); }} className={className ?? "text-accent-400 underline"}>Responder</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Convocação">
        <p className="font-semibold">{title}</p>
        <p className="mb-4 text-sm text-ink-400 capitalize">{when}</p>
        <label className="label" htmlFor={`note-${eventId}`}>Observação (opcional)</label>
        <input id={`note-${eventId}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="input mb-4" placeholder="Ex.: chego 10 min atrasado" />
        <div className="grid grid-cols-2 gap-2">
          <button disabled={pending} onClick={() => answer("confirmed")} className="btn-primary h-12"><Check className="size-5" />Confirmar</button>
          <button disabled={pending} onClick={() => answer("declined")} className="btn-secondary h-12"><X className="size-5" />Não poderei</button>
        </div>
        {result && <p className={result.ok ? "mt-3 text-sm text-win" : "mt-3 text-sm text-loss"} role="status">{result.text}</p>}
        <Link href={`/app/calendario/${eventId}`} className="mt-4 block text-center text-sm text-ink-400 underline">Ver detalhes do evento</Link>
      </BottomSheet>
    </>
  );
}
