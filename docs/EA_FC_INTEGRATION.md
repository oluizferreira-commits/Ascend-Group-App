# Integração EA SPORTS FC — pesquisa técnica (Fase 4)

> **Status: não implementada e não verificada para o FC 27.**
> O ambiente de desenvolvimento usado até agora bloqueia o acesso a `proclubs.ea.com`, então
> nenhuma chamada real foi feita. Tudo abaixo vem do conhecimento público sobre versões
> anteriores (FC 24/FC 25) e **precisa ser confirmado** antes da implementação.

## 1. Existe API oficial?

Não há API pública documentada pela EA para Pro Clubs. Não há chave de desenvolvedor, termos de uso
para terceiros nem garantia de estabilidade.

## 2. Fonte não oficial conhecida

O site oficial de Pro Clubs (`proclubs.ea.com`) consome endpoints JSON que a comunidade usa
(bots de Discord, sites de estatísticas). Em versões anteriores tinham o formato:

| Finalidade | Endpoint (versões anteriores, a confirmar) |
|---|---|
| Buscar clube por nome | `GET /api/fc/allTimeLeaderboard/search?platform={p}&clubName={nome}` ou `/api/fc/clubs/search` |
| Informações do clube | `GET /api/fc/clubs/info?platform={p}&clubIds={id}` |
| Estatísticas gerais / divisão | `GET /api/fc/clubs/overallStats?platform={p}&clubIds={id}` |
| Partidas recentes | `GET /api/fc/clubs/matches?platform={p}&clubIds={id}&matchType=leagueMatch\|playoffMatch\|friendlyMatch` |
| Estatísticas dos membros | `GET /api/fc/members/stats?platform={p}&clubId={id}` |

`platform`: `common-gen5` (PS5/Xbox Series/PC) ou `common-gen4`.

Pontos conhecidos:
- Endpoints de **leitura pública**, sem login: não exigem conta nem senha da EA.
- Atrás de CDN com proteção anti-bot; podem recusar clientes que não pareçam navegador, mudar sem aviso
  ou ficar fora do ar.
- `matches` retorna **apenas as últimas ~5–10 partidas por tipo**: para não perder jogos é preciso
  consultar periodicamente (ex.: a cada 30–60 min durante a temporada).
- Cada partida traz um ID (`matchId`), timestamp, placar e, por jogador, campos como gols, assistências,
  nota, finalizações, passes, desarmes, defesas, cartões, melhor em campo e posição — **o conjunto exato
  precisa ser verificado no FC 27**.

## 3. Regras que a implementação vai seguir

- Usar **apenas** endpoints públicos de leitura. Nunca pedir, guardar ou usar senha/conta EA dos jogadores.
- Não contornar autenticação, CAPTCHA ou proteções anti-bot. Se a EA bloquear, a integração para e o app segue manual.
- Baixa frequência (≤ 1 consulta/endpoint a cada 30 min), *timeout*, *backoff* exponencial, `User-Agent` identificável.
- Documentar origem e data de verificação de cada campo usado.
- Revisar os Termos de Serviço/Contrato de Usuário da EA antes de ativar em produção (decisão do proprietário).
- **Não inventar dados**: campo ausente no retorno da EA fica `NULL`; dados importados ficam marcados com `source = ea_fc`.

## 4. Desenho já preparado no banco

- `clubs.ea_platform`, `clubs.ea_club_id` — identificação do clube.
- `players.ea_name` — vincula o jogador da EA ao atleta (único por clube).
- `matches.source` + `matches.external_id` com índice único → **importação idempotente** (reprocessar não duplica).
- `synchronization_logs` — início/fim, status, itens encontrados/criados/ignorados, erro, gatilho (manual/agendado/arquivo).

## 5. Plano de implementação

1. **Spike** (em ambiente com acesso ao domínio): chamar cada endpoint para o clube real, salvar amostras
   anonimizadas em `tests/fixtures/ea/`, registrar o formato do FC 27.
2. Módulo `src/integrations/ea-fc/`: cliente HTTP (timeout, retry, rate limit) + *parser* validado com Zod
   + *mapper* para nosso esquema, testados contra as amostras.
3. Serviço de sincronização: importa partidas novas, liga jogadores por `ea_name`, lista jogadores não reconhecidos
   para o administrador vincular, grava `synchronization_logs`.
4. Tela "Integração EA FC": configurar clube, sincronizar agora, histórico, erros, reprocessar.
5. Agendamento: Route Handler protegido por `SYNC_CRON_SECRET`, chamado por cron do host (ex.: Vercel Cron, GitHub Actions).
6. **Plano B sempre disponível**: importação por arquivo estruturado (CSV/JSON) e cadastro manual pela súmula.

## 6. O que precisamos do proprietário

- Nome exato do clube no EA FC 27 e plataforma (PS5/Xbox Series/PC ou geração anterior).
- Autorização para usar endpoints não oficiais, ciente dos riscos acima.
- (Opcional) Uma partida já jogada para conferirmos os dados importados contra o jogo.
