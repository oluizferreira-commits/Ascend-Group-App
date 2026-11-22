# Integração EA SPORTS FC — Pro Clubs

**Status: implementada e verificada com dados reais do FC 27 em 21/11/2026.**
Clube: **Ascend CF**, `clubId = 2292864`, plataforma `common-gen5` (nova geração).

## 1. Fonte de dados

Não existe API oficial pública. Usamos os endpoints **públicos de leitura** que o site oficial
`proclubs.ea.com` consome (autorizado pelo proprietário do projeto). Não usam login, cookies nem senha da EA.

| Endpoint | Uso | Verificado (FC 27) |
|---|---|---|
| `GET /api/fc/allTimeLeaderboard/search?platform=&clubName=` | Encontrar o `clubId` | ✅ retorna `clubId`, V/E/D, gols, `currentDivision` |
| `GET /api/fc/clubs/matches?platform=&clubIds=&matchType=&maxResultCount=10` | Partidas (`leagueMatch`, `playoffMatch`, `friendlyMatch`) | ✅ **somente as 10 últimas** por tipo |
| `GET /api/fc/members/stats?platform=&clubId=` | Elenco na EA (nome, linha preferida, overall, totais) | ✅ `{ members: [...] }` |
| `GET /api/fc/clubs/info`, `/clubs/overallStats` | Informações gerais | ✅ (ainda não usados) |

Campos usados por jogador em cada partida: `playername`, `goals`, `assists`, `shots`, `passesmade`, `passattempts`,
`tacklesmade`, `saves`, `goalsconceded`, `cleansheetsany`, `redcards`, `rating`, `mom`, `secondsPlayed`.
**Não fornecidos pela EA** (ficam "não registrado"): finalizações no alvo, interceptações, cortes, cartões amarelos.
Amostra anonimizada do formato: `tests/fixtures/ea-match.fc27.anonymized.json`.

## 2. Como funciona

```
EA (público) ──► cliente HTTP (timeout, retry só em 429/5xx, ≥1,5 s entre chamadas, 403 = parar)
                  │
   ┌──────────────┼──────────────────────────────┐
   │ servidor     │ agente local (PC da diretoria)│ JSON colado/enviado pelo navegador
   └──────────────┴───────────────┬──────────────┘
                                  ▼
            importador idempotente (src/integrations/ea-fc/importer.ts)
             · deduplicação por (clube, origem, matchId) — índice único no banco
             · vincula jogadores pelo "Nome / ID no EA FC" (sem diferenciar maiúsculas)
             · nunca sobrescreve partidas existentes nem edições manuais
             · gols/assistências atribuídos nunca passam do placar
             · nomes sem vínculo são listados, não viram jogadores automaticamente
             · grava synchronization_logs com o JSON bruto → "Reprocessar" é seguro
```

Partidas importadas entram na temporada cujo período contém a data do jogo e numa competição
automática ("EA · Liga (divisões)", "EA · Playoffs", "EA · Amistosos").

## 3. Formas de sincronizar

0. **Automática ao usar o app** (sem configuração): quando alguém abre o site ou o painel e a última
   sincronização tem mais de 30 min, o servidor sincroniza em segundo plano (`after()`), sem atrasar a página.
   Uma trava no banco garante uma única consulta à EA mesmo com várias visitas simultâneas.

1. **Tela "Integração EA FC"** (Presidente/Administrador): configurar o clube, buscar o elenco da EA e criar/vincular
   jogadores, "Sincronizar agora" (limite de 1 vez a cada 10 min), importar JSON, histórico e reprocessamento.
2. **Agendado pelo servidor**: `GET /api/integrations/ea-fc/sync` com `Authorization: Bearer $SYNC_CRON_SECRET`.
   Ex.: Vercel Cron ou GitHub Actions a cada 30–60 min. Como a EA guarda só as 10 últimas partidas por tipo,
   sincronize pelo menos a cada 10 partidas jogadas.
3. **Agente local** (`scripts/ea-sync-agent.mjs`, Node 18+, sem dependências) — use se a EA bloquear o IP do seu host:
   ```bash
   APP_URL=https://seu-app EA_SYNC_TOKEN=... EA_FC_CLUB_ID=2292864 node scripts/ea-sync-agent.mjs --every 30
   ```
   Ele envia para `POST /api/integrations/ea-fc/ingest` (Bearer `EA_SYNC_TOKEN`).

## 4. Riscos e limites (honestos)

- Endpoints não oficiais podem mudar ou ser bloqueados sem aviso. O app continua funcionando pelo cadastro manual.
- O CDN da EA (Akamai) recusou requisições feitas com `curl` a partir da nuvem (403), mas aceitou o cliente Node
  da plataforma. Isso pode variar por host/IP; se houver 403, o log mostra e **nada é forçado** — use o agente local.
- Histórico anterior às 10 últimas partidas não é recuperável pela EA; registre manualmente se quiser.
- Os totais de temporada da EA (busca/membros) podem incluir partidas que não importamos; o painel mostra apenas
  partidas registradas na plataforma.

## 5. Ambiente de desenvolvimento (sandbox)

Neste sandbox o tráfego sai por um proxy; para o `fetch` do Node usá-lo, o servidor foi iniciado com
`NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. Em produção isso não é necessário.
