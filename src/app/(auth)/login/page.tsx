import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/app");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold tracking-wide uppercase">Área do clube</h1>
      <p className="mb-5 text-sm text-ink-400">Entre com a conta fornecida pela diretoria.</p>
      <LoginForm next={next} />
    </>
  );
}
