"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/server/errors";

export function SubmitButton({ children, className, pendingText = "Salvando…" }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("btn-primary", className)}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        state.ok ? "border-win/40 bg-win/10 text-green-200" : "border-loss/40 bg-loss/10 text-red-200",
      )}
    >
      {state.ok ? state.message : state.error}
    </p>
  );
}

export function Field({
  label, name, error, children, hint, className,
}: { label: string; name: string; error?: string[]; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      {error?.[0] && <p className="mt-1 text-xs text-red-300">{error[0]}</p>}
    </div>
  );
}

export function fieldErrors(state: ActionResult<unknown> | null) {
  return state && !state.ok ? state.fieldErrors ?? {} : {};
}
