// E2E for the Performance Lab: navigation, analysis, trainer plan, build builder (generator, save, compare,
// start using), history, privacy (players only see their own Lab; staff read-only). Run LAST (relinks e2e_st).
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];
const init = () => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} };

const admin = await browser.newPage({ viewport: { width: 1360, height: 950 } });
admin.on("pageerror", (e) => errors.push(e.message));
await admin.addInitScript(init);
await admin.goto(`${BASE}/login`);
await admin.fill("#email", process.env.E2E_EMAIL); await admin.fill("#password", process.env.E2E_PASSWORD);
await admin.locator("#password").press("Enter"); await admin.waitForURL(`${BASE}/app`);

step("link a fresh account to e2e_st");
await admin.goto(`${BASE}/app/elenco?status=all`);
const idOf = async (nick) => (await admin.locator("table a", { hasText: nick }).first().getAttribute("href")).split("/").pop();
const st = await idOf("e2e_st"), cm = await idOf("e2e_cm");
await admin.goto(`${BASE}/app/admin/usuarios`);
await admin.fill("#displayName", "Lab Jogador");
await admin.fill("#email", "lab.jogador@ascend.test");
await admin.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await admin.locator("code.select-all").textContent()).trim();
await admin.goto(`${BASE}/app/elenco/${st}/editar`);
await admin.selectOption("#userId", { label: "Lab Jogador (lab.jogador@ascend.test)" });
await admin.click("text=Salvar jogador");
await admin.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

step("player opens the Lab from the bottom bar (mobile)");
const ctx = await browser.newContext({ ...devices["iPhone 14"] });
await ctx.addInitScript(init);
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(`${BASE}/login`);
await m.fill("#email", "lab.jogador@ascend.test"); await m.fill("#password", tmp);
await m.locator("#password").press("Enter"); await m.waitForURL(/\/app/);
await m.goto(`${BASE}/app`);
const dismiss = async () => { const b = m.getByRole("button", { name: "Entendi" }); if (await b.count()) await b.first().click().catch(() => {}); };
await dismiss();
await m.getByRole("navigation", { name: "Atalhos" }).getByRole("link", { name: /Lab/ }).click();
await m.waitForURL(`${BASE}/app/lab`);
await m.getByText("Diagnóstico principal").waitFor();
await m.getByText(/Seu laboratório/).waitFor();
assert.equal(await m.getByText("Somente leitura").count(), 0);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/lab-overview.png`, fullPage: true });

step("analysis lists unavailable metrics instead of inventing them");
await m.goto(`${BASE}/app/lab/analise`);
await m.getByText("Indicadores por período").waitFor();
await m.getByText("Dribles completados").waitFor();

step("trainer: choose a problem, a variant, save the plan, complete a goal");
await m.goto(`${BASE}/app/lab/treinador`);
await m.getByText("O que você quer melhorar no seu jogo?").waitFor();
await m.getByRole("link", { name: /Quero acertar mais passes/ }).click();
await m.waitForURL(/\/app\/lab\/treinador\/passes/);
await m.getByRole("radio", { name: "Passe em profundidade (rasteiro)" }).click();
await m.waitForURL(/v=through/);
await m.getByText("Visão de jogo").first().waitFor();
await m.getByRole("button", { name: /^(Salvar plano|Recomeçar o plano com esta opção)$/ }).click();
await m.getByText("Plano salvo.").waitFor();
const goal = m.getByRole("button", { name: /^Concluir: Criar pelo menos 1 chance/ });
await goal.click();
await m.getByRole("button", { name: /^Desmarcar: Criar pelo menos 1 chance/ }).waitFor();

step("“Melhorar minha build” opens the builder with the recommended priorities");
await m.getByRole("link", { name: "Melhorar minha build" }).click();
await m.waitForURL(/\/app\/lab\/builds\/nova\?foco=passes&v=through/);
await m.getByText("Prioridade máxima").first().waitFor();
await m.fill("input[name=name]", "Build Lab E2E");
await m.getByRole("tab", { name: /Passe/ }).click();
await m.getByLabel("Visão de jogo inicial").fill("60");
await m.getByRole("button", { name: "Aumentar Visão de jogo" }).click();
await m.getByRole("button", { name: "Aumentar Visão de jogo" }).click();
assert.equal(await m.getByLabel("Visão de jogo planejado").inputValue(), "62");
await m.getByRole("button", { name: "Passe incisivo", exact: true }).click();
await m.getByText("Orçamento não validado.").waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/lab-builder.png`, fullPage: true });
await m.getByRole("button", { name: "Salvar build" }).click();
await m.waitForURL(/\/app\/lab\/builds\/[0-9a-f-]{36}\?salvo=1/);
await m.getByText("Build salva.").waitFor();
const buildA = m.url().split("/").pop().split("?")[0];

step("generator reads a free-text brief");
await m.goto(`${BASE}/app/lab/builds/nova`);
await m.fill("input[name=name]", "Build B");
await m.fill("textarea[name=brief]", "Sou segundo atacante. Quero atrair a marcação pelo meio e usar passes em profundidade para os pontas infiltrarem.");
await m.getByRole("button", { name: "Gerar prioridades" }).click();
await m.getByText(/Entendi: .*Segundo atacante/).waitFor();
await m.getByText("Possíveis desvantagens").waitFor();
await m.getByRole("button", { name: "Salvar build" }).click();
await m.waitForURL(/\/app\/lab\/builds\/[0-9a-f-]{36}\?salvo=1/);
const buildB = m.url().split("/").pop().split("?")[0];

step("compare two builds");
await m.goto(`${BASE}/app/lab/builds/comparar?a=${buildA}&b=${buildB}`);
await m.getByText(/Build Lab E2E × Build B/).waitFor();
await m.getByText("Só na A").waitFor();

step("mark a build as in use");
await m.goto(`${BASE}/app/lab/builds/${buildA}`);
await m.getByRole("button", { name: "Registrar início" }).click();
await m.getByText(/Registrado\. O Lab vai comparar/).waitFor();

step("history shows the development timeline");
await m.goto(`${BASE}/app/lab/evolucao`);
await m.getByText("Histórico de desenvolvimento").waitFor();
await m.getByText(/Plano: Passes/).first().waitFor();
await m.getByText(/Começou a usar “Build Lab E2E”/).first().waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/lab-evolution.png`, fullPage: true });

step("privacy: a player cannot open a teammate's Lab");
await m.goto(`${BASE}/app/lab?jogador=${cm}`);
await m.getByText(/Seu laboratório/).waitFor();
assert.equal(await m.getByText("e2e_cm").count(), 0, "teammate data must not leak");

step("staff: player picker and read-only reports");
await admin.goto(`${BASE}/app/lab`);
await admin.getByText(/Escolha um jogador para ver o relatório individual/).waitFor();
await admin.getByRole("link", { name: /e2e_st/ }).first().click();
await admin.getByText("Somente leitura").waitFor();
await admin.goto(`${BASE}/app/lab/treinador/passes?jogador=${st}`);
await admin.getByText("Somente o jogador pode salvar planos e builds.").waitFor();
assert.equal(await admin.getByRole("button", { name: "Salvar plano" }).count(), 0);
await admin.goto(`${BASE}/app/lab/builds/${buildA}?jogador=${st}`);
await admin.getByText("Build Lab E2E").first().waitFor();
assert.equal(await admin.getByRole("button", { name: "Salvar build" }).count(), 0);

assert.deepEqual(errors, [], "no page errors");
await browser.close();
console.log("✔ E2E lab passed");
