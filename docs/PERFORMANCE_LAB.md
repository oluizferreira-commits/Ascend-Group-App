# Ascend Performance Lab

Centro de desenvolvimento individual: análise de desempenho, diagnósticos automáticos, treinador por tema,
construtor de builds e acompanhamento da evolução. Acesso pela aba **Lab** (barra inferior) ou pelo menu
lateral (`/app/lab`).

## Princípios

- **Nada inventado.** Métricas vêm de `player_statistics` (EA + súmula manual). `NULL` = não registrado,
  nunca zero. Métrica sem amostra mínima aparece como “—”. O que a EA não publica aparece em
  “Dados indisponíveis”.
- **Sem custos falsos.** Não existe tabela verificada de custos de atributos do FC 27 Clubs →
  o construtor roda em *modo planejamento* com o aviso “Orçamento não validado” (`COSTS = null`).
- **Explicável e determinístico.** Regras transparentes, sem IA paga. Cada alerta mostra evidência,
  interpretação, causas possíveis, recomendações, nível de confiança e o período/fonte dos dados.
- **Privado.** Cada jogador vê e edita só o próprio Lab. Quem tem `reports.view` (presidência,
  administração, treinadores, auxiliar, analista) vê qualquer jogador **somente leitura**.
  Nada é exposto ao resto do elenco; comparações por posição mostram só a média do grupo.

## Dados da EA usados (FC 27, verificados em nov/2026)

Por jogador e partida (`clubs/matches`): gols, assistências, chutes, passes tentados/completos,
**desarmes tentados/certos** (`tackleattempts`/`tacklesmade` → eficiência), defesas, gols sofridos,
jogo sem sofrer gols, cartão vermelho, nota, craque da partida, tempo em campo, **id do arquétipo**
(`archetypeid`, guardado em `player_statistics.extra`) e tipos de defesa do goleiro (também em `extra`).

Não publicados pela EA: dribles, perdas de posse, passes decisivos, tipo de passe, atributos da build
(`vproattr` vem oculto). Chutes no alvo, interceptações e cortes só existem quando registrados na súmula.

## Módulos

| Responsabilidade | Arquivo |
| --- | --- |
| Game Data Registry (atributos, estilos de jogo, arquétipos, custos) | `src/lib/lab/game-data.ts` |
| Statistics Analyzer (métricas, janelas, séries) | `src/lib/lab/metrics.ts` |
| Diagnostic Engine (tendências, alertas, prioridades, comparação por posição) | `src/lib/lab/diagnostics.ts` |
| Training Recommendations (12 temas × variantes) | `src/lib/lab/trainer.ts` |
| Build Builder / Optimizer / Comparator | `src/lib/lab/builder.ts` |
| Player Progress (períodos, antes/depois, metas, conquistas) | `src/lib/lab/progress.ts` |
| Acesso, leitura de partidas, builds/planos/eventos | `src/server/services/lab.ts` |
| Ações (salvar build, principal, “comecei a usar”, planos, objetivos) | `src/server/actions/lab.ts` |
| Telas | `src/app/app/lab/**` · componentes em `src/components/lab/` |

Tabelas (migração `0008_performance_lab`): `lab_builds`, `lab_plans`, `lab_events`; colunas novas
`player_statistics.tackles_attempted` e `player_statistics.extra`.

## Método do analista

- Janelas: última partida, últimas 5, últimas 10, histórico. Razões usam a soma da janela
  (Σ certos ÷ Σ tentados). “Por jogo” = por 90 min nas partidas da EA.
- Tendência: últimas 5 × **todas as anteriores** (sem sobreposição, mínimo 5). A diferença é testada contra
  a variação normal do jogador: `z = (recente − base) / (σ_base / √n)`. |z| ≥ 2 com amostra cheia → confiança
  alta; ≥ 1,4 → média; abaixo disso, nada é dito. Também é exigida uma mudança mínima prática
  (ex.: 4 p.p. de precisão de passe).
