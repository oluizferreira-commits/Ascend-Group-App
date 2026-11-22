import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/crest";
import { ApplyForm } from "@/components/recruitment/apply-form";

export const metadata: Metadata = {
  title: "Seja do Ascend",
  description: "Quer jogar no Ascend CF? Envie sua proposta para o elenco de Pro Clubs. RISE. CONQUER. ASCEND.",
  openGraph: {
    title: "Seja do Ascend — Ascend CF", description: "Envie sua proposta para jogar no Ascend CF (EA SPORTS FC Pro Clubs).",
    images: [{ url: "/brand/generated/icon-512.png", width: 512, height: 512, alt: "Escudo do Ascend CF" }], type: "website", locale: "pt_BR",
  },
  twitter: { card: "summary", title: "Seja do Ascend — Ascend CF", images: ["/brand/generated/icon-512.png"] },
};

export default function ApplyPage() {
  return (
    <main className="min-h-dvh">
      <section className="card-premium rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-10 text-center">
          <Link href="/"><Crest size={120} priority /></Link>
          <p className="font-display text-sm font-semibold tracking-[0.4em] text-silver uppercase">Ascend CF · Pro Clubs</p>
          <h1 className="font-display text-6xl leading-none font-bold tracking-[0.03em] text-white uppercase sm:text-7xl">Seja do Ascend</h1>
          <p className="max-w-lg text-sm text-ink-300">Preencha sua proposta. A comissão técnica avalia e, se aprovada, entra em contato com você.</p>
        </div>
      </section>
      <div className="mx-auto max-w-3xl px-4 py-8"><ApplyForm /></div>
      <footer className="pb-10 text-center text-ink-400">
        <p className="font-display text-sm tracking-[0.4em]">RISE. CONQUER. ASCEND.</p>
        <p className="mt-2 text-xs"><Link href="/privacidade" className="hover:text-accent-400">Política de Privacidade e Cookies</Link></p>
      </footer>
    </main>
  );
}
