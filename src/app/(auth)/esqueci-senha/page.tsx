import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold tracking-wide uppercase">Recuperar senha</h1>
      <p className="mb-5 text-sm text-ink-400">Enviaremos um link válido por 30 minutos.</p>
      <ForgotForm />
    </>
  );
}
