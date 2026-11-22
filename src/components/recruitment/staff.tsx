"use client";
import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { saveApplicationNotesAction } from "@/server/actions/recruitment";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-secondary" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ }
    }}>
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}{done ? "Copiado!" : "Copiar link"}
    </button>
  );
}

export function NotesForm({ id, initial }: { id: string; initial: string | null }) {
  const [state, action] = useActionState(saveApplicationNotesAction.bind(null, id), null);
  return (
    <form action={action} className="space-y-2">
      <textarea name="staffNotes" defaultValue={initial ?? ""} rows={4} maxLength={3000} className="input" placeholder="Anotações internas da comissão (o candidato não vê)" />
      <div className="flex items-center justify-between gap-2"><FormMessage state={state} /><SubmitButton className="min-h-0 px-3 py-1.5 text-sm">Salvar anotações</SubmitButton></div>
    </form>
  );
}
