/**
 * "O que há de novo" — shown once after the app updates. Add the newest entry FIRST.
 * Keep it short and in the players' language.
 */
export const CHANGELOG: { date: string; title: string; items: string[] }[] = [
  {
    date: "2026-11-22",
    title: "Visual com animações",
    items: [
      "Números do painel contam subindo e o aproveitamento ganhou um anel animado.",
      "Destaques com brilho ao passar o mouse e feixe de luz no topo do painel.",
      "Faixa rolante com os últimos resultados no site do clube.",
      "Transições suaves entre páginas e indicador do menu que desliza.",
      "Quem usa “reduzir movimento” no celular vê tudo sem animação.",
    ],
  },
  {
    date: "2026-11-22",
    title: "Seja do Ascend, privacidade e atualizações",
    items: [
      "Nova página pública “Seja do Ascend” para receber propostas de jogadores.",
      "Aviso automático quando houver uma nova versão do app.",
      "Política de Privacidade e aviso de cookies (LGPD).",
      "Sem zoom e sem prévia de link ao segurar — mais cara de app.",
    ],
  },
];
