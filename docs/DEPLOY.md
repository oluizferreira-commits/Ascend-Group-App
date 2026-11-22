# Publicar a plataforma (gratuito)

Tudo roda em planos gratuitos: **Vercel Hobby** (site), **Neon Free** (banco PostgreSQL, região São Paulo)
e **GitHub Actions** (testes e sincronização com a EA a cada 15 minutos). Nenhum cartão de crédito é necessário.

## 1. Vercel + banco (≈ 5 min)

1. Acesse **vercel.com** → *Sign Up* → **Continue with GitHub**.
2. *Add New… → Project* → importe o repositório **ascend-group-app** → clique **Deploy**.
   (O primeiro deploy vai falhar porque ainda não há banco — é esperado.)
3. No projeto: aba **Storage → Create Database → Neon** (plano Free, região **São Paulo / sa-east-1**)
   → *Connect* ao projeto. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
4. **Settings → Environment Variables** → cole o bloco de variáveis (gerado com `npm run secrets` +
   dados do Presidente; ver `.env.example`) → *Save*.
5. **Deployments → ⋯ → Redeploy**. O build aplica as migrações, cria clube/cargos e a conta do Presidente.
6. Abra o endereço do projeto (ex.: `https://ascend-group-app.vercel.app`), entre com a conta do Presidente
   e **troque a senha** em *Minha conta*.

Se o endereço final for diferente de `APP_URL`, ajuste a variável e faça *Redeploy*.

## 2. Sincronização automática com a EA (≈ 1 min)

No GitHub, repositório → **Settings → Secrets and variables → Actions**:
- aba *Secrets* → **New repository secret**: `SYNC_CRON_SECRET` = mesmo valor usado na Vercel;
- aba *Variables* → **New repository variable**: `APP_URL` = endereço do site.

O workflow `EA FC sync` passa a rodar a cada 15 minutos (dá para disparar manualmente em *Actions*).
Depois, no app: **Integração EA FC** → ID do clube `2292864` → *Buscar elenco na EA* → *Criar jogador* → *Sincronizar agora*.

## 3. Opcional

- **E-mail de recuperação de senha**: configure `SMTP_*` (ex.: Brevo ou Resend, planos gratuitos).
  Sem isso, a diretoria gera uma senha temporária em *Usuários e cargos → Nova senha*.
- **Notificações push**: já funcionam com as chaves `VAPID` do bloco. Cada pessoa ativa em *Minha conta*
  (no iPhone, primeiro instale o app: Compartilhar → Adicionar à Tela de Início).
- **Bloqueio da EA**: se o histórico de importações mostrar 403, use o agente local (`docs/EA_FC_INTEGRATION.md`).

## Limites dos planos gratuitos (suficientes para um clube)

| Serviço | Limite relevante |
|---|---|
| Vercel Hobby | uso não comercial; 100 GB de tráfego/mês |
| Neon Free | 0,5 GB de armazenamento; o banco "dorme" sem uso e acorda em ~1 s |
| GitHub Actions | 2.000 min/mês em repositório privado (sync horária ≈ 720 min) |

Limites mudam — confira nos sites antes de crescer.
