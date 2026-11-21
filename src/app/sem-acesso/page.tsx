import Link from "next/link";
import { Crest } from "@/components/crest";
import { logoutAction } from "@/server/actions/auth";

export default function NoMembership() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Crest size={80} />
      <h1 className="font-display text-2xl font-bold uppercase">Conta sem vínculo</h1>
      <p className="max-w-sm text-sm text-ink-400">Sua conta ainda não foi vinculada ao clube. Peça à diretoria para atribuir um cargo.</p>
      <div className="flex gap-2">
        <Link href="/" className="btn-secondary">Página pública</Link>
        <form action={logoutAction}><button className="btn-ghost">Sair</button></form>
      </div>
    </main>
  );
}
