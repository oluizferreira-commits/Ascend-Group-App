// E2E for delivery 3 (mobile feel). Run last, on the same DISPOSABLE DB, after matchday.mjs.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];

// a fresh player account linked to e2e_cb (#4) with a pending call-up
const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await admin.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} });
await admin.goto(`${BASE}/login`);
await admin.fill("#email", process.env.E2E_EMAIL); await admin.fill("#password", process.env.E2E_PASSWORD);
await admin.click("button[type=submit]"); await admin.waitForURL(`${BASE}/app`);
await admin.goto(`${BASE}/app/admin/usuarios`);
await admin.fill("#displayName", "Camisa Quatro");
await admin.fill("#email", "camisa4@ascend.test");
await admin.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await admin.locator("code.select-all").textContent()).trim();
await admin.goto(`${BASE}/app/elenco?status=all`);
const cb = (await admin.locator("table a", { hasText: "e2e_cb" }).first().getAttribute("href")).split("/").pop();
await admin.goto(`${BASE}/app/elenco/${cb}/editar`);
await admin.selectOption("#userId", { label: "Camisa Quatro (camisa4@ascend.test)" });
await admin.click("text=Salvar jogador");
await admin.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);
await admin.goto(`${BASE}/app/calendario`);
await admin.fill("#title", "Treino Mobile");
await admin.fill("#startsAt", "2031-02-10T20:00");
await admin.getByRole("button", { name: "Agendar" }).click();
await admin.waitForURL(/\/app\/calendario\/[0-9a-f-]{36}$/);
await admin.getByRole("button", { name: "Convocar selecionados" }).click();
await admin.getByText(/convocado\(s\)/).waitFor();

const ctx = await browser.newContext({ ...devices["iPhone 13"] });
await ctx.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); } catch {} });
const m = await ctx.newPage();
m.on("pageerror", (e) => errors.push(e.message));
await m.goto(`${BASE}/login`);
await m.fill("#email", "camisa4@ascend.test"); await m.fill("#password", tmp);
await m.click("button[type=submit]"); await m.waitForURL(`${BASE}/app`);

step("splash with the shirt number, once per session");
await m.getByText("CAMISA 4", { exact: true }).waitFor({ timeout: 5000 });
if (SHOTS) await m.screenshot({ path: `${SHOTS}/splash.png` });
await m.getByText("CAMISA 4", { exact: true }).waitFor({ state: "detached", timeout: 5000 });
await m.reload();
await m.waitForTimeout(400);
assert.equal(await m.getByText("CAMISA 4", { exact: true }).count(), 0, "splash only once per session");

step("answer a call-up in a bottom sheet");
await m.getByRole("button", { name: "Responder" }).first().click();
await m.getByRole("dialog", { name: "Convocação" }).waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/sheet.png` });
await m.getByRole("button", { name: "Confirmar" }).click();
await m.getByText("Presença confirmada.").waitFor();

step("swipe left moves to the next tab");
const swipe = async (fromX, toX, y = 420) => m.evaluate(([a, b, yy]) => {
  const el = document.querySelector("main");
  const mk = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: yy });
  el.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(a)], changedTouches: [mk(a)], bubbles: true }));
  el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(b)], bubbles: true }));
}, [fromX, toX, y]);
await m.goto(`${BASE}/app`, { waitUntil: "networkidle" });
await m.waitForTimeout(500); // gesture listeners attach after hydration
await swipe(320, 80);
await m.waitForURL(`${BASE}/app/partidas`);
await swipe(80, 320);
await m.waitForURL(`${BASE}/app`);

step("swipe a notification to mark it read");
await m.goto(`${BASE}/app/notificacoes`);
const row = m.locator("li[data-no-swipe]").first();
const box = await row.boundingBox();
const unreadBefore = await m.locator("li[data-no-swipe] .bg-accent-400").count();
assert.ok(unreadBefore > 0, "has unread notifications");
await m.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
await m.mouse.down();
await m.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 12 });
await m.mouse.up();
await m.waitForTimeout(600);
assert.equal(await m.locator("li[data-no-swipe] .bg-accent-400").count(), unreadBefore - 1, "one notification marked read");

step("players can share a match result image");
await m.goto(`${BASE}/app/partidas`);
await m.locator("a[href^='/app/partidas/']").filter({ hasText: "Adversário E2E" }).first().click();
await m.getByRole("button", { name: /Compartilhar resultado/ }).waitFor();

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E mobile passed");
await browser.close();
