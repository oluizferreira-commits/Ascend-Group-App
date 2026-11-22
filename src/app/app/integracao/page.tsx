import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getEaConfig, latestMembersSnapshot, listSyncLogs } from "@/server/services/ea-sync";
import { listPlayers } from "@/server/services/players";
import { createPlayerFromEaAction, reprocessLogAction } from "@/server/actions/integration";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { EaConfigForm, FetchMembersButton, JsonImportForm, SyncNowButton } from "@/components/integration/forms";
import { EA_MATCH_TYPES, EA_MATCH_TYPE_LABELS } from "@/integrations/ea-fc/types";
import { matchesUrl, searchUrl } from "@/integrations/ea-fc/client";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Integração EA FC" };

const STATUS = { running: ["Em andamento", "gold"], success: ["Sucesso", "win"], partial: ["Parcial", "gold"], failed: ["Falhou", "loss"] } as const;
const ORIGIN: Record<string, string> = { server: "Servidor (manual)", auto: "Automática", agent: "Agente local", json: "JSON importado" };

type Unmatched = { eaName: string; matches: number; goals: number; assists: number };

export default async function IntegrationPage() {
  const ctx = await requirePage("integration.manage");
  const [cfg, logs, snapshot, roster] = await Promise.all([getEaConfig(ctx.club.id), listSyncLogs(ctx.club.id), latestMembersSnapshot(ctx.club.id), listPlayers(ctx.club.id)]);
  const isMembers = (l: (typeof logs)[number]) => String((l.details as { origin?: string }).origin ?? "").startsWith("members:");
  const matchLogs = logs.filter((l) => !isMembers(l));
  const lastOk = matchLogs.find((l) => l.status === "success" || l.status === "partial");
  const unmatched = ((matchLogs.find((l) => l.status !== "running")?.details as { unmatchedPlayers?: Unmatched[] })?.unmatchedPlayers ?? []);
  const linked = new Map(roster.filter((p) => p.eaName).map((p) => [p.eaName!.toLowerCase(), p]));
  const canCreate = ctx.permissions.has("players.manage");
  const platform = cfg.platform ?? "common-gen5";

  return (
    <>
      <PageHeader
        eyebrow="Integração"
        title="EA SPORTS FC"
        description="Importa partidas e estatísticas dos endpoints públicos (não oficiais) do Pro Clubs. Nenhuma senha da EA é usada. Partidas nunca são duplicadas e o cadastro manual continua disponível."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="label">Clube EA</p><p className="font-display text-2xl font-bold">{cfg.eaClubId ?? "—"}</p></div>
        <div className="card p-4"><p className="label">Última importação com dados</p><p className="font-display text-xl font-bold">{lastOk ? fmtDateTime(lastOk.startedAt) : "nunca"}</p></div>
        <div className="card p-4"><p className="label">Execuções registradas</p><p className="font-display text-2xl font-bold">{logs.length}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <SectionTitle>1 · Identificar o clube</SectionTitle>
          <p className="mb-3 text-sm text-ink-400">Abra a busca no seu navegador, procure o <b>clubId</b> do Ascend na resposta e cole abaixo.</p>
          <div className="mb-4 flex flex-col gap-1 text-sm">
            {["Ascend CF"].map((n) => (
              <a key={n} href={searchUrl(platform, n)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-400 hover:underline">
                Buscar “{n}” na EA <ExternalLink className="size-3.5" />
              </a>
            ))}
          </div>
          <EaConfigForm platform={cfg.platform} eaClubId={cfg.eaClubId} />
        </section>

        <section className="card p-5">
          <SectionTitle>2 · Importar partidas</SectionTitle>
          <p className="mb-2 text-sm text-ink-400"><b className="text-ink-200">Pelo navegador</b> (funciona sempre): abra o link, salve/copie o JSON e importe aqui.</p>
          {cfg.eaClubId ? (
            <ul className="mb-4 space-y-1 text-sm">
              {EA_MATCH_TYPES.map((t) => (
                <li key={t}><a href={matchesUrl(platform, cfg.eaClubId!, t)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-400 hover:underline">{EA_MATCH_TYPE_LABELS[t]} <ExternalLink className="size-3.5" /></a></li>
              ))}
            </ul>
          ) : <p className="mb-4 text-xs text-ink-400">Configure o ID do clube para ver os links.</p>}
          <JsonImportForm />
        </section>

        <section className="card p-5">
          <SectionTitle>3 · Automático</SectionTitle>
          <p className="mb-3 text-sm text-ink-400">
            <b className="text-ink-200">Agente local</b> (recomendado): um script roda no PC de um membro da diretoria e envia as partidas
            ao app a cada 15 min. Veja <code className="text-xs">docs/EA_FC_INTEGRATION.md</code>.
          </p>
          <p className="mb-3 text-sm text-ink-400">
            <b className="text-ink-200">Servidor</b>: a EA costuma bloquear servidores em nuvem (403). Se bloquear, o registro mostra e nada é forçado.
          </p>
          <SyncNowButton disabled={!cfg.eaClubId} />
        </section>
      </div>

      <section className="card mt-6 p-5">
        <SectionTitle action={<FetchMembersButton disabled={!cfg.eaClubId} />}>Elenco na EA</SectionTitle>
        {!snapshot ? (
          <p className="text-sm text-ink-400">Busque o elenco pela EA (ou cole o JSON de <code>members/stats</code> no formulário de importação) para vincular os jogadores.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-400">Atualizado em {fmtDateTime(snapshot.at)}. Ao criar, a posição é estimada pela linha preferida na EA (GOL/ZAG/MC/ATA) e o nome completo fica igual ao nome da EA — ajuste no cadastro.</p>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Nome na EA</th><th>Linha</th><th className="text-right">Overall</th><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">A</th><th>Elenco</th></tr></thead>
                <tbody>
                  {snapshot.members.map((m) => {
                    const p = linked.get(m.name.toLowerCase());
                    return (
                      <tr key={m.name}>
                        <td className="font-medium">{m.name}</td>
                        <td className="text-ink-300">{{ goalkeeper: "Goleiro", defender: "Defensor", midfielder: "Meio-campo", forward: "Ataque" }[m.favoritePosition ?? ""] ?? "—"}</td>
                        <td className="text-right">{m.proOverall ?? "—"}</td>
                        <td className="text-right">{m.gamesPlayed ?? "—"}</td>
                        <td className="text-right">{m.goals ?? "—"}</td>
                        <td className="text-right">{m.assists ?? "—"}</td>
                        <td>
                          {p ? <Link href={`/app/elenco/${p.id}`} className="text-win hover:underline">Vinculado: {p.nickname}</Link>
                            : canCreate ? <form action={createPlayerFromEaAction.bind(null, m.name)}><button className="btn-ghost min-h-0 px-2 py-1 text-xs text-accent-300">+ Criar jogador</button></form>
                            : <span className="text-xs text-ink-400">Sem vínculo</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {unmatched.length > 0 && (
        <section className="card mt-6 border-accent-600/40 p-5">
          <SectionTitle>Jogadores da EA sem vínculo no elenco</SectionTitle>
          <p className="mb-3 text-sm text-ink-400">As estatísticas destes nomes não foram atribuídas. Preencha “Nome / ID no EA FC” no cadastro do jogador (ou cadastre-o) e clique em <b>Reprocessar</b> na execução abaixo.</p>
          <div className="flex flex-wrap gap-2">
            {unmatched.map((u) => (
              <Link key={u.eaName} href={`/app/elenco/novo`} className="rounded-lg border border-ink-600 px-3 py-1.5 text-sm hover:border-accent-500">
                <b>{u.eaName}</b> <span className="text-xs text-ink-400">{u.matches} J · {u.goals} G · {u.assists} A</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card mt-6 overflow-x-auto p-5">
        <SectionTitle>Histórico de importações</SectionTitle>
        {matchLogs.length === 0 ? <p className="text-sm text-ink-400">Nenhuma importação ainda.</p> : (
          <table className="data-table">
            <thead><tr><th>Início</th><th>Origem</th><th>Status</th><th className="text-right">Encontradas</th><th className="text-right">Novas</th><th className="text-right">Existentes</th><th>Erro</th><th /></tr></thead>
            <tbody>
              {matchLogs.map((l) => {
                const d = l.details as { origin?: string; batches?: unknown[] };
                const [label, tone] = STATUS[l.status];
                return (
                  <tr key={l.id}>
                    <td>{fmtDateTime(l.startedAt)}</td>
                    <td className="text-ink-300">{ORIGIN[d.origin ?? ""] ?? (d.origin?.startsWith("reprocess") ? "Reprocessamento" : d.origin)}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td className="text-right">{l.itemsFound}</td>
                    <td className="text-right text-win">{l.itemsCreated}</td>
                    <td className="text-right text-ink-400">{l.itemsSkipped}</td>
                    <td className="max-w-xs truncate text-xs text-loss" title={l.errorMessage ?? ""}>{l.errorMessage ?? ""}</td>
                    <td>{d.batches && d.batches.length > 0 && (
                      <form action={reprocessLogAction.bind(null, l.id)}><button className="btn-ghost min-h-0 px-2 py-1 text-xs">Reprocessar</button></form>
                    )}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
