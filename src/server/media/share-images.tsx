import "server-only";
import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/db";
import { loadAssets } from "./render";
import { cardTier, type AttributeKey, type Attributes } from "@/lib/attributes";
import { POSITION_LABELS, POSITION_NAMES, type Position } from "@/lib/domain";
import type { RowResult } from "@/lib/compare";

const W = 1080, H = 1350;
type Stop = [offset: number, color: string, opacity?: number];
const TIERS = {
  lenda: { rim: "#bcd0ff", glow: ["#6f8fff", 0.75] as const, metal: [[0, "#ffffff"], [0.18, "#c9d1dc"], [0.38, "#7d8aa3"], [0.52, "#f4f7ff"], [0.7, "#8f9bb3"], [1, "#e6ecfd"]] as Stop[] },
  ascend: { rim: "#8fa9ff", glow: ["#3a63f0", 0.6] as const, metal: [[0, "#e6ecfd"], [0.25, "#9aa6bd"], [0.45, "#56627a"], [0.6, "#d5dceb"], [0.8, "#6d7891"], [1, "#c9d1dc"]] as Stop[] },
  base: { rim: "#5a6f9e", glow: ["#1c3fb0", 0.45] as const, metal: [[0, "#9aa6bd"], [0.35, "#4a5672"], [0.55, "#7d8aa3"], [0.8, "#3a4560"], [1, "#8b96ad"]] as Stop[] },
};
const CARD_ATTRS: AttributeKey[] = ["FIN", "DEC", "DEF", "CRI", "PAS", "REG"];
// Shield silhouette — same points as components/cards/player-card.tsx
const SHIELD_PTS: [number, number][] = [[50, 0], [93, 3.2], [100, 9.5], [100, 83], [50, 100], [0, 83], [0, 9.5], [7, 3.2]];
const poly = (x: number, y: number, w: number, h: number) => SHIELD_PTS.map(([px, py]) => `${(x + (px / 100) * w).toFixed(1)},${(y + (py / 100) * h).toFixed(1)}`).join(" ");
const stops = (s: Stop[]) => s.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ""}/>`).join("");

/**
 * Card artwork layers rendered with SVG (satori's clip-path support is partial):
 * metallic rim, blue body with rim light and — when present — the player photo clipped to the
 * shield and fading out at the bottom. Text is laid over it by satori.
 */
async function shieldArt(tier: keyof typeof TIERS, k: number, framed: string | null, below: string) {
  const t = TIERS[tier];
  const W = Math.round(250 * k), H = Math.round(352 * k), i = 4.5 * k, bw = W - 2 * i, bh = H - 2 * i;
  const px = i + 52 * k, py = i + 12 * k, pw = W - i - px, ph = 184 * k;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
  <defs>
    <linearGradient id="metal" x1="0" y1="0" x2="0.35" y2="1">${stops(t.metal)}</linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#0c1d4f"], [0.38, "#081236"], [0.78, "#04060b"]])}</linearGradient>
    <radialGradient id="glow" cx="0.62" cy="0.3" r="0.55">${stops([[0, t.glow[0], t.glow[1]], [1, t.glow[0], 0]])}</radialGradient>
    <radialGradient id="floor" cx="0.5" cy="1.08" r="0.5">${stops([[0, "#1c3fb0", 0.55], [1, "#1c3fb0", 0]])}</radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">${stops([[0, "#fff"], [0.62, "#fff"], [0.98, "#000"]])}</linearGradient>
    <mask id="m" maskUnits="userSpaceOnUse" x="${px}" y="${py}" width="${pw}" height="${ph}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#fade)"/></mask>
    <clipPath id="c"><polygon points="${poly(i, i, bw, bh)}"/></clipPath>
  </defs>
  <polygon points="${poly(0, 0, W, H)}" fill="url(#metal)"/>
  <g clip-path="url(#c)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#body)"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#glow)"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#floor)"/>
    ${below}
    ${framed ? `<image x="${px}" y="${py}" width="${pw}" height="${ph}" preserveAspectRatio="none" xlink:href="${framed}" mask="url(#m)"/>` : ""}
  </g>
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Crops a photo data URL to the card's photo box the same way the app does (cover + focus + zoom). */
async function framePhoto(photo: string, w: number, h: number, x = 50, y = 20, zoom = 100): Promise<string | null> {
  try {
    const buf = Buffer.from(photo.split(",")[1], "base64");
    const meta = await sharp(buf).metadata();
    const iw = meta.width ?? 1, ih = meta.height ?? 1;
    const s = Math.max(w / iw, h / ih) * (zoom / 100);
    const rw = Math.max(w, Math.round(iw * s)), rh = Math.max(h, Math.round(ih * s));
    const left = Math.round((rw - w) * (x / 100)), top = Math.round((rh - h) * (y / 100));
    const out = await sharp(buf).resize(rw, rh, { fit: "fill" }).extract({ left, top, width: w, height: h }).png().toBuffer();
    return `data:image/png;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Avatar as PNG data URL: applicant photos come from the DB, https URLs are fetched (5 s timeout). Never throws. */