- Só métricas relevantes para o grupo de posição do jogador são diagnosticadas.
- Ressalvas embutidas: queda de precisão com mais passes tentados é interpretada como passe mais
  arriscado; queda do goleiro considera a defesa à frente; antes/depois de build avisa que outros fatores influenciam.

## Fluxo integrado

Analista detecta → alerta com link “Ver plano de desenvolvimento” → Treinador abre o tema/variante →
“Salvar plano” (metas calculadas a partir das últimas 10 partidas) → “Melhorar minha build” abre o
construtor com o foco do plano → build salva → “Comecei a usar” → Evolução compara antes × depois.

## Motor de pontos (AP)

Módulo puro e independente da interface: `src/lib/lab/ap-engine.ts` (testes em `tests/ap-engine.test.ts`).

- **Tabelas por (versão do jogo, temporada, arquétipo, revisão)** — `lab_cost_tables`. Cada atributo tem
  `base` (valor inicial do arquétipo), `max` (limite do arquétipo) e `costs[]` (custo de cada +1, de `base` até `max`).
  Arquétipos diferentes têm tabelas diferentes; nada é compartilhado por suposição.
- **Custo de A→B** = soma de `costs` de cada incremento entre A e B, consultando a tabela passo a passo.
  Remover níveis devolve exatamente o custo deles.
- **Orçamento** = `levelBudget[nível]` da tabela verificada. Nível sem valor → orçamento desconhecido (nunca extrapolado).
- **Valores**: `base` + níveis **comprados** (o que custa AP) + **modificadores** de altura/peso/especialização
  (só os declarados na tabela) = valor **exibido**. Modificadores nunca alteram custo nem níveis comprados.
- **Validação**: impede compras acima do limite do arquétipo e acima dos pontos disponíveis (no editor e de novo
  no servidor ao salvar). Uma build só é “validada” com tabela verificada, sem erros, cobrindo todos os atributos e
  com o orçamento do nível.
- **Otimizador**: programação dinâmica exata (mochila de múltipla escolha) que maximiza a soma ponderada de níveis
  comprados pelas prioridades do gerador, respeitando orçamento, limites e mínimos. Como os custos são progressivos,
  a distribuição segue a curva real de custos — sem porcentagens fixas.

### Painel de tabelas (Administração → Custos de builds)

Permissão `gamedata.manage` (presidência, administração, analista).

1. **Baixar modelo** (JSON com todos os atributos) e preencher só com valores de fonte verificada.
2. **Importar** → entra como **rascunho** (próxima revisão para aquela versão/temporada/arquétipo). Revisão automática
   aponta erros (faixas, tamanho da lista de custos, custos negativos) e avisos (atributos sem regra, custos que
   diminuem, sem orçamento).
3. **Marcar como verificada** exige fonte, data e confirmação explícita. Tabelas verificadas são **imutáveis**
   (trigger no banco); correções são **nova revisão**. Rascunhos não podem ser usados em builds salvas.
4. Builds guardam a revisão exata usada (`lab_builds.cost_table_id`) e o resultado do cálculo (`validation`).
   Arquivar ou publicar uma revisão nova não muda builds antigas; a tela avisa que existe revisão mais nova.

O antigo `COSTS` de `game-data.ts` continua `null`: sem tabela selecionada o construtor fica em modo planejamento.

## Extensões previstas

- Análise coletiva / relatórios para capitães: reutilizar `labAnalysis` por jogador e agregar.
- Metas de temporada: `lab_plans` com `origin = "season"`.
- Novos diagnósticos: adicionar regra em `diagnose()` (e métrica em `METRICS` se necessário).
- Novos temas do Treinador: adicionar em `TOPICS` (o teste valida atributos/estilos/métricas).
- Atualizações do EA FC: `GAME_VERSION`, `PLAYSTYLES`, `ATTRIBUTES` no registry.

## Testes

`tests/lab.test.ts` (núcleo) e `tests/e2e/lab.mjs` (fluxos completos, privacidade e somente leitura).
