# Roadmap e status

Legenda: ✅ pronto e testado · 🟡 parcial · ⏳ não iniciado

## Fase 1 — Fundação ✅
- ✅ Next.js 16 + TypeScript + Tailwind 4, PWA (manifest, service worker, página offline)
- ✅ PostgreSQL com 26 tabelas + view `standings`, migrações versionadas, gatilhos de proteção
- ✅ Autenticação (login, logout, recuperação e troca de senha, limite de tentativas)
- ✅ 7 cargos, 25 permissões, verificação no servidor, auditoria imutável
- ✅ Identidade visual (preto / bordô / dourado, Barlow Condensed + Inter)
- ✅ Escudo oficial instalado (original preservado) e ícones do PWA gerados

## Fase 2 — Gestão do clube ✅
- ✅ Painel: escudo, organização, temporada, divisão, posição, campanha, aproveitamento, próxima partida, últimos resultados
- ✅ 5 destaques: melhor jogador, artilheiro, melhor assistente, mais decisivos, avisos
- ✅ Elenco: cadastro/edição, perfis completos, filtros (temporada, posição, situação, mín. de partidas, ordenação)
- ✅ Perfil: totais, médias, nota, evolução, histórico por partida e por temporada
- ✅ Usuários e cargos (criação de conta com senha temporária, edição de cargos, remoção)
- ✅ Temporadas

## Fase 3 — Sistema esportivo ✅
- ✅ Partidas: cadastro, resultado, estatísticas coletivas, súmula individual, exclusão auditada
- ✅ Histórico: filtros por temporada/competição/adversário, confronto direto
- ✅ Avaliação configurável por posição + 9 rankings
- ✅ Campo tático interativo (tocar/arrastar), 6 formações, titulares, reservas, capitão e cobradores, estratégias por adversário
- ✅ Histórico de vencedores por temporada
- ⏳ Editor de formações personalizadas (estrutura no banco pronta)

## Fase 4 — Integração EA FC ✅
- ✅ Endpoints verificados com o FC 27 (Ascend CF, clubId 2292864)
- ✅ Importador idempotente, vínculo por nome EA, reprocessamento, histórico de importações
- ✅ Tela administrativa, sincronização manual, rota agendada (cron), agente local, importação de JSON
- ✅ Importação do elenco da EA (criar/vincular jogadores)
- ⏳ Atualizar divisão/posição da temporada automaticamente a partir da EA

## Fase 5 — Competições e calendário ✅
- ✅ Competições (formatos, pontuação, grupos), participantes, jogos/rodadas, classificação automática, artilharia
- ✅ Jogo do Ascend vinculado à partida → placar entra na tabela automaticamente
- ✅ Calendário (partidas, treinos, reuniões)

## Fase 6 — Comunicação ✅
- ✅ Avisos com prioridade, categoria, visibilidade (público/membros/comissão), agendamento e validade
- ✅ Convocações, confirmação/recusa pelo jogador, presença/ausência, disponibilidade por período
- ✅ Notificações no app (sino) e Web Push: convocação, mudança de horário, nova partida, resultado, comunicado, aviso urgente

## Fase 7 — Expansão 🟡
- ✅ Central de mídia: 10 modelos (resultado, MVP, escalação, convocação, artilheiro, assistente, melhor jogador, premiações, contratação, apresentação) em 4 formatos
- ⏳ IA, scouting, relatórios avançados
