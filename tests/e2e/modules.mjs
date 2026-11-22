// E2E for lineups, competitions, calendar/call-ups, notifications and media.
// Run AFTER tests/e2e/smoke.mjs on the same DISPOSABLE database.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS_DIR;
const step = (m) => console.log("•", m);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function login(p, e, pw) {
  await p.goto(`${BASE}/login`); await p.fill("#email", e); await p.fill("#password", pw);
  await p.click("button[type=submit]"); await p.waitForURL(`${BASE}/app`);
}
await login(page, process.env.E2E_EMAIL, process.env.E2E_PASSWORD);

step("lineup: build 4-4-2 with tap-to-place");
await page.goto(`${BASE}/app/escalacoes/nova`);
await page.getByPlaceholder("Ex.: Base liga · 4-3-3").fill("Base E2E");
await page.locator("select").first().selectOption({ label: "4-4-2" });
await page.getByRole("button", { name: /e2e_st/ }).click();
await page.getByRole("button", { name: "ATA vazio" }).first().click();
await page.getByRole("button", { name: /e2e_cm/ }).click();
await page.getByRole("button", { name: "MC vazio" }).first().click();
await page.getByRole("button", { name: /e2e_cb/ }).click();
await page.getByText("+ adicionar selecionado").click();
await page.locator("label", { hasText: "Capitão" }).locator("select").selectOption({ label: "e2e_st" });
await page.getByRole("button", { name: "Salvar escalação" }).click();
await page.waitForURL(/\/app\/escalacoes\/[0-9a-f-]{36}$/);
const lineupId = page.url().split("/").pop();
await page.getByRole("button", { name: "ATA: e2e_st" }).waitFor();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/lineup.png`, fullPage: true });

step("competition: teams, fixture, standings");
await page.goto(`${BASE}/app/competicoes`);
await page.fill("#name", "Liga E2E");
await page.getByRole("button", { name: "Criar competição" }).click();
await page.waitForURL(/\/app\/competicoes\/[0-9a-f-]{36}$/);
for (const t of ["Rival A", "Rival B"]) {
  await page.locator("input[name=name]").fill(t);
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByText("Time adicionado.").waitFor();
}
const fx = page.locator("form", { has: page.getByRole("button", { name: "Adicionar jogo" }) });
await fx.locator("select[name=homeTeamId]").selectOption({ label: "Ascend CF" });
await fx.locator("select[name=awayTeamId]").selectOption({ label: "Rival A" });
await fx.locator("input[name=homeGoals]").fill("2");
await fx.locator("input[name=awayGoals]").fill("0");
await fx.getByRole("button", { name: "Adicionar jogo" }).click();
await page.getByText("Jogo salvo. Classificação atualizada.").waitFor();
const first = page.locator("table").first().locator("tbody tr").first();
assert.match(await first.innerText(), /Ascend CF\s+3\s+1\s+1/);

step("player account linked to e2e_cb");
await page.goto(`${BASE}/app/admin/usuarios`);
await page.fill("#displayName", "Zagueiro E2E");
await page.fill("#email", "zagueiro.e2e@ascend.test");
await page.getByRole("button", { name: "Adicionar membro" }).click();
const tmp = (await page.locator("code.select-all").textContent()).trim();
await page.goto(`${BASE}/app/elenco?status=all`);
await page.locator("table").getByText("e2e_cb").click();
await page.getByRole("link", { name: "Editar" }).click();
await page.selectOption("#userId", { label: "Zagueiro E2E (zagueiro.e2e@ascend.test)" });
await page.click("text=Salvar jogador");
await page.waitForURL(/\/app\/elenco\/[0-9a-f-]{36}$/);

step("training + call-up");
await page.goto(`${BASE}/app/calendario`);
await page.fill("#title", "Treino E2E");
await page.fill("#startsAt", "2030-01-10T20:00");
await page.getByRole("button", { name: "Agendar" }).click();
await page.waitForURL(/\/app\/calendario\/[0-9a-f-]{36}$/);
const eventUrl = page.url();
await page.getByRole("button", { name: "Convocar selecionados" }).click();
await page.getByText(/jogador\(es\) convocado\(s\)/).waitFor();

step("player sees bell + call-up and confirms (mobile)");
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await ctx2.newPage();
await login(m, "zagueiro.e2e@ascend.test", tmp);
await m.getByText("Você foi convocado").waitFor();
assert.ok((await m.getByRole("link", { name: /Notificações \(\d+ não lidas\)/ }).count()) > 0, "unread badge");
await m.goto(eventUrl);
await m.getByRole("button", { name: "Confirmar presença" }).click();
await m.getByText("Presença confirmada.").waitFor();
if (SHOTS) await m.screenshot({ path: `${SHOTS}/callup-mobile.png`, fullPage: true });
for (const u of ["/app/calendario", "/app/disponibilidade", "/app/escalacoes", `/app/escalacoes/${lineupId}`, "/app/competicoes"]) {
  await m.goto(BASE + u);
  const [sw, iw] = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(sw <= iw + 1, `no horizontal overflow on ${u} (${sw}>${iw})`);
}
const rShare = await m.request.get(`${BASE}/api/media/awards?format=feed`);
assert.equal(rShare.status(), 200, "members can generate share images");
await m.goto(`${BASE}/app/midia`);
await m.waitForURL(`${BASE}/app/sem-permissao`); // media centre UI stays staff-only

step("media: PNGs render");
const matchHref = await (async () => { await page.goto(`${BASE}/app/partidas`); return page.locator("a[href^='/app/partidas/']").filter({ hasText: "Adversário E2E" }).first().getAttribute("href"); })();
const matchId = matchHref.split("/").pop();
for (const [t, q, f] of [["result", `match=${matchId}`, "story"], ["mvp", `match=${matchId}`, "square"], ["lineup", `lineup=${lineupId}`, "feed"], ["awards", "", "wide"], ["callup", `event=${eventUrl.split("/").pop()}`, "feed"]]) {
  const res = await page.request.get(`${BASE}/api/media/${t}?format=${f}&${q}`);
  assert.equal(res.status(), 200, `${t} → ${res.status()} ${await res.text().catch(() => "")}`);
  assert.equal(res.headers()["content-type"], "image/png");
  if (SHOTS) (await import("node:fs")).writeFileSync(`${SHOTS}/media-${t}.png`, await res.body());
}
await page.goto(`${BASE}/app/midia`);
await page.getByAltText("Pré-visualização da arte").waitFor({ timeout: 30000 });

assert.deepEqual(errors, [], "no client-side errors");
console.log("✔ E2E modules passed");
await browser.close();
