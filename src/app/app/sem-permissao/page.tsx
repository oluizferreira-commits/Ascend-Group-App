import Link from "next/link";
import { EmptyState } from "@/components/ui/basics";

export default function NoPermission() {
  return (
    <EmptyState title="Acesso restrito" action={<Link href="/app" className="btn-secondary">Voltar ao painel</Link>}>
      Seu cargo não permite acessar esta área. Fale com a diretoria se precisar de acesso.
    </EmptyState>
  );
}
