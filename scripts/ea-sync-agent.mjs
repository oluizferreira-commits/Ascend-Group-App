#!/usr/bin/env node
/**
 * Ascend FC — agente local de sincronização EA FC.
 *
 * Roda no computador de um membro da diretoria (conexão residencial), consulta
 * os endpoints PÚBLICOS do Pro Clubs e envia as partidas para a plataforma.
 * Não usa login nem senha da EA. Requer Node.js 18+ e nenhuma dependência.
 *
 * Uso:
 *   node ea-sync-agent.mjs --search "Ascend CF"       # descobrir o clubId
 *   node ea-sync-agent.mjs --once                     # uma sincronização
 *   node ea-sync-agent.mjs --every 30                 # a cada 30 minutos
 *
 * Variáveis de ambiente:
 *   APP_URL         ex.: https://ascend.example.com
 *   EA_SYNC_TOKEN   o mesmo valor configurado no servidor
 *   EA_FC_CLUB_ID   id numérico do clube
 *   EA_FC_PLATFORM  common-gen5 (padrão) ou common-gen4
 */
const BASE = "https://proclubs.ea.com/api/fc";
const TYPES = ["leagueMatch", "playoffMatch", "friendlyMatch"];
const platform = process.env.EA_FC_PLATFORM || "common-gen5";
const args = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.log(new Date().toLocaleString("pt-BR"), "|", ...m);

async function eaGet(path, params) {
  const url = `${BASE}/${path}?${new URLSearchParams({ platform, ...params })}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
  if (res.status === 403) throw new Error("A EA recusou a consulta (403). Tente mais tarde; não insista em sequência.");
  if (!res.ok) throw new Error(`EA respondeu HTTP ${res.status}`);
  return res.json();
}

async function search(name) {
  const data = await eaGet("allTimeLeaderboard/search", { clubName: name });
  const list = Array.isArray(data) ? data : [];
  if (!list.length) return log("Nenhum clube encontrado com esse nome.");
  for (const c of list) log(`clubId=${c.clubId ?? c.clubInfo?.clubId ?? "?"}  nome=${c.clubName ?? c.clubInfo?.name ?? "?"}`);
}

async function syncOnce() {
  const { APP_URL, EA_SYNC_TOKEN, EA_FC_CLUB_ID } = process.env;
  if (!APP_URL || !EA_SYNC_TOKEN || !EA_FC_CLUB_ID) throw new Error("Defina APP_URL, EA_SYNC_TOKEN e EA_FC_CLUB_ID.");
  const batches = [];
  for (const matchType of TYPES) {
    batches.push({ matchType, payload: await eaGet("clubs/matches", { clubIds: EA_FC_CLUB_ID, matchType, maxResultCount: "10" }) });
    await sleep(2000); // be gentle with EA
  }
  const res = await fetch(new URL("/api/integrations/ea-fc/ingest", APP_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${EA_SYNC_TOKEN}` },
    body: JSON.stringify({ eaClubId: EA_FC_CLUB_ID, batches }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Plataforma respondeu HTTP ${res.status}: ${JSON.stringify(body)}`);
  log(`OK — status=${body.status} encontradas=${body.found} novas=${body.created} existentes=${body.skipped}`);
  if (body.unmatchedPlayers?.length) log("Sem vínculo no elenco:", body.unmatchedPlayers.map((u) => u.eaName).join(", "));
}

const si = args.indexOf("--search");
if (si >= 0) {
  await search(args[si + 1] ?? "Ascend");
} else if (args.includes("--every")) {
  const minutes = Math.max(15, Number(args[args.indexOf("--every") + 1]) || 30);
  log(`Sincronizando a cada ${minutes} min. Ctrl+C para parar.`);
  for (;;) {
    try { await syncOnce(); } catch (e) { log("ERRO:", e.message); }
    await sleep(minutes * 60_000);
  }
} else {
  await syncOnce().catch((e) => { log("ERRO:", e.message); process.exitCode = 1; });
}
