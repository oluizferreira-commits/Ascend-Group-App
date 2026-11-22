// E2E for the card photo editor: upload a cut-out PNG, frame it, save, serve it, share image, remove. Run after personal.mjs.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require(process.cwd() + "/node_modules/sharp");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem("ascend_cookie_notice", "1"); } catch {} });
await page.goto(`${BASE}/login`);
await page.fill("#email", process.env.E2E_EMAIL); await page.fill("#password", process.env.E2E_PASSWORD);
await page.click("button[type=submit]"); await page.waitForURL(`${BASE}/app`);

await page.goto(`${BASE}/app/elenco?status=all`);
const id = (await page.locator("table a", { hasText: "e2e_st" }).first().getAttribute("href")).split("/").pop();

step("make a transparent 'cut-out' silhouette PNG");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><circle cx="300" cy="190" r="110" fill="#d9a066"/><path d="M90 800 C 90 420, 510 420, 510 800 Z" fill="#1c3fb0"/></svg>`;
const dir = mkdtempSync(join(tmpdir(), "photo-"));
const file = join(dir, "jogador.png");
writeFileSync(file, await sharp(Buffer.from(svg)).png().toBuffer());

step("upload, frame and save");
await page.goto(`${BASE}/app/elenco/${id}/editar`);
await page.getByRole("heading", { name: "Foto da carta" }).waitFor();
await page.locator('input[type=file][accept*="image/png"]').setInputFiles(file);
await page.locator(".grid img[src^='blob:']").first().waitFor();
const sliders = page.locator('input[type=range]');
await sliders.nth(1).fill("10");
await sliders.nth(2).fill("130");
await page.getByRole("button", { name: "Salvar foto" }).click();
await page.getByText(/salv/i).last().waitFor();
await page.waitForTimeout(500);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/photo-editor.png`, fullPage: true });

step("photo is served with alpha and the card uses it");
await page.goto(`${BASE}/app/elenco/${id}/carta`);
const src = await page.locator(`[aria-label^="Carta de e2e_st"] img[src*="/api/jogadores/"]`).first().getAttribute("src");
assert.match(src, new RegExp(`/api/jogadores/${id}/foto\\?v=`));
const r = await page.request.get(BASE + src);
assert.equal(r.status(), 200);
const meta = await sharp(await r.body()).metadata();
assert.equal(meta.format, "webp"); assert.ok(meta.hasAlpha, "transparency kept");
if (SHOTS) await page.screenshot({ path: `${SHOTS}/photo-card.png`, fullPage: true });

step("share image still renders");
const card = await page.request.get(`${BASE}/api/card/${id}`);
assert.equal(card.status(), 200);
if (SHOTS) writeFileSync(`${SHOTS}/photo-share.png`, await card.body());

step("background removal runs in the browser (no crash)");
await page.goto(`${BASE}/app/elenco/${id}/editar`);
await page.getByRole("button", { name: "Remover fundo" }).click();
await page.waitForFunction(() => ![...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Recortando")), null, { timeout: 60000 });

step("anonymous cannot fetch the photo");
const anon = await (await browser.newContext()).request.get(BASE + src);
assert.notEqual(anon.status(), 200);

assert.deepEqual(errors, [], "no page errors");
await browser.close();
console.log("photo E2E OK");
