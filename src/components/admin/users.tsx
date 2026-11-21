"use client";
import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { createUserAction, resetMemberPasswordAction, setRolesAction, type CreateUserResult } from "@/server/actions/users";
import type { RoleKey } from "@/server/auth/permissions";

type RoleOpt = { key: RoleKey; name: string; allowed: boolean };

function TempPasswordNotice({ state }: { state: CreateUserResult | null }) {
  if (!state?.ok || !state.data?.tempPassword) return null;
  return (
    <div className="rounded-lg border border-gold-600/50 bg-gold-500/10 p-3 text-sm">
      <p className="font-semibold text-gold-300">Senha temporária (exibida apenas uma vez)</p>
      <p className="mt-1">Login: <b>{state.data.email}</b></p>
      <p>Senha: <code className="rounded bg-ink-950 px-1.5 py-0.5 font-mono text-gold-200 select-all">{state.data.tempPassword}</code></p>
      <p className="mt-1 text-xs text-ink-300">Envie por um canal privado e peça para trocar em “Minha conta” no primeiro acesso.</p>
    </div>
  );
}

function RoleChecks({ roles, selected }: { roles: RoleOpt[]; selected?: RoleKey[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => (
        <label key={r.key} className={r.allowed ? "cursor-pointer" : "cursor-not-allowed opacity-40"} title={r.allowed ? undefined : "Seu cargo não permite atribuir este cargo"}>
          <input type="checkbox" name="roles" value={r.key} defaultChecked={selected?.includes(r.key)} disabled={!r.allowed} className="peer sr-only" />
          <span className="inline-block rounded-md border border-ink-600 px-2.5 py-1 text-xs text-ink-300 peer-checked:border-gold-500 peer-checked:bg-gold-500/10 peer-checked:text-gold-300 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-400">{r.name}</span>
        </label>
      ))}
    </div>
  );
}

export function CreateUserForm({ roles }: { roles: RoleOpt[] }) {
  const [state, action] = useActionState(createUserAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nome" name="displayName" error={fe.displayName}><input id="displayName" name="displayName" required maxLength={80} className="input" /></Field>
      <Field label="E-mail" name="email" error={fe.email}><input id="email" name="email" type="email" required className="input" /></Field>
      <div><span className="label">Cargos</span><RoleChecks roles={roles} selected={["player"]} />{fe.roles && <p className="mt-1 text-xs text-red-300">{fe.roles[0]}</p>}</div>
      <FormMessage state={state} />
      <TempPasswordNotice state={state} />
      <SubmitButton className="w-full" pendingText="Criando…">Adicionar membro</SubmitButton>
    </form>
  );
}

export function MemberRoles({ userId, roles, current, editable }: { userId: string; roles: RoleOpt[]; current: RoleKey[]; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(setRolesAction.bind(null, userId), null);
  const [pwState, pwAction] = useActionState(resetMemberPasswordAction.bind(null, userId), null);
  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {editable && <button onClick={() => setEditing(true)} className="btn-ghost min-h-0 px-2 py-1 text-xs">Editar cargos</button>}
          {editable && (
            <form action={pwAction}><button className="btn-ghost min-h-0 px-2 py-1 text-xs" onClick={(e) => { if (!confirm("Gerar nova senha temporária? As sessões atuais do membro serão encerradas.")) e.preventDefault(); }}><KeyRound className="size-3.5" />Nova senha</button></form>
          )}
        </div>
        <FormMessage state={state} />
        {pwState && !pwState.ok && <FormMessage state={pwState} />}
        <TempPasswordNotice state={pwState} />
      </div>
    );
  }
  return (
    <form action={async (f) => { await action(f); setEditing(false); }} className="space-y-2">
      <RoleChecks roles={roles} selected={current} />
      <div className="flex gap-2">
        <SubmitButton className="min-h-0 px-3 py-1.5 text-xs">Salvar</SubmitButton>
        <button type="button" onClick={() => setEditing(false)} className="btn-ghost min-h-0 px-3 py-1.5 text-xs">Cancelar</button>
      </div>
    </form>
  );
}
