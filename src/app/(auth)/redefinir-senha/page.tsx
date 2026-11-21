import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Redefinir senha" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="mb-4 font-display text-2xl font-bold tracking-wide uppercase">Nova senha</h1>
      {token ? <ResetForm token={token} /> : (
        <p className="text-sm text-ink-300">Link inválido. <Link href="/esqueci-senha" className="text-gold-400 hover:underline">Solicite um novo</Link>.</p>
      )}
    </>
  );
}
