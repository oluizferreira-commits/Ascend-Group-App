// E2E for delivery 2: match day, reminders, "Tô dentro", MVP vote, polls.
// Run after the other E2E scripts on the same DISPOSABLE DB, with the server started with REMINDER_THROTTLE_MS=0.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); } catch {} });
await page.goto(`${BASE}/login`);
await page.fill("#email", process.env.E2E_EMAIL); await page.fill("#password", process.env.E2E_PASSWORD);
await page.click("button[type=submit]"); await page.waitForURL(`${BASE}/app`);

step("player account #8 linked to e2e_cm");
await page.goto(`${BASE}/app/admin/usuarios`);
await page.fill("#displayName", "Camisa Oito");
await page.fill("#email", "camisa8@ascend.test");
await page.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await page.locator("code.select-all").textContent()).trim();
await page.goto(`${BASE}/app/elenco?status=all`);
const cm = (await page.locator("table a", { hasText: "e2e_cm" }).first().getAttribute("href")).split("/").pop();
await page.goto(`${BASE}/app/elenco/${cm}/editar`);
await page.selectOption("#userId", { label: "Camisa Oito (camisa8@ascend.test)" });
await page.click("text=Salvar jogador");
await page.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

step("schedule a match in ~60 min and call up the squad");
const sp = new Date(Date.now() + 60 * 60_000 - 3 * 3600_000).toISOString().slice(0, 16); // São Paulo local time
await page.goto(`${BASE}/app/partidas/nova`);
await page.fill("#opponentName", "Rival do Dia");
await page.fill("#kickoff", sp);
await page.click("text=Salvar partida");
await page.waitForURL(/\/app\/partidas\/[0-9a-f-]{36}$/);
await page.getByRole("button", { name: "Convocação" }).click();
await page.waitForURL(/\/app\/calendario\/[0-9a-f-]{36}$/);
await page.getByRole("button", { name: "Convocar selecionados" }).click();
await page.getByText(/convocado\(s\)/).waitFor();

step("poll on an announcement");
await page.goto(`${BASE}/app/avisos`);
await page.fill("#title", "Jogo hoje");
await page.fill("#body", "Quem vai?");
await page.getByText("+ Enquete rápida").click();
await page.locator("input[name=pollEnabled]").check();
await page.getByRole("button", { name: "Publicar comunicado" }).click();
await page.getByText("Comunicado publicado.").waitFor();

step("player: match day hero, reminder, Tô dentro");
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); } catch {} });
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(`${BASE}/login`);
await m.fill("#email", "camisa8@ascend.test"); await m.fill("#password", tmp);
await m.click("button[type=submit]"); await m.waitForURL(`${BASE}/app`);
await m.getByText("Dia de jogo").first().waitFor();
await m.getByText(/Rival do Dia/i).first().waitFor();
await m.getByRole("button", { name: "Tô dentro!" }).click();
await m.getByText("Você está dentro").waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/matchday-mobile.png` });
let found = false;
for (let i = 0; i < 10 && !found; i++) {
  await m.goto(`${BASE}/app/notificacoes`);
  found = (await m.getByText(/Jogo em 1 hora: vs Rival do Dia/).count()) > 0;
  if (!found) await m.waitForTimeout(1500);
}
assert.ok(found, "1-hour match reminder delivered");

step("MVP vote (cannot vote for self)");
await m.goto(`${BASE}/app`);
await m.getByText("Vote no craque da partida").waitFor();
await m.getByText("Vote no craque da partida").click();
await m.waitForURL(/\/app\/partidas\/[0-9a-f-]{36}#craque$/);
assert.ok(await m.getByRole("button", { name: /e2e_cm/ }).isDisabled(), "own card disabled");
await m.getByRole("button", { name: /e2e_st/ }).click();
await m.getByText("Você pode mudar seu voto até o encerramento.").waitFor();
if (SHOTS) await m.locator("#craque").screenshot({ path: `${SHOTS}/mvp-vote.png` });

step("poll vote");
await m.goto(`${BASE}/app/avisos`);
await m.getByRole("button", { name: /^Vou/ }).first().click();
await m.getByText("1 voto(s)").first().waitFor();

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E matchday passed");
await browser.close();
