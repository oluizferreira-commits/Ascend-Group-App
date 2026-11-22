// E2E for Bola de Prata / Bola de Ouro. Run after the other E2E scripts on the same DISPOSABLE DB.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const sharp = require(process.cwd() + "/node_modules/sharp");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const spLocal = (ms) => new Date(Date.now() + ms - 3 * 3600_000).toISOString().slice(0, 16); // São Paulo wall clock
const browser = await chromium.launch();
const errors = [];
const init = () => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} };

const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
admin.on("pageerror", (e) => errors.push(e.message));
await admin.addInitScript(init);
await admin.goto(`${BASE}/login`);
await admin.fill("#email", process.env.E2E_EMAIL); await admin.fill("#password", process.env.E2E_PASSWORD);
await admin.click("button[type=submit]"); await admin.waitForURL(`${BASE}/app`);

step("editions are created automatically");
await admin.goto(`${BASE}/app/premios`);
await admin.getByText("Semana de 22/11 a 28/11/2026").waitFor();
await admin.getByText("Novembro de 2026").waitFor();
if (SHOTS) await admin.screenshot({ path: `${SHOTS}/awards-hub.png`, fullPage: true });

step("staff opens the Bola de Prata now");
await admin.getByText("Semana de 22/11 a 28/11/2026").click();
await admin.waitForURL(/\/app\/premios\/[0-9a-f-]{36}$/);
const editionUrl = admin.url();
await admin.fill("input[name=opens]", spLocal(-3600_000));
await admin.fill("input[name=closes]", spLocal(3600_000));
await admin.getByRole("button", { name: "Salvar datas" }).click();
await admin.getByText("Datas atualizadas.").waitFor();
await admin.reload();
await admin.getByText("Quem foi o melhor?").waitFor();

step("WhatsApp link");
await admin.evaluate(() => { window.__opened = null; window.open = (u) => { window.__opened = u; return null; }; });
await admin.getByRole("button", { name: "Enviar no WhatsApp" }).click();
const wa = await admin.evaluate(() => window.__opened);
assert.ok(wa.startsWith("https://wa.me/?text="), wa);
assert.ok(decodeURIComponent(wa).includes(editionUrl.replace(BASE, "")), "link to the edition");

step("staff votes for e2e_st");
await admin.getByRole("button", { name: /e2e_st/ }).click();
await admin.getByText("Voto registrado — você pode mudar até o encerramento.").waitFor();

step("a player votes from the link (login redirect) and cannot vote for themselves");
await admin.goto(`${BASE}/app/admin/usuarios`);
await admin.fill("#displayName", "Recruta Conta");
await admin.fill("#email", "recruta@ascend.test");
await admin.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await admin.locator("code.select-all").textContent()).trim();
await admin.goto(`${BASE}/app/elenco?status=all`);
const rec = (await admin.locator("table a", { hasText: "Recruta_E2E" }).first().getAttribute("href")).split("/").pop();
await admin.goto(`${BASE}/app/elenco/${rec}/editar`);
await admin.selectOption("#userId", { label: "Recruta Conta (recruta@ascend.test)" });
await admin.click("text=Salvar jogador");
await admin.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(init);
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(editionUrl);
await m.waitForURL(/\/login\?next=/);
await m.fill("#email", "recruta@ascend.test"); await m.fill("#password", tmp);
await m.click("button[type=submit]");
await m.waitForURL(editionUrl);
assert.ok(await m.getByRole("button", { name: /Recruta_E2E/ }).isDisabled(), "own card disabled");
await m.getByRole("button", { name: /e2e_st/ }).click();
await m.getByText("2 voto(s)").waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/awards-vote.png`, fullPage: true });

step("dashboard prompt disappears after voting");
await m.goto(`${BASE}/app`);
assert.equal(await m.getByText("Votação aberta: Bola de Prata").count(), 0);

step("voting closes → winner frozen in history, ranking, profile and art");
await admin.goto(editionUrl);
await admin.fill("input[name=opens]", spLocal(-7200_000));
await admin.fill("input[name=closes]", spLocal(-60_000));
await admin.getByRole("button", { name: "Salvar datas" }).click();
await admin.waitForTimeout(1500); // closing finalises the edition and hides the dates form
await admin.reload();
await admin.getByText(/🏆 e2e_st/).waitFor();
await admin.getByText("2 de 2 votos").waitFor();
const art = await admin.request.get(`${editionUrl.replace("/app/premios/", "/api/premios/")}/arte`);
assert.equal(art.status(), 200);
assert.equal((await sharp(await art.body()).metadata()).format, "png");
if (SHOTS) (await import("node:fs")).writeFileSync(`${SHOTS}/awards-art.png`, await art.body());
await admin.goto(`${BASE}/app/premios`);
await admin.locator("section", { hasText: "Bolas de Prata" }).getByText("e2e_st").waitFor();
await admin.locator("section", { hasText: "Maiores vencedores" }).getByText("e2e_st").waitFor();
if (SHOTS) await admin.screenshot({ path: `${SHOTS}/awards-history.png`, fullPage: true });
await admin.goto(`${BASE}/app/elenco?status=all`);
await admin.locator("table a", { hasText: "e2e_st" }).first().click();
await admin.getByLabel(/0 Bola\(s\) de Ouro e 1 Bola\(s\) de Prata/).waitFor();
assert.ok(!(await admin.getByLabel("Salvar datas").count()), "dates form hidden after finalisation");

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E awards passed");
await browser.close();
