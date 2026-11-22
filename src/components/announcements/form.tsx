"use client";
import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, VISIBILITIES, VISIBILITY_LABELS } from "@/lib/domain";
import { createAnnouncementAction } from "@/server/actions/announcements";

export function AnnouncementForm() {
  const [state, action] = useActionState(createAnnouncementAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const fe = fieldErrors(state);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label="Título *" name="title" error={fe.title}><input id="title" name="title" required maxLength={120} className="input" /></Field>
      <Field label="Mensagem *" name="body" error={fe.body}><textarea id="body" name="body" required rows={5} maxLength={5000} className="input" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoria" name="category"><select id="category" name="category" defaultValue="general" className="input">{ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{ANNOUNCEMENT_CATEGORY_LABELS[c]}</option>)}</select></Field>
        <Field label="Prioridade" name="priority"><select id="priority" name="priority" defaultValue="normal" className="input">{PRIORITIES.map((c) => <option key={c} value={c}>{PRIORITY_LABELS[c]}</option>)}</select></Field>
        <Field label="Visível para" name="visibility" className="col-span-2"><select id="visibility" name="visibility" defaultValue="members" className="input">{VISIBILITIES.map((c) => <option key={c} value={c}>{VISIBILITY_LABELS[c]}</option>)}</select></Field>
        <Field label="Publicar em" name="publishAt" error={fe.publishAt} hint="Vazio = agora"><input id="publishAt" name="publishAt" type="datetime-local" className="input" /></Field>
        <Field label="Válido até" name="expiresAt" error={fe.expiresAt} hint="Vazio = sem validade"><input id="expiresAt" name="expiresAt" type="datetime-local" className="input" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" /> Fixar no topo</label>
      <details className="rounded-lg border border-ink-700 p-3">
        <summary className="cursor-pointer text-sm font-semibold">+ Enquete rápida</summary>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pollEnabled" /> Incluir enquete neste aviso</label>
          <Field label="Pergunta" name="pollQuestion"><input id="pollQuestion" name="pollQuestion" maxLength={120} defaultValue="Você vai?" className="input" /></Field>
          <Field label="Opções (uma por linha, até 5)" name="pollOptions" error={fe.pollOptions}>
            <textarea id="pollOptions" name="pollOptions" rows={3} defaultValue={"Vou\nNão vou\nTalvez"} className="input" />
          </Field>
        </div>
      </details>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Publicando…">Publicar comunicado</SubmitButton>
    </form>
  );
}
