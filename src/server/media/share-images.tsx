import "server-only";
import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db, schema } from "@/db";
import { loadAssets } from "./render";
import { ATTRIBUTES, cardTier, type AttributeKey, type Attributes } from "@/lib/attributes";
import { POSITION_LABELS, POSITION_NAMES, type Position } from "@/lib/domain";
import type { RowResult } from "@/lib/compare";

const W = 1080, H = 1350;
const TIER_BG = {
  lenda: "linear-gradient(155deg,#f4f7ff 0%,#c9d1dc 22%,#6f8fff 48%,#1c3fb0 70%,#0a1330 100%)",
  ascend: "linear-gradient(155deg,#3a63f0 0%,#1c3fb0 40%,#0c1d4f 100%)",
  base: "linear-gradient(155deg,#2b3650 0%,#131a2a 55%,#04060b 100%)",
};

/** Avatar as PNG data URL: applicant photos come from the DB, https URLs are fetched (5 s timeout). Never throws. */
export async function avatarDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    let buf: Buffer | null = null;
    const m = url.match(/^\/api\/propostas\/([0-9a-f-]{36})\/foto$/i);
    if (m) {
      const [row] = await db.select({ data: schema.applicationPhotos.data }).from(schema.applicationPhotos).where(eq(schema.applicationPhotos.applicationId, m[1]));
      buf = row?.data ?? null;
    } else if (url.startsWith("https://")) {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (r.ok && Number(r.headers.get("content-length") ?? 0) < 8_000_000) buf = Buffer.from(await r.arrayBuffer());
    }
    if (!buf) return null;
    const png = await sharp(buf, { limitInputPixels: 40_000_000 }).resize(420, 420, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export type ShareCard = {
  nickname: string; position: Position; shirtNumber: number | null; photo: string | null;
  ovr: number | null; attributes: Attributes; seasonLabel: string;
};

function Card({ c, scale = 1 }: { c: ShareCard; scale?: number }) {
  const u = (n: number) => Math.round(n * scale);
  const tier = cardTier(c.ovr);
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: u(560), height: u(784), borderRadius: u(36), background: TIER_BG[tier], border: `${u(3)}px solid rgba(255,255,255,0.35)`, overflow: "hidden", color: "#fff" }}>
      {c.shirtNumber != null && (
        <div style={{ display: "flex", position: "absolute", right: u(-10), top: u(150), fontSize: u(400), fontWeight: 700, color: "rgba(255,255,255,0.10)", lineHeight: 1 }}>{c.shirtNumber}</div>
      )}
      <div style={{ display: "flex", padding: `${u(48)}px ${u(44)}px 0`, justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: u(118), fontWeight: 700, lineHeight: 1 }}>{c.ovr ?? "—"}</div>
          <div style={{ display: "flex", fontSize: u(44), fontWeight: 700, color: "#dbe4ff" }}>{POSITION_LABELS[c.position]}</div>
          {c.shirtNumber != null && <div style={{ display: "flex", fontSize: u(34), marginTop: u(8), color: "#dbe4ff" }}>#{c.shirtNumber}</div>}
        </div>
        <div style={{ display: "flex", width: u(300), height: u(300), borderRadius: u(24), overflow: "hidden", background: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
          {c.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.photo} width={u(300)} height={u(300)} alt="" style={{ objectFit: "cover" }} />
            : <div style={{ display: "flex", fontSize: u(150), fontWeight: 700, color: "#c9d6ff" }}>{c.shirtNumber ?? c.nickname.slice(0, 2).toUpperCase()}</div>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: u(28) }}>
        <div style={{ display: "flex", fontSize: u(64), fontWeight: 700, letterSpacing: u(2) }}>{c.nickname.toUpperCase()}</div>
        <div style={{ display: "flex", width: u(400), height: u(2), background: "rgba(255,255,255,0.35)", marginTop: u(6) }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", padding: `${u(26)}px ${u(70)}px 0`, rowGap: u(10) }}>
        {(Object.keys(ATTRIBUTES) as AttributeKey[]).map((k) => (
          <div key={k} style={{ display: "flex", width: "50%", alignItems: "baseline", gap: u(12) }}>
            <div style={{ display: "flex", fontSize: u(46), fontWeight: 700, minWidth: u(64) }}>{c.attributes[k] ?? "—"}</div>
            <div style={{ display: "flex", fontSize: u(34), color: "#dbe4ff", letterSpacing: u(3) }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", position: "absolute", bottom: u(26), left: 0, right: 0, justifyContent: "center", fontSize: u(22), letterSpacing: u(8), color: "#dbe4ff" }}>{c.seasonLabel.toUpperCase()}</div>
    </div>
  );
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
    <Frame crest={crest} title={title ?? POSITION_NAMES[c.position].toUpperCase()}><Card c={c} scale={1.45} /></Frame>,
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
          <Card c={a} scale={0.72} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, color: "#c9d1dc" }}>VS</div>
            <div style={{ display: "flex", fontSize: 92, fontWeight: 700 }}>{score.a}×{score.b}</div>
          </div>
          <Card c={b} scale={0.72} />
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
