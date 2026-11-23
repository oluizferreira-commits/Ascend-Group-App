# Arquitetura

## Visão geral

```
Navegador / PWA
   │  HTML (Server Components) + Server Actions (POST com verificação de origem do Next.js)
   ▼
Next.js 16 (App Router, Node.js runtime)
   ├─ src/proxy.ts                verificação otimista (sem cookie → /login)
   ├─ src/app/**                  páginas (pt-BR); cada uma chama requirePage(permissão)
   ├─ src/server/actions/**       mutações; cada uma chama requireAction(permissão) + Zod
   ├─ src/server/services/**      consultas, sempre filtradas pelo club_id da sessão
   ├─ src/server/auth/**          sessões, senhas (argon2id), RBAC
   └─ src/lib/**                  domínio puro e testável (avaliação, validação, formações)
   ▼
PostgreSQL (Drizzle ORM + migrações SQL versionadas)
   └─ restrições, gatilhos e view que protegem os dados independentemente do código
```

## Decisões

| Decisão | Motivo |
|---|---|
| **Next.js + Server Actions** em vez de API REST separada | Um único deploy, tipagem ponta a ponta, sem expor endpoints genéricos. Route Handlers serão usados onde há clientes externos (cron da integração EA). |
| **Cache Components desativado** | Quase todas as telas são por usuário/cargo e precisam refletir escritas imediatamente; renderização dinâmica é mais simples e segura. |
| **Drizzle + PostgreSQL puro** em vez de SDK do Supabase | Funciona com qualquer Postgres (Supabase, Neon, local). Sem dependência de fornecedor; o Supabase continua sendo uma ótima opção de hospedagem do banco. |
| **Autenticação própria** (argon2id, sessões opacas no banco) em vez de Supabase Auth | Sessões revogáveis (logout, troca de senha encerra todas), sem chaves no frontend, testável localmente. Token no cookie é aleatório (256 bits); no banco fica apenas o SHA-256. |
| **RBAC em código + espelhado no banco** | `src/server/auth/permissions.ts` é a fonte única; o seed sincroniza `roles/permissions/role_permissions`. |
| **"player_profiles" fundido em `players`** | Relação 1:1; evita join em toda consulta de elenco. |
| **`standings` é uma VIEW** | Classificação sempre derivada dos jogos; impossível ficar dessincronizada. |
| **Estatísticas opcionais são `NULL`** | `NULL` = não registrado ≠ 0. Médias e avaliação ignoram o que não foi registrado. Nunca inventamos valores. |

## Segurança

- **Autenticação**: argon2id (m=19 MiB, t=2), limite de 5 falhas por e-mail / 30 por IP em 15 min,
  tempo constante para e-mails inexistentes, cookie `httpOnly` + `SameSite=Lax` + `Secure` em produção,
  expiração de 14 dias com renovação deslizante.
- **Recuperação de senha**: token de uso único, 30 min, máx. 3/hora, resposta que não revela se o e-mail existe;
  ao redefinir, todas as sessões são encerradas.
- **Autorização**: toda página (`requirePage`) e toda ação (`requireAction`) verifica a permissão no servidor.
  Esconder botões é apenas conveniência. Regras de hierarquia (`checkRoleChange`): só o Presidente gerencia
  Presidente/Administrador; ninguém altera os próprios cargos; o clube sempre mantém um Presidente.
- **Isolamento entre clubes**: o `club_id` vem sempre da sessão, nunca do formulário; além disso, gatilhos no banco
  impedem vincular jogador de um clube a partida/escalação/evento de outro.
- **Auditoria**: `audit_logs` é append-only — um gatilho bloqueia UPDATE/DELETE.
- **Entradas**: Zod em todas as ações; restrições CHECK no banco (placar ≥ 0, no alvo ≤ finalizações, nota 0–10…).
- **Cabeçalhos**: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **PWA**: o service worker nunca guarda páginas ou dados (são por usuário); só arquivos estáticos e a página offline.