export async function avatarDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    let buf: Buffer | null = null;
    const own = url.match(/^\/api\/jogadores\/([0-9a-f-]{36})\/foto/i);
    const m = url.match(/^\/api\/propostas\/([0-9a-f-]{36})\/foto$/i);
    if (own) {
      const [row] = await db.select({ data: schema.playerPhotos.data }).from(schema.playerPhotos).where(eq(schema.playerPhotos.playerId, own[1]));
      buf = row?.data ?? null;
    } else if (m) {
      const [row] = await db.select({ data: schema.applicationPhotos.data }).from(schema.applicationPhotos).where(eq(schema.applicationPhotos.applicationId, m[1]));
      buf = row?.data ?? null;
    } else if (url.startsWith("https://")) {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok && Number(r.headers.get("content-length") ?? 0) < 8_000_000) buf = Buffer.from(await r.arrayBuffer());
    }
    if (!buf) return null;
    // keep transparency and proportions (cut-out players); the card frames it
    const png = await sharp(buf, { limitInputPixels: 40_000_000 }).resize({ width: 640, height: 780, fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export type ShareCard = {
  nickname: string; position: Position; shirtNumber: number | null; photo: string | null;
  photoX?: number; photoY?: number; photoZoom?: number;
  ovr: number | null; attributes: Attributes; seasonLabel: string;
};

/** Same layout as components/cards/player-card.tsx (250-unit card coordinates). `art` is the pre-rendered shield + photo. */
function Card({ c, scale = 1, crest, art }: { c: ShareCard; scale?: number; crest: string; art: string }) {
  const k = cardK(scale);
  const u = (n: number) => Math.round(n * k * 10) / 10;
  const t = TIERS[cardTier(c.ovr)];
  const ovrText = c.ovr == null ? "—" : String(c.ovr);
  const len = [...c.nickname].length;
  const nameSize = Math.max(13, Math.min(27, 27 * (10 / Math.max(10, len))));
  const W = Math.round(250 * k), H = Math.round(352 * k);
  const b = (n: number) => u(n + 4.5); // body → card coordinates
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, color: "#fff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
      {!c.photo && (
        <div style={{ display: "flex", position: "absolute", left: b(52), right: u(4.5), top: b(12), height: u(184), alignItems: "center", justifyContent: "center", fontSize: u(84), fontWeight: 700, color: "rgba(201,214,255,0.85)" }}>{c.shirtNumber ?? c.nickname.slice(0, 2).toUpperCase()}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", left: b(14), top: b(26), width: u(56), fontWeight: 700, lineHeight: 1 }}>
        <div style={{ display: "flex", fontSize: u(ovrText.length >= 3 ? 40 : 54) }}>{ovrText}</div>
        <div style={{ display: "flex", fontSize: u(19), color: t.rim, marginTop: u(2) }}>{POSITION_LABELS[c.position]}</div>
        <div style={{ display: "flex", width: u(30), height: u(1.5), backgroundImage: "linear-gradient(90deg,#8b96ad,#ffffff,#8b96ad)", margin: `${u(7)}px 0` }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crest} width={u(30)} height={u(30)} alt="" style={{ borderRadius: u(4) }} />
        {c.shirtNumber != null && <div style={{ display: "flex", fontSize: u(15), marginTop: u(8), color: "#dbe4ff" }}>#{c.shirtNumber}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", left: 0, right: 0, top: b(183) }}>
        <div style={{ display: "flex", fontSize: u(nameSize), fontWeight: 700, letterSpacing: u(1.2), color: "#eef2fb", lineHeight: 1.15 }}>{c.nickname.toUpperCase()}</div>
        <div style={{ display: "flex", width: u(178), height: u(1.5), marginTop: u(3), backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0), ${t.rim}, rgba(0,0,0,0))` }} />
      </div>
      {[0, 1].map((row) => (
        <div key={row} style={{ display: "flex", position: "absolute", left: b(26), width: u(189), top: b(222 + row * 38.5) }}>
          {CARD_ATTRS.slice(row * 3, row * 3 + 3).map((a) => (
            <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: u(63), lineHeight: 1 }}>
              <div style={{ display: "flex", fontSize: u(20), fontWeight: 700 }}>{c.attributes[a] ?? "—"}</div>
              <div style={{ display: "flex", fontSize: u(10.5), color: t.rim, letterSpacing: u(1.5), marginTop: u(2) }}>{a}</div>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", left: 0, right: 0, bottom: b(16) }}>
        <div style={{ display: "flex", fontSize: u(9), letterSpacing: u(3), color: "#c9d1dc" }}>ASCEND CF</div>
        <div style={{ display: "flex", fontSize: u(7), letterSpacing: u(1.6), color: "rgba(201,209,220,0.6)", marginTop: u(2) }}>{c.seasonLabel.toUpperCase()}</div>
      </div>
    </div>
  );
}

const cardK = (scale: number) => (560 * scale) / 250;
const cardW = (k: number) => Math.round(250 * k);

/** Pre-renders the card artwork (shield, rim light, number watermark outline, framed photo). */
async function artFor(c: ShareCard, scale: number) {
  const k = cardK(scale);
  const framed = c.photo ? await framePhoto(c.photo, Math.round((250 - 9 - 52) * k), Math.round(184 * k), c.photoX, c.photoY, c.photoZoom) : null;
  const t = TIERS[cardTier(c.ovr)];
  let below = `<radialGradient id="halo">${stops([[0, t.glow[0], t.glow[1]], [1, t.glow[0], 0]])}</radialGradient><circle cx="${(4.5 + 155) * k}" cy="${(4.5 + 125) * k}" r="${85 * k}" fill="url(#halo)"/>`;
  if (c.shirtNumber != null) {
    // shirt number watermark in the club font, behind the player
    const ww = Math.round(170 * k), wh = Math.round(160 * k);
    const img = new ImageResponse(
      <div style={{ display: "flex", width: ww, height: wh, justifyContent: "flex-end", fontFamily: "Barlow", fontSize: Math.round(150 * k), fontWeight: 700, lineHeight: 1, color: "rgba(201,209,220,0.10)" }}>{c.shirtNumber}</div>,
      { width: ww, height: wh, fonts: await fontsOf() },
    );
    const data = Buffer.from(await img.arrayBuffer()).toString("base64");
    below += `<image x="${cardW(k) - 4.5 * k - ww + 4 * k}" y="${(4.5 + 22) * k}" width="${ww}" height="${wh}" xlink:href="data:image/png;base64,${data}"/>`;
  }
  return shieldArt(cardTier(c.ovr), k, framed, below);
}

function Frame({ crest, children, title }: { crest: string; children: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: W, height: H, padding: 56, fontFamily: "Barlow", color: "#f1f4f9", background: "linear-gradient(160deg,#15318a 0%,#0c1d4f 35%,#04060b 80%)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={crest} width={92} height={92} alt="" style={{ borderRadius: 14 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, letterSpacing: 3 }}>ASCEND CF</div>
          <div style={{ display: "flex", fontSize: 26, color: "#9db4ff", letterSpacing: 8 }}>{title}</div>
        </div>
      </div>
      {children}
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 12, color: "#9db4ff", fontWeight: 600 }}>RISE. CONQUER. ASCEND.</div>
    </div>
  );
}

const fontsOf = async () => (await loadAssets()).fonts.map((f) => ({ ...f, style: "normal" as const }));

export async function renderShareCard(c: ShareCard, title?: string) {
  const { crest } = await loadAssets();
  return new ImageResponse(
    <Frame crest={crest} title={title ?? POSITION_NAMES[c.position].toUpperCase()}><Card c={c} scale={1.45} crest={crest} art={await artFor(c, 1.45)} /></Frame>,
    { width: W, height: H, fonts: await fontsOf() },
  );
}

export async function renderShareCompare(a: ShareCard, b: ShareCard, score: { a: number; b: number }, rows: RowResult[]) {
  const { crest } = await loadAssets();
  const top = rows.filter((r) => r.a != null && r.b != null).slice(0, 7);
  return new ImageResponse(
    <Frame crest={crest} title={a.seasonLabel.toUpperCase()}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <Card c={a} scale={0.72} crest={crest} art={await artFor(a, 0.72)} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, color: "#c9d1dc" }}>VS</div>
            <div style={{ display: "flex", fontSize: 92, fontWeight: 700 }}>{score.a}×{score.b}</div>
          </div>
          <Card c={b} scale={0.72} crest={crest} art={await artFor(b, 0.72)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 940, marginTop: 34, gap: 10 }}>
          {top.map((r) => (
            <div key={r.row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", width: 200, fontSize: 38, fontWeight: 700, color: r.winner === "a" ? "#9db4ff" : "#c9d1dc" }}>{r.row.format(r.a!)}</div>
              <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: "#c9d1dc" }}>{r.row.label.toUpperCase()}</div>
              <div style={{ display: "flex", width: 200, justifyContent: "flex-end", fontSize: 38, fontWeight: 700, color: r.winner === "b" ? "#ffffff" : "#c9d1dc" }}>{r.row.format(r.b!)}</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>,
    { width: W, height: H, fonts: await fontsOf() },
  );
}
