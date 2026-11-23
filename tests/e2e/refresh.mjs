// E2E for "Atualizar agora": any member can pull EA data on demand, with a club-wide 60 s cooldown.
// Run last (it configures the EA integration on the DISPOSABLE DB). Works whether or not EA is reachable.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} });
await page.goto(`${BASE}/login`);
await page.fill("#email", process.env.E2E_EMAIL); await page.fill("#password", process.env.E2E_PASSWORD);
await page.locator("#password").press("Enter"); await page.waitForURL(`${BASE}/app`);

step("button is hidden until EA is configured");
await page.goto(`${BASE}/app/partidas`);
assert.equal(await page.getByRole("button", { name: "Atualizar agora com a EA" }).count(), 0);

step("configure EA integration");
await page.goto(`${BASE}/app/integracao`);
await page.fill("#eaClubId", "1");
await page.getByRole("button", { name: "Salvar" }).first().click();
await page.getByText("Configuração salva.").waitFor();

step("press Atualizar agora on Partidas");
await page.goto(`${BASE}/app/partidas`);
const btn = page.getByRole("button", { name: "Atualizar agora com a EA" });
await btn.click();
const status = page.getByRole("status").filter({ hasText: /Atualizado com a EA|A EA não respondeu|Tente de novo em \d+s/ });
await status.waitFor({ timeout: 60000 });
console.log("  →", await status.innerText());
if (SHOTS) await page.screenshot({ path: `${SHOTS}/refresh-partidas.png` });

step("second press within a minute is throttled (club-wide)");
await page.goto(`${BASE}/app`);
await page.getByRole("button", { name: "Atualizar agora com a EA" }).click();
await page.getByRole("status").filter({ hasText: /Tente de novo em \d+s/ }).waitFor({ timeout: 30000 });

step("a player sees the button too (mobile)");
const m = await browser.newPage({ ...devices["iPhone 14"] });
await m.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); sessionStorage.setItem("ascend_splash_seen", "1"); } catch {} });
await m.goto(`${BASE}/login`);
await m.fill("#email", "camisa9@ascend.test"); await m.fill("#password", process.env.PLAYER_PASSWORD ?? "");
if (process.env.PLAYER_PASSWORD) {
  await m.locator("#password").press("Enter"); await m.waitForURL(/\/app/);
  await m.goto(`${BASE}/app`);
  await m.getByRole("button", { name: "Atualizar agora com a EA" }).waitFor();
  if (SHOTS) await m.screenshot({ path: `${SHOTS}/refresh-mobile.png`, fullPage: true });
}

assert.deepEqual(errors, [], "no page errors");
await browser.close();
console.log("✔ E2E refresh passed");