Próximos reforços planejados: políticas RLS do Postgres por clube (defesa em profundidade adicional quando houver
múltiplos clubes ativos), CSP com nonce, 2FA para Presidente/Administrador.

## Sistema de avaliação

`src/lib/rating.ts` (função pura, testada):

```
nota_calculada = clamp(6 + Σ peso[grupo][métrica] × valor[métrica], 0, 10)
nota_final     = nota_EA disponível ? w·nota_EA + (1−w)·nota_calculada : nota_calculada
```

- Pesos diferentes por grupo de posição (Goleiro, Defensor, Meio-campista, Atacante), editáveis pela comissão técnica.
- Métricas não registradas não contribuem. Precisão de passe só conta com ≥ 5 passes.
- Prêmios por nota exigem participação mínima (padrão: 30 % das partidas do clube).
- "Mais regular" = média − desvio padrão (≥ 3 jogos).

## Módulos (pastas)

| Módulo | Onde |
|---|---|
| Autenticação | `src/server/auth`, `src/server/actions/auth.ts`, `src/app/(auth)` |
| Organização / temporadas | `src/server/services/club.ts`, `src/app/app/admin/temporadas` |
| Elenco | `src/server/services/players.ts`, `src/server/actions/players.ts`, `src/app/app/elenco` |
| Partidas | `src/server/services/matches.ts`, `src/server/actions/matches.ts`, `src/app/app/partidas` |
| Estatísticas / rankings | `src/lib/rating.ts`, `src/server/services/stats.ts`, `src/app/app/rankings` |
| Comunicação | `src/server/services/announcements.ts`, `src/app/app/avisos` |
| Administração | `src/server/actions/users.ts`, `src/server/actions/admin.ts`, `src/app/app/admin` |
| Escalações, competições, calendário, integração EA, mídia | tabelas já criadas; telas nas próximas fases |

## Design system

Identidade: azul royal (#1c3fb0), azul elétrico (#3a63f0), azul-marinho, preto e prata. Tipografia Barlow Condensed (títulos e números) + Inter (texto).

- **Tokens** (`src/app/globals.css`): escala `ink-*` (neutros que mudam com o tema), `accent-*`, `brand-*`, `silver`, `win/draw/loss` e superfícies `--surface`, `--surface-2`, `--line`, `--line-strong`, `--hl`. Tema claro (branco e azul) e escuro (preto e azul); `.scope-dark` força o escuro dentro de um bloco.
- **Utilitários**: `card` (painel padrão), `tile` (bloco interno), `card-premium` (painel azul do clube, sempre escuro), `glass` / `glass-dark`, `kicker`, `eyebrow`, `btn-*`, `input`, `label`, `data-table`.
- **Componentes** (`src/components/ui/kit.tsx`): `Panel` (cabeçalho com ícone + link), `InfoChip`, `StatStrip`, `FormChip` (V/E/D), `ScoreBox`, `TeamMonogram` (iniciais do adversário — nunca desenhamos escudos de outros clubes), `DateBadge`, `RankMark` (medalhas top 3), `Meter`. Básicos em `src/components/ui/basics.tsx`.
- **Painel**: `HeroCarousel` + `HeroBanner` (`src/components/dashboard/`).
- **Escudo**: `public/brand/ascend-fc-crest.png` é o original e nunca é alterado. `public/brand/generated/crest-clear-*.png` é uma cópia com o fundo preto transparente, usada só em superfícies sempre escuras (`<Crest clear />`).

## Performance Lab

Módulo independente de desenvolvimento individual (`/app/lab`). Lógica pura em `src/lib/lab/`, acesso e dados em
`src/server/services/lab.ts`, ações em `src/server/actions/lab.ts`. Detalhes, método e extensões em
[`docs/PERFORMANCE_LAB.md`](./PERFORMANCE_LAB.md).
