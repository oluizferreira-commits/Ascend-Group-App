import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/crest";

export const metadata: Metadata = { title: "Política de Privacidade e Cookies", description: "Como o Ascend CF trata dados pessoais (LGPD) e quais cookies usa." };

const UPDATED = "22/11/2026";

function H({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} className="mt-10 mb-3 scroll-mt-20 font-display text-2xl font-bold tracking-[0.04em] uppercase">{children}</h2>;
}

export default function PrivacyPage() {
  const contact = process.env.PRIVACY_CONTACT_EMAIL?.trim();
  const how = contact
    ? <>pelo e-mail <a className="text-accent-400 underline" href={`mailto:${contact}`}>{contact}</a></>
    : <>pelos canais oficiais do clube (Instagram, Discord ou WhatsApp da diretoria)</>;
  return (
    <main className="min-h-dvh select-text">
      <header className="scope-dark border-b border-white/5 bg-[#060a16] text-ink-100">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3"><Crest size={36} /><span className="font-display text-lg font-bold tracking-[0.08em] text-white uppercase">Ascend CF</span></Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10 text-[15px] leading-relaxed text-ink-300 [&_b]:text-ink-100 [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5">
        <p className="eyebrow">LGPD · Lei nº 13.709/2018</p>
        <h1 className="mt-2 font-display text-5xl leading-none font-bold tracking-[0.03em] text-ink-100 uppercase">Política de Privacidade e Cookies</h1>
        <p className="mt-3 text-sm text-ink-400">Última atualização: {UPDATED}</p>

        <p className="mt-6">
          Esta política explica como a <b>Ascend Group</b>, organização amadora de esports responsável pelo clube <b>Ascend CF</b>
          (EA SPORTS FC™ Pro Clubs), trata dados pessoais nesta plataforma. A Ascend Group é a <b>controladora</b> dos dados.
          Não vendemos dados, não exibimos anúncios e não usamos rastreadores de terceiros.
        </p>

        <H>1. Quais dados tratamos e por quê</H>
        <ul>
          <li><b>Contas de membros</b> (diretoria, comissão e jogadores): nome, e-mail, senha (guardada apenas de forma criptografada/irreversível), cargo e data do último acesso — para dar acesso à plataforma e controlar permissões. <i>Base legal: legítimo interesse e execução da relação com o clube.</i></li>
          <li><b>Dados esportivos</b>: nickname, nome, posição, número, estatísticas, notas, escalações, convocações, presença e disponibilidade — para a gestão esportiva do clube. <i>Base: legítimo interesse.</i></li>
          <li><b>Dados públicos do EA SPORTS FC</b>: nome no jogo e estatísticas de partidas, obtidos dos dados públicos do Pro Clubs. Não usamos login nem senha da EA. <i>Base: legítimo interesse.</i></li>
          <li><b>“Seja do Ascend”</b> (propostas): nome, idade, local, nick e plataforma, dados de jogo, foto do jogador virtual, contatos (WhatsApp, Discord, e-mail, Instagram), link de vídeo e mensagem — <b>somente para avaliar a proposta e entrar em contato</b>. <i>Base: consentimento</i>, dado no envio.</li>
          <li><b>Segurança</b>: endereço IP em tentativas de login e em ações administrativas (registro de auditoria), e um código irreversível (hash) do IP para limitar envios em massa do formulário público. <i>Base: legítimo interesse e prevenção a fraudes.</i></li>
          <li><b>Notificações</b>: se você ativar, o endereço técnico do seu aparelho para receber avisos (convocações, horários, resultados). Pode ser desativado em <i>Minha conta</i>.</li>
        </ul>

        <H>2. Crianças e adolescentes</H>
        <p>
          O formulário “Seja do Ascend” aceita a partir de <b>13 anos</b>. Menores de 18 anos devem declarar que têm a autorização de um responsável.
          Se um responsável quiser que os dados de um menor sejam apagados, basta pedir {how}.
        </p>

        <H>3. Quem tem acesso</H>
        <ul>
          <li>Dentro do clube, cada pessoa vê apenas o que seu cargo permite. <b>Contatos de propostas</b> são visíveis só para Presidente, Administradores e Treinadores.</li>
          <li><b>Operadores</b> que hospedam a plataforma: <b>Vercel</b> (aplicação) e <b>Neon</b> (banco de dados, região São Paulo). Serviços de push (Apple, Google, Mozilla) recebem o texto das notificações que você ativar.</li>
          <li>Alguns desses serviços podem processar dados fora do Brasil (transferência internacional), com cláusulas de proteção previstas em seus termos.</li>
          <li>Não compartilhamos dados com patrocinadores, anunciantes ou com a EA.</li>
        </ul>

        <H>4. Por quanto tempo guardamos</H>
        <ul>
          <li>Contas e dados esportivos: enquanto a pessoa fizer parte do clube; depois, podem ser removidos a pedido (o histórico de estatísticas pode ser mantido de forma agregada).</li>
          <li>Propostas <b>recusadas</b>: apagadas automaticamente em até <b>6 meses</b>. Propostas aprovadas passam a fazer parte do cadastro do elenco.</li>
          <li>Tentativas de login: <b>30 dias</b>. Sessões expiradas e links de redefinição de senha: apagados automaticamente.</li>
          <li>Registro de auditoria: mantido para segurança e prestação de contas da diretoria.</li>
        </ul>

        <H>5. Seus direitos</H>
        <p>Pela LGPD (art. 18), você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão, portabilidade, informação sobre compartilhamento e revogação do consentimento. Faça o pedido {how}. Respondemos em até 15 dias. Você também pode reclamar à <b>ANPD</b> (Autoridade Nacional de Proteção de Dados).</p>

        <H>6. Segurança</H>
        <p>Conexão criptografada (HTTPS), senhas com hash Argon2id, sessões revogáveis, limite de tentativas de login, controle de acesso por cargo verificado no servidor e registro de auditoria que não pode ser alterado.</p>

        <H id="cookies">7. Cookies e armazenamento local</H>
        <p>Usamos <b>apenas cookies essenciais</b> e preferências — nenhum cookie de publicidade, rastreamento ou análise de terceiros. Por isso eles não dependem de consentimento, mas você pode apagá-los no navegador (isso encerra o login).</p>
        <div className="mt-3 overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Para quê</th><th>Duração</th></tr></thead>
            <tbody>
              <tr><td><code>ascend_session</code></td><td>Manter você conectado (protegido, inacessível a scripts)</td><td>14 dias, renovável</td></tr>
              <tr><td><code>ascend_theme</code></td><td>Lembrar o tema claro/escuro escolhido</td><td>1 ano</td></tr>
              <tr><td><code>ascend_club</code></td><td>Lembrar o clube ativo (contas de mais de um clube)</td><td>sessão</td></tr>
              <tr><td>Armazenamento local</td><td>Saber se você já viu o aviso de cookies e as novidades da versão</td><td>até ser apagado</td></tr>
              <tr><td>Cache do app (PWA)</td><td>Abrir mais rápido e mostrar a página offline (só arquivos do app, nunca dados pessoais)</td><td>até a próxima versão</td></tr>
            </tbody>
          </table>
        </div>

        <H>8. Alterações</H>
        <p>Esta política pode ser atualizada. A data no topo indica a versão vigente; mudanças relevantes serão avisadas no app.</p>

        <H>9. Contato</H>
        <p>Dúvidas ou pedidos sobre seus dados: {how}.</p>

        <p className="mt-12 text-xs text-ink-400">EA SPORTS FC é marca da Electronic Arts Inc. Esta plataforma não é afiliada, patrocinada ou aprovada pela EA.</p>
        <p className="mt-6"><Link href="/" className="text-accent-400 underline">← Voltar ao site do clube</Link></p>
      </article>
    </main>
  );
}
