// End-to-end smoke test. Run against a DISPOSABLE database:
//   BASE_URL=http://localhost:3100 E2E_EMAIL=... E2E_PASSWORD=... node tests/e2e/smoke.mjs
// It creates test records (season, players, match) — never point it at production.
import { createRequire } from "node:module";
// Uses the globally available Playwright (or a local install).
const { chromium } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const email = process.env.E2E_EMAIL, password = process.env.E2E_PASSWORD;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const step = (m) => console.log("•", m);

async function login(p, e, pw) {
  await p.goto(`${BASE}/login`);
  await p.fill("#email", e);
  await p.fill("#password", pw);
  await p.click("button[type=submit]");
  await p.waitForURL(`${BASE}/app`);
}

step("wrong password is rejected");
await page.goto(`${BASE}/login`);
await page.fill("#email", email);
await page.fill("#password", "wrong-password-1");
await page.click("button[type=submit]");
await page.getByText("E-mail ou senha incorretos.").waitFor();

step("president logs in");
await login(page, email, password);
await page.getByText("Nenhuma temporada atual definida").waitFor();

step("create season");
await page.goto(`${BASE}/app/admin/temporadas`);
await page.fill("#name-new", "E2E 1");
await page.fill("#division-new", "Divisão 3");
await page.fill("#startsOn-new", "2026-10-01");
await page.click("text=Criar temporada");
await page.getByText("Temporada salva.").waitFor();

step("create players");
const players = [["Teste Atacante", "e2e_st", "9", "ST"], ["Teste Meia", "e2e_cm", "8", "CM"], ["Teste Zagueiro", "e2e_cb", "4", "CB"]];
for (const [full, nick, num, pos] of players) {
  await page.goto(`${BASE}/app/elenco/novo`);
  await page.fill("#fullName", full);
  await page.fill("#nickname", nick);
  await page.fill("#shirtNumber", num);
  await page.selectOption("#primaryPosition", pos);
  await page.click("text=Salvar jogador");
  await page.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);
}
step("duplicate shirt number is rejected");
await page.goto(`${BASE}/app/elenco/novo`);
await page.fill("#fullName", "Duplicado");
await page.fill("#nickname", "dup");
await page.fill("#shirtNumber", "9");
await page.selectOption("#primaryPosition", "GK");
await page.click("text=Salvar jogador");
await page.getByText("Número de camisa já está em uso.").waitFor();

step("register finished match 3-1");
await page.goto(`${BASE}/app/partidas/nova`);
await page.fill("#opponentName", "Adversário E2E");
await page.fill("#kickoff", "2026-11-20T21:00");
await page.selectOption("#status", "finished");
await page.fill("#goalsFor", "3");
await page.fill("#goalsAgainst", "1");
await page.click("text=Salvar partida");
await page.waitForURL(/\/app\/partidas\/[0-9a-f-]{36}$/);
const matchUrl = page.url();

step("fill match sheet; over-attribution is rejected");
await page.click("text=Todos");
const rows = page.locator("ul.space-y-2 > li");
assert.equal(await rows.count(), 3);
const st = rows.filter({ hasText: "e2e_st" });
const cm = rows.filter({ hasText: "e2e_cm" });
await st.getByLabel("Gols").fill("4");
await page.click("text=Salvar súmula");
await page.getByText(/maior que o placar do clube/).waitFor();
await st.getByLabel("Gols").fill("2");
await cm.getByLabel("Gols").fill("1");
await st.getByLabel("Assist.").fill("1");
await cm.getByLabel("Assist.").fill("2");
await cm.getByRole("button", { name: /Detalhes/ }).click();
await cm.getByLabel("Passes tentados").fill("40");
await cm.getByLabel("Passes certos").fill("36");
await page.click("text=Salvar súmula");
await page.getByText("Súmula salva.").waitFor();

step("dashboard shows record and highlights");
await page.goto(`${BASE}/app`);
await page.getByText("Temporada E2E 1").waitFor();
const scorer = page.locator("article", { hasText: "Artilheiro" });
await scorer.getByText("e2e_st").waitFor();
const assister = page.locator("article", { hasText: "Melhor assistente" });
await assister.getByText("e2e_cm").waitFor();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/dashboard-desktop.png`, fullPage: true });

step("rankings & roster render");
await page.goto(`${BASE}/app/rankings`);
await page.getByText("Mais decisivos").waitFor();
await page.goto(`${BASE}/app/elenco?sort=ga`);
await page.locator("table").getByText("e2e_cm").waitFor();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/roster-desktop.png` });
await page.goto(matchUrl);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/match-desktop.png`, fullPage: true });

step("publish urgent announcement");
await page.goto(`${BASE}/app/avisos`);
await page.fill("#title", "Treino extra E2E");
await page.fill("#body", "Aviso de teste.");
await page.selectOption("#priority", "urgent");
await page.click("text=Publicar comunicado");
await page.getByText("Comunicado publicado.").waitFor();

step("create player account and check restrictions");
await page.goto(`${BASE}/app/admin/usuarios`);
await page.fill("#displayName", "Jogador E2E");
await page.fill("#email", "jogador.e2e@ascend.test");
await page.getByRole("button", { name: "Adicionar membro" }).click();
await page.getByText("Senha temporária").waitFor();
const tmp = (await page.locator("code.select-all").textContent()).trim();

const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mobile = await ctx2.newPage();
await login(mobile, "jogador.e2e@ascend.test", tmp);
if (SHOTS) await mobile.screenshot({ path: `${SHOTS}/dashboard-mobile.png`, fullPage: true });
await mobile.goto(`${BASE}/app/admin/usuarios`);
await mobile.waitForURL(`${BASE}/app/sem-permissao`);
await mobile.goto(`${BASE}/app/elenco/novo`);
await mobile.waitForURL(`${BASE}/app/sem-permissao`);
await mobile.goto(matchUrl);
assert.equal(await mobile.getByText("Salvar súmula").count(), 0, "player must not see sheet editor");
assert.equal(await mobile.getByText("Excluir").count(), 0, "player must not see delete");

step("public page");
await page.goto(`${BASE}/`);
await page.getByText("RISE. CONQUER. ASCEND.").first().waitFor();
assert.equal(await page.getByText("Treino extra E2E").count(), 0, "members-only notice must not be public");

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E smoke passed");
await browser.close();
