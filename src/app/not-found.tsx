import Link from "next/link";
import { Crest } from "@/components/crest";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Crest size={72} />
        <h1 className="font-display text-3xl font-bold uppercase">Página não encontrada</h1>
        <Link href="/" className="btn-secondary">Voltar ao início</Link>
      </div>
    </main>
  );
}
