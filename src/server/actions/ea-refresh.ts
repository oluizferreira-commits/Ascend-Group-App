"use server";
import { revalidatePath } from "next/cache";
import { requireAction } from "../auth/session";
import { refreshFromEa } from "../services/ea-sync";

export type RefreshState = { ok: boolean; message: string; at: number };

/** "Atualizar agora" — any club member can pull the latest EA matches (club-wide cooldown). */
export async function refreshEaAction(): Promise<RefreshState> {
  const ctx = await requireAction("dashboard.view");
  const r = await refreshFromEa(ctx.club.id, ctx.user.id);
  const at = Date.now();
  switch (r.status) {
    case "not_configured":
      return { ok: false, message: "A integração com a EA ainda não foi configurada pela diretoria.", at };
    case "throttled":
      return { ok: false, message: `Acabou de ser atualizado. Tente de novo em ${r.retryInS}s.`, at };
    case "failed":
      return { ok: false, message: "A EA não respondeu agora. Tente novamente em instantes.", at };
    case "done": {
      revalidatePath("/app", "layout");
      const parts = [r.created === 0 ? "Nenhuma partida nova" : r.created === 1 ? "1 partida nova importada" : `${r.created} partidas novas importadas`];
      if (r.overallChanges) parts.push(`overall de ${r.overallChanges} jogador(es) atualizado`);
      return { ok: true, message: `Atualizado com a EA: ${parts.join(" · ")}.`, at };
    }
  }
}
