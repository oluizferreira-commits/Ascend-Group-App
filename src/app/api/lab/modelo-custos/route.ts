import { NextResponse } from "next/server";
import { getAuthContext } from "@/server/auth/session";
import { tableTemplate } from "@/lib/lab/ap-engine";
import { ATTRIBUTES } from "@/lib/lab/game-data";

/** Downloadable import template: every attribute key with the expected shape (values must come from a verified source). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx?.permissions.has("gamedata.manage")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const body = {
    _instrucoes: [
      "Uma tabela por versão do jogo + temporada + arquétipo. Preencha SOMENTE com valores verificados.",
      "attrs.<atributo>.base = valor inicial do arquétipo; max = limite do arquétipo; costs = custo de cada +1, de base até max (tamanho = max − base).",
      "levelBudget = AP total disponível em cada nível, ex.: { \"1\": 10, \"2\": 13 } — níveis sem valor ficam sem validação.",
      "modifiers = efeitos de altura/peso/especializações no valor EXIBIDO (não mudam custo nem níveis comprados). Deixe vazio se não houver regra verificada.",
      "Remova esta chave _instrucoes antes de importar (ou mantenha; ela é ignorada).",
    ],
    _atributos: Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a.label])),
    ...tableTemplate(),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="modelo-tabela-custos.json"', "Cache-Control": "no-store" },
  });
}
