import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { getMatchDetail } from "../services/matches";
import { getLineup } from "../services/lineups";
import { getEvent } from "../services/calendar";
import { getPlayer } from "../services/players";
import { getRatingConfig, getSeasonStats } from "../services/stats";
import { getClubOverview } from "../services/club";
import { POSITION_NAMES, POSITION_LABELS, RESULT_LABELS, matchResult, positionGroup } from "@/lib/domain";
import { computeMatchRating } from "@/lib/rating";
import { fmtNum, fmtWeekdayTime, fmtDate } from "@/lib/format";

export const TEMPLATES = {
  result: { label: "Resultado da partida", source: "match" },
  mvp: { label: "MVP da partida", source: "match" },
  lineup: { label: "Escalação oficial", source: "lineup" },
  callup: { label: "Convocação", source: "event" },
  scorer: { label: "Artilheiro da temporada", source: "season" },
  assister: { label: "Melhor assistente da temporada", source: "season" },
  best: { label: "Melhor jogador da temporada", source: "season" },
  awards: { label: "Premiações da temporada", source: "season" },
  signing: { label: "Contratação", source: "player" },
  presentation: { label: "Apresentação de jogador", source: "player" },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;

export const FORMATS = {
  story: { label: "Instagram Stories (1080×1920)", w: 1080, h: 1920 },
  feed: { label: "Instagram Feed (1080×1350)", w: 1080, h: 1350 },
  square: { label: "Quadrado / grupos (1080×1080)", w: 1080, h: 1080 },
  wide: { label: "Computador (1920×1080)", w: 1920, h: 1080 },
} as const;
export type FormatKey = keyof typeof FORMATS;

export type Card =
  | { kind: "result"; eyebrow: string; title: string; tone: "W" | "D" | "L"; score: string; opponent: string; meta: string; lines: string[] }
  | { kind: "spotlight"; eyebrow: string; title: string; name: string; sub: string; stats: { label: string; value: string }[]; meta: string; photo: string | null }
  | { kind: "lineup"; eyebrow: string; title: string; slots: { x: number; y: number; name: string; num: string; tag: string }[]; bench: string[]; meta: string }
  | { kind: "list"; eyebrow: string; title: string; items: { left: string; right: string }[]; meta: string };

export class MediaDataError extends Error {}

export async function loadCard(clubId: string, template: TemplateKey, q: URLSearchParams): Promise<Card> {
  const id = (k: string) => {
    const v = q.get(k);
    if (!v || !/^[0-9a-f-]{36}$/i.test(v)) throw new MediaDataError("Selecione o item de origem.");
    return v;
  };
  switch (template) {
    case "result":
    case "mvp": {
      const d = await getMatchDetail(clubId, id("match"));
      if (!d) throw new MediaDataError("Partida não encontrada.");
      const m = d.match;
      if (m.status !== "finished") throw new MediaDataError("A partida ainda não tem resultado.");
      const res = matchResult(m.goalsFor!, m.goalsAgainst!);
      const meta = `${fmtDate(m.kickoffAt)} · ${d.competition ?? "Amistoso"}`;
      if (template === "result") {
        const lines = d.participants.filter((p) => p.stats && p.stats.goals > 0).map((p) => `${p.player.nickname}${p.stats!.goals > 1 ? ` ×${p.stats!.goals}` : ""}`);
        return { kind: "result", eyebrow: d.competition ?? "Partida", title: { W: "VITÓRIA", D: "EMPATE", L: "DERROTA" }[res], tone: res, score: `${m.goalsFor} – ${m.goalsAgainst}`, opponent: m.opponentName, meta, lines };
      }
      const cfg = await getRatingConfig(clubId);
      const rated = d.participants.filter((p) => p.stats).map((p) => ({
        p, r: computeMatchRating({ ...p.stats!, result: res }, cfg.weights[positionGroup(p.player.primaryPosition)], cfg.externalWeight).final,
      })).sort((a, b) => b.r - a.r);
      if (!rated.length) throw new MediaDataError("A súmula da partida não tem estatísticas.");
      const top = rated[0];
      return { kind: "spotlight", eyebrow: `Ascend CF ${m.goalsFor}–${m.goalsAgainst} ${m.opponentName}`, title: "MVP DA PARTIDA", name: top.p.player.nickname,
        sub: POSITION_NAMES[top.p.player.primaryPosition], photo: top.p.player.avatarUrl, meta,
        stats: [{ label: "Nota", value: fmtNum(top.r, 1) }, { label: "Gols", value: String(top.p.stats!.goals) }, { label: "Assist.", value: String(top.p.stats!.assists) }] };
    }
    case "lineup": {
      const l = await getLineup(clubId, id("lineup"));
      if (!l) throw new MediaDataError("Escalação não encontrada.");
      const [f] = await db.select().from(schema.formations).where(eq(schema.formations.id, l.formationId));
      const ps = await db.select().from(schema.players).where(eq(schema.players.clubId, clubId));
      const byId = new Map(ps.map((p) => [p.id, p]));
      const tagOf = (pid: string) => [l.captainId === pid ? "C" : "", l.penaltyTakerId === pid ? "PN" : "", l.freeKickTakerId === pid ? "FT" : "", l.cornerTakerId === pid ? "ES" : ""].filter(Boolean).join(" ");
      const slots = f.slots.map((s) => {
        const pid = l.players.find((x) => x.slotKey === s.key)?.playerId;
        const p = pid ? byId.get(pid) : undefined;
        return { x: s.x, y: s.y, name: p?.nickname ?? s.label, num: p?.shirtNumber != null ? String(p.shirtNumber) : "", tag: pid ? tagOf(pid) : "" };
      });
      const bench = l.players.filter((x) => !x.slotKey).sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0)).map((x) => byId.get(x.playerId)?.nickname ?? "").filter(Boolean);
      let meta = f.name;
      if (l.matchId) {
        const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, l.matchId));
        if (m) meta = `vs ${m.opponentName} · ${fmtWeekdayTime(m.kickoffAt)} · ${f.name}`;
      } else if (l.opponentName) meta = `vs ${l.opponentName} · ${f.name}`;
      return { kind: "lineup", eyebrow: "Escalação oficial", title: "ASCEND CF", slots, bench, meta };
    }
    case "callup": {
      const e = await getEvent(clubId, id("event"));
      if (!e) throw new MediaDataError("Evento não encontrado.");
      const list = e.attendance.filter((a) => a.a.status !== "declined" && a.a.status !== "absent");
      if (!list.length) throw new MediaDataError("Ninguém convocado para este evento.");
      return { kind: "list", eyebrow: e.title, title: "CONVOCADOS", meta: fmtWeekdayTime(e.startsAt),
        items: list.map((a) => ({ left: `${a.p.shirtNumber != null ? `#${a.p.shirtNumber} ` : ""}${a.p.nickname}`, right: POSITION_LABELS[a.p.primaryPosition] })) };
    }
    case "scorer":
    case "assister":
    case "best":
    case "awards": {
      const seasonId = q.get("season") && /^[0-9a-f-]{36}$/i.test(q.get("season")!) ? q.get("season")! : (await getClubOverview(clubId)).currentSeason?.id ?? null;
      let seasonName = "Todas as temporadas";
      if (seasonId) {
        const [s] = await db.select().from(schema.seasons).where(and(eq(schema.seasons.id, seasonId), eq(schema.seasons.clubId, clubId)));
        if (!s) throw new MediaDataError("Temporada inválida.");
        seasonName = `Temporada ${s.name}`;
      }
      const st = await getSeasonStats({ clubId, seasonId });
      const r = st.rankings;
      if (template === "awards") {
        const pick = (label: string, s: (typeof r.best)[number] | undefined, value: (x: (typeof r.best)[number]) => string) =>
          s ? [{ left: `${label}: ${st.playerMap.get(s.playerId)!.nickname}`, right: value(s) }] : [];
        const items = [
          ...pick("Melhor jogador", r.best[0], (s) => fmtNum(s.avgRating, 1)),
          ...pick("Artilheiro", r.scorers[0], (s) => `${s.goals} gols`),
          ...pick("Assistências", r.assisters[0], (s) => `${s.assists} assist.`),
          ...pick("Mais decisivo", r.decisive[0], (s) => `${s.goalInvolvements} G+A`),
          ...pick("Melhor atacante", r.bestByGroup.ATT[0], (s) => fmtNum(s.avgRating, 1)),
          ...pick("Melhor meio-campista", r.bestByGroup.MID[0], (s) => fmtNum(s.avgRating, 1)),
          ...pick("Melhor defensor", r.bestByGroup.DEF[0], (s) => fmtNum(s.avgRating, 1)),
          ...pick("Melhor goleiro", r.bestByGroup.GK[0], (s) => fmtNum(s.avgRating, 1)),
          ...pick("Mais regular", r.regular[0], (s) => fmtNum(s.consistency, 2)),
        ];
        if (!items.length) throw new MediaDataError("Ainda não há dados suficientes nesta temporada.");
        return { kind: "list", eyebrow: seasonName, title: "PREMIAÇÕES", items, meta: `${st.record.played} partidas · ${st.record.wins}V ${st.record.draws}E ${st.record.losses}D` };
      }
      const s = template === "scorer" ? r.scorers[0] : template === "assister" ? r.assisters[0] : r.best[0];
      if (!s) throw new MediaDataError("Ainda não há dados suficientes nesta temporada.");
      const p = st.playerMap.get(s.playerId)!;
      const main = template === "scorer" ? { label: "Gols", value: String(s.goals) } : template === "assister" ? { label: "Assistências", value: String(s.assists) } : { label: "Nota média", value: fmtNum(s.avgRating, 1) };
      return { kind: "spotlight", eyebrow: seasonName, title: { scorer: "ARTILHEIRO", assister: "MELHOR ASSISTENTE", best: "MELHOR JOGADOR" }[template],
        name: p.nickname, sub: POSITION_NAMES[p.primaryPosition], photo: p.avatarUrl, meta: seasonName,
        stats: [main, { label: "Jogos", value: String(s.matches) }, { label: template === "assister" ? "Gols" : "Assist.", value: String(template === "assister" ? s.goals : s.assists) }] };
    }
    case "signing":
    case "presentation": {
      const p = await getPlayer(clubId, id("player"));
      if (!p) throw new MediaDataError("Jogador não encontrado.");
      return { kind: "spotlight", eyebrow: template === "signing" ? "Reforço confirmado" : "Bem-vindo ao Ascend", title: template === "signing" ? "CONTRATAÇÃO" : "APRESENTAÇÃO",
        name: p.nickname, sub: POSITION_NAMES[p.primaryPosition], photo: p.avatarUrl, meta: p.joinedOn ? `Desde ${fmtDate(p.joinedOn + "T12:00:00Z")}` : "Ascend CF",
        stats: [{ label: "Camisa", value: p.shirtNumber != null ? `#${p.shirtNumber}` : "—" }, { label: "Posição", value: POSITION_LABELS[p.primaryPosition] }, ...(p.overall ? [{ label: "Overall", value: String(p.overall) }] : [])] };
    }
  }
}

export async function mediaSources(clubId: string) {
  const [matches, lineups, events, players, seasons] = await Promise.all([
    db.select().from(schema.matches).where(eq(schema.matches.clubId, clubId)).orderBy(asc(schema.matches.kickoffAt)),
    db.select().from(schema.lineups).where(eq(schema.lineups.clubId, clubId)),
    db.select().from(schema.calendarEvents).where(eq(schema.calendarEvents.clubId, clubId)).orderBy(asc(schema.calendarEvents.startsAt)),
    db.select().from(schema.players).where(and(eq(schema.players.clubId, clubId), ne(schema.players.status, "inactive"))).orderBy(asc(schema.players.nickname)),
    db.select().from(schema.seasons).where(eq(schema.seasons.clubId, clubId)),
  ]);
  return {
    match: matches.reverse().slice(0, 60).map((m) => ({ id: m.id, label: `${fmtDate(m.kickoffAt)} vs ${m.opponentName}${m.status === "finished" ? ` (${m.goalsFor}–${m.goalsAgainst}) · ${RESULT_LABELS[matchResult(m.goalsFor!, m.goalsAgainst!)]}` : ""}` })),
    lineup: lineups.map((l) => ({ id: l.id, label: l.name })),
    event: events.reverse().slice(0, 40).map((e) => ({ id: e.id, label: `${fmtDate(e.startsAt)} · ${e.title}` })),
    player: players.map((p) => ({ id: p.id, label: p.nickname })),
    season: seasons.map((s) => ({ id: s.id, label: s.name })),
  };
}
