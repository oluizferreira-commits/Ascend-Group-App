"use client";
import { useActionState, useRef, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { submitApplicationAction } from "@/server/actions/recruitment";
import { FEET, FOOT_LABELS, POSITIONS, POSITION_LABELS, POSITION_NAMES } from "@/lib/domain";
import { PLATFORMS } from "@/lib/validation/application";

/** Downscale in the browser so phone photos upload fast and stay under the body limit. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function ApplyForm() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof submitApplicationAction>> | null, form: FormData) => {
    form.delete("photo");
    if (photoFile) form.set("photo", photoFile);
    return submitApplicationAction(prev, form);
  }, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fe = fieldErrors(state);

  if (state?.ok) {
    return (
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="size-12 text-win" />
        <h2 className="font-display text-2xl font-bold uppercase">Proposta enviada!</h2>
        <p className="max-w-md text-sm text-ink-300">{state.message ?? "Recebemos sua proposta."}</p>
        <p className="font-display text-sm tracking-[0.35em] text-accent-400">RISE. CONQUER. ASCEND.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      {/* honeypot — hidden from people, bots fill it */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="eyebrow">Jogador no Pro Clubs</h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="grid aspect-[4/5] w-36 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-dashed border-ink-600 bg-ink-850 text-ink-400 hover:border-accent-500">
            {preview
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Foto do jogador" className="h-full w-full object-cover" />
              : <span className="flex flex-col items-center gap-1 px-2 text-center text-xs"><Camera className="size-6" />Foto do seu jogador no Pro Clubs</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const small = await shrink(f);
              setPhotoFile(small);
              setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(small); });
            }} />
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Field label="Nick na EA *" name="eaName" error={fe.eaName}><input id="eaName" name="eaName" required maxLength={40} className="input" /></Field>
            <Field label="Plataforma *" name="platform" error={fe.platform}>
              <select id="platform" name="platform" required defaultValue="" className="input">
                <option value="" disabled>Selecione</option>
                {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Posição principal *" name="primaryPosition" error={fe.primaryPosition}>
              <select id="primaryPosition" name="primaryPosition" required defaultValue="" className="input">
                <option value="" disabled>Selecione</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABELS[p]} — {POSITION_NAMES[p]}</option>)}
              </select>
            </Field>
            <Field label="Overall do jogador" name="overall" error={fe.overall}><input id="overall" name="overall" type="number" min={1} max={99} inputMode="numeric" className="input" /></Field>
            <Field label="Pé dominante" name="preferredFoot">
              <select id="preferredFoot" name="preferredFoot" defaultValue="" className="input">
                <option value="">—</option>{FEET.map((f) => <option key={f} value={f}>{FOOT_LABELS[f]}</option>)}
              </select>
            </Field>
            {fe.photo && <p className="text-xs text-loss sm:col-span-2">{fe.photo[0]}</p>}
          </div>
        </div>
        <div>
          <span className="label">Posições secundárias</span>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="checkbox" name="secondaryPositions" value={p} className="peer sr-only" />
                <span className="inline-block rounded border border-ink-600 px-2.5 py-1 text-xs text-ink-300 peer-checked:border-accent-500 peer-checked:bg-accent-500/10 peer-checked:text-accent-400">{POSITION_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>
        <Field label="Estilo de jogo" name="playStyle"><textarea id="playStyle" name="playStyle" rows={3} maxLength={500} className="input" placeholder="Ex.: meia de criação, bom passe longo, chega na área…" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Disponibilidade" name="availability"><input id="availability" name="availability" maxLength={300} className="input" placeholder="Ex.: seg a sex, 20h–23h" /></Field>
          <Field label="Clubes anteriores" name="previousClubs"><input id="previousClubs" name="previousClubs" maxLength={300} className="input" /></Field>
        </div>
        <Field label="Vídeo / clipes (link)" name="videoUrl" error={fe.videoUrl}><input id="videoUrl" name="videoUrl" type="url" inputMode="url" maxLength={300} className="input" placeholder="https://…" /></Field>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="eyebrow">Sobre você</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome *" name="fullName" error={fe.fullName} className="sm:col-span-2"><input id="fullName" name="fullName" required maxLength={100} autoComplete="name" className="input" /></Field>
          <Field label="Idade" name="age" error={fe.age}><input id="age" name="age" type="number" min={10} max={99} inputMode="numeric" className="input" /></Field>
          <Field label="Cidade / estado / país" name="location" className="sm:col-span-3"><input id="location" name="location" maxLength={80} className="input" /></Field>
        </div>
        <p className="text-sm text-ink-400">Contato — informe <b className="text-ink-200">pelo menos um</b>. Usaremos apenas se sua proposta for aceita.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp (com DDD)" name="contactWhatsapp" error={fe.contactWhatsapp}><input id="contactWhatsapp" name="contactWhatsapp" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} className="input" placeholder="(11) 91234-5678" /></Field>
          <Field label="Discord" name="contactDiscord"><input id="contactDiscord" name="contactDiscord" maxLength={40} className="input" placeholder="usuario" /></Field>
          <Field label="E-mail" name="contactEmail" error={fe.contactEmail}><input id="contactEmail" name="contactEmail" type="email" inputMode="email" autoComplete="email" maxLength={254} className="input" /></Field>
          <Field label="Instagram" name="contactInstagram" error={fe.contactInstagram}><input id="contactInstagram" name="contactInstagram" maxLength={31} className="input" placeholder="@usuario" /></Field>
        </div>
        <Field label="Mensagem para o clube" name="message"><textarea id="message" name="message" rows={3} maxLength={1000} className="input" /></Field>
        <label className="flex items-start gap-2 text-sm text-ink-300">
          <input type="checkbox" name="consent" className="mt-1" required />
          <span>Autorizo o Ascend CF a usar estes dados <b>somente para avaliar minha proposta e entrar em contato</b>. Posso pedir a exclusão a qualquer momento pelos contatos do clube.</span>
        </label>
        {fe.consent && <p className="text-xs text-loss">{fe.consent[0]}</p>}
      </section>

      <FormMessage state={state} />
      <SubmitButton className="w-full py-3 text-base" pendingText="Enviando…">Enviar proposta</SubmitButton>
    </form>
  );
}
