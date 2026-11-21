# Roadmap e status

Legenda: ✅ pronto e testado · 🟡 parcial · ⏳ não iniciado

## Fase 1 — Fundação ✅
- ✅ Next.js 16 + TypeScript + Tailwind 4, PWA (manifest, service worker, página offline)
- ✅ PostgreSQL com 26 tabelas + view `standings`, migrações versionadas, gatilhos de proteção
- ✅ Autenticação (login, logout, recuperação e troca de senha, limite de tentativas)
- ✅ 7 cargos, 25 permissões, verificação no servidor, auditoria imutável
- ✅ Identidade visual (preto / bordô / dourado, Barlow Condensed + Inter)
- 🟡 Escudo: componente pronto; **aguardando o arquivo original** em `public/brand/ascend-fc-crest.png`

## Fase 2 — Gestão do clube ✅
- ✅ Painel: escudo, organização, temporada, divisão, posição, campanha, aproveitamento, próxima partida, últimos resultados
- ✅ 5 destaques: melhor jogador, artilheiro, melhor assistente, mais decisivos, avisos
- ✅ Elenco: cadastro/edição, perfis completos, filtros (temporada, posição, situação, mín. de partidas, ordenação)
- ✅ Perfil: totais, médias, nota, evolução, histórico por partida e por temporada
- ✅ Usuários e cargos (criação de conta com senha temporária, edição de cargos, remoção)
- ✅ Temporadas

## Fase 3 — Sistema esportivo 🟡
- ✅ Partidas: cadastro, resultado, estatísticas coletivas, súmula individual, exclusão auditada
- ✅ Histórico: filtros por temporada/competição/adversário, confronto direto
- ✅ Avaliação configurável por posição + 9 rankings
- ⏳ Campo tático interativo, escalações, estratégias por adversário (tabelas `lineups`/`lineup_players`/`formations` prontas)
- ⏳ Histórico de vencedores por temporada (premiações fechadas)

## Fase 4 — Integração EA FC ⏳
Pesquisa e plano em `EA_FC_INTEGRATION.md`. Tabela `synchronization_logs` e deduplicação (`matches_external_uq`) prontas.

## Fase 5 — Competições e calendário ⏳
Tabelas `competitions`, `competition_teams`, `competition_fixtures`, view `standings` (testada) e `calendar_events` prontas.

## Fase 6 — Comunicação 🟡
- ✅ Avisos com prioridade, categoria, visibilidade (público/membros/comissão), agendamento e validade
- ⏳ Convocações, confirmação de presença, disponibilidade, notificações no app e push

## Fase 7 — Expansão ⏳
Central de mídia (artes), IA, scouting, relatórios avançados.
