"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, requestPasswordResetAction, resetPasswordAction, changePasswordAction } from "@/server/actions/auth";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" name="email" error={fe.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Senha" name="password" error={fe.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/esqueci-senha" className="text-accent-400 hover:underline">Esqueci minha senha</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordResetAction, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail da conta" name="email">
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Enviando…">Enviar link</SubmitButton>
      <p className="text-center text-sm"><Link href="/login" className="text-accent-400 hover:underline">Voltar ao login</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  const fe = fieldErrors(state);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <Link href="/login" className="btn-primary w-full">Ir para o login</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha" name="password" error={fe.password} hint="Mínimo de 10 caracteres, com letras e números.">
        <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <Field label="Confirmar senha" name="confirm" error={fe.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Redefinir senha</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="max-w-sm space-y-4">
      <Field label="Senha atual" name="current" error={fe.current}>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <Field label="Nova senha" name="password" error={fe.password} hint="Mínimo de 10 caracteres, com letras e números.">
        <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <Field label="Confirmar nova senha" name="confirm" error={fe.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>Alterar senha</SubmitButton>
    </form>
  );
}
