// E2E for the AP engine + cost-table admin. Uses a SYNTHETIC table ("Teste E2E") on the disposable DB only.
// Run after lab.mjs.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];
const init = () => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} };
const ARCH = `Teste E2E ${Date.now().toString(36)}`;

const admin = await browser.newPage({ viewport: { width: 1360, height: 950 } });
admin.on("pageerror", (e) => errors.push(e.message));
await admin.addInitScript(init);
await admin.goto(`${BASE}/login`);
await admin.fill("#email", process.env.E2E_EMAIL); await admin.fill("#password", process.env.E2E_PASSWORD);
await admin.locator("#password").press("Enter"); await admin.waitForURL(`${BASE}/app`);

step("template download");
const tpl = await admin.request.get(`${BASE}/api/lab/modelo-custos`);
assert.equal(tpl.status(), 200);
const template = await tpl.json();
const keys = Object.keys(template.attrs);
assert.ok(keys.length >= 30 && keys.includes("vision"));

step("import a synthetic table as draft");
const prog = (base, max) => Array.from({ length: max - base }, (_, i) => (base + i < 70 ? 1 : base + i < 80 ? 2 : 3));
const data = { attrs: Object.fromEntries(keys.map((k) => [k, { base: 60, max: 90, costs: prog(60, 90) }])), levelBudget: { "10": 40, "20": 80 }, modifiers: { heightCm: [{ min: 150, max: 175, deltas: { agility: 4 } }] } };
const dir = mkdtempSync(join(tmpdir(), "ap-"));
const file = join(dir, "tabela.json");
writeFileSync(file, JSON.stringify(data));
await admin.goto(`${BASE}/app/admin/custos-builds`);
await admin.fill("#season", "Temporada teste");
await admin.fill("#archetype", ARCH);
await admin.fill("#source", "Dados sintéticos de teste");
await admin.locator("input[name=file]").setInputFiles(file);
await admin.getByRole("button", { name: "Importar como rascunho" }).click();
await admin.waitForURL(/\/app\/admin\/custos-builds\/[0-9a-f-]{36}\?importada=1/);
const t1 = admin.url().split("/").pop().split("?")[0];
await admin.getByText("Rascunho", { exact: true }).first().waitFor();
await admin.getByText(/Estrutura completa/).waitFor();

step("verification needs explicit confirmation");
await admin.getByRole("button", { name: "Marcar como verificada" }).click();
await admin.getByText(/Confirme que conferiu/).waitFor();
await admin.locator("input[name=confirm]").check();
await admin.getByRole("button", { name: "Marcar como verificada" }).click();
await admin.getByText(/Tabela verificada\./).waitFor();
await admin.reload();
assert.equal(await admin.getByRole("button", { name: "Marcar como verificada" }).count(), 0, "verified tables are no longer editable");

step("a player builds with the engine (buy, refund, optimise, validate)");
await admin.goto(`${BASE}/app/admin/usuarios`);
await admin.fill("#displayName", "AP Jogador");
await admin.fill("#email", `ap.${Date.now().toString(36)}@ascend.test`);
const email = await admin.locator("#email").inputValue();
await admin.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await admin.locator("code.select-all").textContent()).trim();
await admin.goto(`${BASE}/app/elenco?status=all`);
const cm = (await admin.locator("table a", { hasText: "e2e_cm" }).first().getAttribute("href")).split("/").pop();
await admin.goto(`${BASE}/app/elenco/${cm}/editar`);
await admin.selectOption("#userId", { label: `AP Jogador (${email})` });
await admin.click("text=Salvar jogador");
await admin.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

const ctx = await browser.newContext({ ...devices["iPhone 14"] });
await ctx.addInitScript(init);
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(`${BASE}/login`);
await m.fill("#email", email); await m.fill("#password", tmp);
await m.locator("#password").press("Enter"); await m.waitForURL(/\/app/);
await m.goto(`${BASE}/app/lab/builds/nova`);
await m.fill("input[name=name]", "Build AP");
const tableSelect = m.locator("select").filter({ hasText: "Nenhuma — modo planejamento" });
const optValue = await tableSelect.locator("option", { hasText: ARCH }).first().getAttribute("value");
await tableSelect.selectOption(optValue);
await m.fill("input[name=level]", "10");
await m.getByRole("tab", { name: /Passe/ }).click();
for (let i = 0; i < 12; i++) await m.getByRole("button", { name: "Comprar nível de Visão de jogo" }).click();
const gastos = () => m.locator("dt", { hasText: "Gastos" }).locator("xpath=following-sibling::dd").innerText();
assert.equal(await gastos(), "14"); // 10×1 + 2×2
for (let i = 0; i < 3; i++) await m.getByRole("button", { name: "Remover nível de Visão de jogo" }).click();
assert.equal(await gastos(), "9"); // refund 2+2+1
await m.getByText("Build validada pela tabela verificada.").waitFor();
await m.getByRole("button", { name: "Distribuir pontos automaticamente" }).click();
await m.getByText(/de 40 AP usados/).waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/ap-builder.png`, fullPage: true });
await m.getByRole("button", { name: "Salvar build" }).click();
await m.waitForURL(/\/app\/lab\/builds\/[0-9a-f-]{36}\?salvo=1/);
const buildUrl = m.url().split("?")[0];
await m.getByText(new RegExp(`${ARCH} · Temporada teste · rev\\. 1`)).first().waitFor();
await m.getByText("validada", { exact: true }).waitFor();

step("server refuses an over-budget build (level without enough AP)");
await m.fill("input[name=level]", "10");
await m.getByRole("tab", { name: /Finalização/ }).click();
const buy = m.getByRole("button", { name: "Comprar nível de Finalização" });
for (let i = 0; i < 30 && await buy.isEnabled(); i++) { await buy.click(); if (await m.getByRole("alert").count()) break; }
await m.getByRole("alert").filter({ hasText: /Pontos insuficientes/ }).waitFor();

step("a new revision does not change the old build");
await admin.goto(`${BASE}/app/admin/custos-builds/${t1}`);
await admin.getByRole("button", { name: "Nova revisão" }).click();
await admin.waitForURL((u) => /\/app\/admin\/custos-builds\/[0-9a-f-]{36}$/.test(u.pathname) && !u.pathname.endsWith(t1));
const t2 = admin.url().split("/").pop();
assert.notEqual(t2, t1);
await admin.getByText(/rev\. 2/).first().waitFor();
assert.equal(await admin.locator("#source").inputValue(), "", "each revision needs its own source");
await admin.fill("#source", "Dados sintéticos de teste (rev. 2)");
await admin.locator("input[name=confirm]").check();
await admin.getByRole("button", { name: "Marcar como verificada" }).click();
await admin.getByText(/Tabela verificada\./).waitFor();
await admin.goto(`${BASE}/app/admin/custos-builds/${t1}`);
admin.once("dialog", (d) => d.accept());
await admin.getByRole("button", { name: "Arquivar" }).click();
await admin.getByText("Arquivada", { exact: true }).first().waitFor();
await m.goto(buildUrl);
await m.getByText(new RegExp(`rev\\. 1.*arquivada`)).first().waitFor();
await m.getByText(/existe a rev\. 2 verificada; esta build continua com os números da rev\. 1/).waitFor();

assert.deepEqual(errors, [], "no page errors");
await browser.close();
console.log("✔ E2E ap passed");
