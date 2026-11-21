# Ascend Group · Ascend FC — Plataforma de Gestão Esportiva

Plataforma oficial de gestão do **Ascend FC** (EA SPORTS FC™ Pro Clubs).
**RISE. CONQUER. ASCEND.**

Aplicação web responsiva e PWA instalável (desktop, Android e iPhone), com banco de dados
relacional, autenticação individual, permissões por cargo verificadas no servidor e no banco,
e registro de auditoria.

> Status por fase: veja [docs/ROADMAP.md](docs/ROADMAP.md). Decisões técnicas: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
> Integração EA FC: [docs/EA_FC_INTEGRATION.md](docs/EA_FC_INTEGRATION.md).

## Requisitos

- Node.js 22+ e npm 10+
- PostgreSQL 14+ (local, Docker, Supabase, Neon…)

## Instalação

```bash
npm install
cp .env.example .env          # edite DATABASE_URL e BOOTSTRAP_PRESIDENT_*
npm run db:setup              # aplica as migrações e cria os dados de referência
npm run dev                   # http://localhost:3000
```

### Escudo oficial

Copie o arquivo **original** do escudo para `public/brand/ascend-fc-crest.png`.
O arquivo nunca é alterado; versões de exibição são geradas a partir dele:

```bash
npm run brand:assets          # gera ícones do PWA em public/brand/generated/
```

Enquanto o arquivo não existir, a interface mostra um espaço reservado "ESCUDO" — nenhum brasão substituto é desenhado.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão PostgreSQL. No Supabase, use o pooler em modo *session*. |
| `APP_URL` | sim (produção) | URL pública; usada nos links de redefinição de senha. |
| `BOOTSTRAP_PRESIDENT_EMAIL/NAME/PASSWORD` | no 1º setup | Cria a conta inicial do Presidente (senha ≥ 10 caracteres). |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | não | Envio de e-mails de recuperação de senha. Sem SMTP, em desenvolvimento o link aparece no console. |
| `TEST_DATABASE_URL` | testes | Banco descartável para testes de integração (é apagado). |
| `EA_FC_PLATFORM`, `EA_FC_CLUB_ID`, `SYNC_CRON_SECRET` | Fase 4 | Integração EA FC (ainda não implementada). |

Nenhuma chave secreta é exposta ao navegador: não existe variável `NEXT_PUBLIC_*`.

## Banco de dados

- Esquema em `src/db/schema/*.ts` (Drizzle ORM), migrações versionadas em `src/db/migrations/`.
- `npm run db:generate` — gera uma nova migração após alterar o esquema.
- `npm run db:migrate` — aplica migrações. `npm run db:seed` — dados de referência (idempotente).
- O seed **não cria jogadores, partidas nem estatísticas**: apenas organização, clube, cargos,
  permissões, formações e pesos padrão de avaliação.

Backup: com Supabase/Neon, os backups automáticos do provedor cobrem o banco. Em servidor próprio,
agende `pg_dump --format=custom "$DATABASE_URL" > ascend-$(date +%F).dump` e teste a restauração
com `pg_restore`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento / build de produção / servidor de produção |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | Testes unitários + integração (integração só roda com `TEST_DATABASE_URL`) |
| `node tests/e2e/smoke.mjs` | Teste ponta a ponta com Playwright (ver cabeçalho do arquivo; use banco descartável) |

## Implantação (baixo custo)

Opção recomendada, gratuita para começar:

1. **Banco**: Supabase (plano Free) ou Neon (Free). Crie o projeto e copie a connection string.
2. **App**: Vercel (plano Hobby) ou qualquer host Node.js (`npm run build && npm start`).
3. Configure as variáveis de ambiente no host, rode `npm run db:setup` uma vez apontando para o banco de produção.
4. Configure SMTP (ex.: Resend, Brevo — possuem planos gratuitos) para recuperação de senha.

Custos: R$ 0 nos planos gratuitos para o tamanho de um clube. Limites e preços dos provedores
mudam — confira antes de contratar. Nenhum serviço pago é exigido pelo código.

## Integração com EA FC

Ainda não implementada (Fase 4). Pesquisa, riscos e plano em [docs/EA_FC_INTEGRATION.md](docs/EA_FC_INTEGRATION.md).
Até lá, partidas e estatísticas são registradas manualmente pela súmula.
