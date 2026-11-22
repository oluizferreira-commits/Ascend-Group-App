// E2E for personalization, FUT card and the comparator. Run after the other E2E scripts (same DISPOSABLE DB).
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const sharp = require(process.cwd() + "/node_modules/sharp");

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

step("find players");
await page.goto(`${BASE}/app/elenco?status=all`);
const idOf = async (nick) => (await page.locator("table a", { hasText: nick }).first().getAttribute("href")).split("/").pop();
const st = await idOf("e2e_st"), cm = await idOf("e2e_cm");

step("comparator renders cards, score, radar and rows");
await page.goto(`${BASE}/app/comparar?a=${st}&b=${cm}&season=all`);
await page.getByText("categorias vencidas").waitFor();
await page.getByRole("img", { name: /Radar de atributos/ }).waitFor();
await page.getByText("Gols por jogo").first().waitFor();
await page.getByText("Juntos em campo").waitFor();
await page.waitForTimeout(1500);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/compare-desktop.png`, fullPage: true });

step("share images are PNGs");
for (const u of [`/api/card/${st}`, `/api/compare?a=${st}&b=${cm}&season=all`]) {
  const r = await page.request.get(BASE + u);
  assert.equal(r.status(), 200, `${u} → ${r.status()} ${await r.text().catch(() => "")}`);
  const m = await sharp(await r.body()).metadata();
  assert.equal(m.format, "png"); assert.equal(m.width, 1080); assert.equal(m.height, 1350);
  if (SHOTS) (await import("node:fs")).writeFileSync(`${SHOTS}/share-${u.includes("compare") ? "compare" : "card"}.png`, await r.body());
}

step("link a player account to e2e_st (#9)");
await page.goto(`${BASE}/app/admin/usuarios`);
await page.fill("#displayName", "Camisa Nove");
await page.fill("#email", "camisa9@ascend.test");
await page.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await page.locator("code.select-all").textContent()).trim();
await page.goto(`${BASE}/app/elenco/${st}/editar`);
await page.selectOption("#userId", { label: "Camisa Nove (camisa9@ascend.test)" });
await page.click("text=Salvar jogador");
await page.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

step("the player sees an app personalised with number 9 (mobile)");
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); } catch {} });
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(`${BASE}/login`);
await m.fill("#email", "camisa9@ascend.test"); await m.fill("#password", tmp);
await m.click("button[type=submit]"); await m.waitForURL(`${BASE}/app`);
await m.getByText("Bem-vindo, camisa 9").waitFor();
await m.getByText("Minha temporada").first().waitFor();
const tab = m.getByRole("navigation", { name: "Atalhos" }).getByRole("link", { name: /Eu/ });
assert.match(await tab.innerText(), /9/);
await m.waitForTimeout(1200);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/personal-dashboard.png` });
await tab.click();
await m.waitForURL(`${BASE}/app/eu`);
await m.getByRole("img", { name: /Carta de e2e_st/ }).waitFor();
await m.locator("main").getByText("Camisa 9").first().waitFor();
await m.waitForTimeout(1200);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/personal-eu.png`, fullPage: true });
const [sw, iw] = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
assert.ok(sw <= iw + 1, "no horizontal overflow on /app/eu");
await m.goto(`${BASE}/app/comparar?a=${st}&b=${cm}`);
await m.getByText("categorias vencidas").waitFor();
const [sw2, iw2] = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
assert.ok(sw2 <= iw2 + 1, "no horizontal overflow on the comparator (mobile)");
await m.waitForTimeout(1200);
if (SHOTS) await m.screenshot({ path: `${SHOTS}/compare-mobile.png`, fullPage: true });

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E personal passed");
await browser.close();
