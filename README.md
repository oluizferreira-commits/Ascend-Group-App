# Ascend Group · Ascend CF — Plataforma de Gestão Esportiva

Plataforma oficial de gestão do **Ascend CF** (EA SPORTS FC™ Pro Clubs).
**RISE. CONQUER. ASCEND.**

Aplicação web responsiva e PWA instalável, com tema claro (branco e azul) e escuro (preto e azul), (desktop, Android e iPhone), com banco de dados
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

O escudo oficial original está em `public/brand/ascend-fc-crest.png` (intocado). Os ícones do PWA e as versões
reduzidas em `public/brand/generated/` são gerados a partir dele:

```bash
npm run brand:assets          # gera ícones do PWA em public/brand/generated/
```

Se o arquivo for removido, a interface mostra um espaço reservado "ESCUDO" — nenhum brasão substituto é desenhado.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão PostgreSQL. No Supabase, use o pooler em modo *session*. |
| `APP_URL` | sim (produção) | URL pública; usada nos links de redefinição de senha. |
| `BOOTSTRAP_PRESIDENT_EMAIL/NAME/PASSWORD` | no 1º setup | Cria a conta inicial do Presidente (senha ≥ 10 caracteres). |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | não | Envio de e-mails de recuperação de senha. Sem SMTP, em desenvolvimento o link aparece no console. |
| `TEST_DATABASE_URL` | testes | Banco descartável para testes de integração (é apagado). |
| `SYNC_CRON_SECRET` | para sync agendada | Token (≥ 24 caracteres) da rota `GET /api/integrations/ea-fc/sync`. |
| `EA_SYNC_TOKEN` | para o agente local | Token (≥ 24 caracteres) da rota `POST /api/integrations/ea-fc/ingest`. |

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

## Implantação (gratuita)

Passo a passo em **[docs/DEPLOY.md](docs/DEPLOY.md)**: Vercel (site) + Neon (banco, São Paulo) + GitHub Actions
(CI e sincronização horária com a EA). `vercel.json` já aplica migrações e seed a cada deploy.
Gere as chaves com `npm run secrets`.

## Atualizações do app

Cada deploy tem uma versão própria (commit). O app verifica `/api/version` a cada minuto e ao voltar para a tela;
se houver versão nova, mostra **“Nova versão disponível — Atualizar”**. Depois da atualização, exibe uma vez o
quadro **“O que há de novo”** com a primeira entrada de `src/lib/changelog.ts` — adicione uma entrada ali a cada novidade.

## Privacidade (LGPD)

Política em `/privacidade` (inclui cookies). Defina `PRIVACY_CONTACT_EMAIL` para exibir o e-mail de contato.
Retenção automática: propostas recusadas (6 meses), tentativas de login (30 dias), sessões e links expirados.

## Integração com EA FC

Implementada e verificada com o FC 27 (clube **Ascend CF**, `clubId 2292864`, nova geração).
Configure em **Administração → Integração EA FC**. Detalhes, riscos e agendamento em
[docs/EA_FC_INTEGRATION.md](docs/EA_FC_INTEGRATION.md). O cadastro manual pela súmula continua disponível.
