import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Card, FormatKey } from "./data";
import { FORMATS } from "./data";

const GOLD = "#e2c06a", GOLD_D = "#a88232", WINE = "#5a0f22", INK = "#07070a", WHITE = "#ececf1", MUTED = "#b4b4be";
let assets: Promise<{ fonts: { name: string; data: Buffer; weight: 500 | 600 | 700 }[]; crest: string }> | null = null;

function loadAssets() {
  assets ??= (async () => {
    const f = (w: number) => readFile(join(process.cwd(), "assets/fonts", `barlow-condensed-latin-${w}-normal.woff`));
    const [a, b, c, crest] = await Promise.all([f(500), f(600), f(700), readFile(join(process.cwd(), "public/brand/generated/crest-256.png"))]);
    return {
      fonts: [{ name: "Barlow", data: a, weight: 500 }, { name: "Barlow", data: b, weight: 600 }, { name: "Barlow", data: c, weight: 700 }],
      crest: `data:image/png;base64,${crest.toString("base64")}`,
    };
  })();
  return assets;
}

const toneColor = { W: "#3fa36b", D: MUTED, L: "#d0475e" };

function Body({ card, w, h, crest }: { card: Card; w: number; h: number; crest: string }) {
  const s = Math.min(w, h) / 1080; // scale unit
  const wide = w > h;
  const compact = h <= 1100; // square and wide formats have little vertical room
  const px = (n: number) => Math.round(n * s);
  const k = (n: number) => px(compact ? n * 0.72 : n);
  const Header = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={crest} width={k(card.kind === "lineup" ? 150 : 220)} height={k(card.kind === "lineup" ? 150 : 220)} alt="" style={{ borderRadius: px(16) }} />
      <div style={{ display: "flex", marginTop: px(18), fontSize: px(30), letterSpacing: px(8), color: GOLD, fontWeight: 600, textTransform: "uppercase" }}>{card.eyebrow}</div>
    </div>
  );
  const Title = <div style={{ display: "flex", fontSize: k(card.kind === "lineup" ? 80 : 130), fontWeight: 700, color: card.kind === "result" ? toneColor[card.tone] : GOLD, lineHeight: 1, letterSpacing: px(4) }}>{card.title}</div>;

  let main: React.ReactNode = null;
  if (card.kind === "result") {
    main = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: px(40), marginTop: px(24) }}>
          <div style={{ display: "flex", fontSize: px(54), fontWeight: 700, color: WHITE }}>ASCEND FC</div>
          <div style={{ display: "flex", fontSize: px(150), fontWeight: 700, color: WHITE }}>{card.score}</div>
          <div style={{ display: "flex", fontSize: px(54), fontWeight: 700, color: WHITE, maxWidth: px(320) }}>{card.opponent.toUpperCase()}</div>
        </div>
        {card.lines.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: px(24), marginTop: px(24), fontSize: px(38), color: MUTED, maxWidth: px(960) }}>
            {card.lines.map((l, i) => <div key={i} style={{ display: "flex" }}>{l}</div>)}
          </div>
        )}
      </div>
    );
  } else if (card.kind === "spotlight") {
    const initials = card.name.slice(0, 2).toUpperCase();
    main = (
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", alignItems: "center", gap: wide ? px(60) : 0, marginTop: k(24) }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", width: k(260), height: k(260), borderRadius: k(130), border: `${px(6)}px solid ${GOLD}`, background: `linear-gradient(135deg, ${WINE}, ${INK})`, alignItems: "center", justifyContent: "center", fontSize: k(110), fontWeight: 700, color: GOLD }}>{initials}</div>
        <div style={{ display: "flex", fontSize: k(96), fontWeight: 700, color: WHITE, marginTop: k(22) }}>{card.name.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: k(38), color: MUTED, letterSpacing: px(4) }}>{card.sub.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", gap: px(30), marginTop: wide ? 0 : k(32) }}>
          {card.stats.map((st) => (
            <div key={st.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: `${k(18)}px ${k(36)}px`, border: `${px(2)}px solid ${GOLD_D}`, borderRadius: px(18), background: "rgba(90,15,34,0.45)" }}>
              <div style={{ display: "flex", fontSize: k(80), fontWeight: 700, color: GOLD }}>{st.value}</div>
              <div style={{ display: "flex", fontSize: px(28), color: MUTED, letterSpacing: px(3) }}>{st.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (card.kind === "lineup") {
    // Fit the pitch into the vertical space left by header, title and footer.
    const avail = h - px(compact ? 600 : 720);
    let ph = Math.min(wide ? px(640) : Math.round(px(900) * 1.05), avail);
    if (!wide && card.bench.length) ph -= px(110);
    const pw = wide ? Math.round(ph * 1.2) : Math.round(ph / 1.05);
    main = (
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", alignItems: "center", gap: px(30), marginTop: px(20) }}>
        <div style={{ display: "flex", position: "relative", width: pw, height: ph, borderRadius: px(20), border: `${px(3)}px solid ${GOLD_D}`, background: "linear-gradient(180deg, #0f2a1c, #0b1f15)" }}>
          {card.slots.map((sl, i) => (
            <div key={i} style={{ position: "absolute", left: (sl.x / 100) * pw - px(80), top: (1 - sl.y / 100) * ph - px(44), width: px(160), display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", width: px(62), height: px(62), borderRadius: px(31), border: `${px(3)}px solid ${GOLD}`, background: WINE, alignItems: "center", justifyContent: "center", fontSize: px(30), fontWeight: 700, color: GOLD }}>{sl.num || "•"}</div>
              <div style={{ display: "flex", marginTop: px(4), padding: `0 ${px(8)}px`, background: "rgba(0,0,0,0.6)", borderRadius: px(6), fontSize: px(compact ? 22 : 26), fontWeight: 600, color: WHITE }}>{sl.name}</div>
              {sl.tag && <div style={{ display: "flex", fontSize: px(20), color: GOLD, fontWeight: 700 }}>{sl.tag}</div>}
            </div>
          ))}
        </div>
        {card.bench.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center", maxWidth: wide ? px(420) : pw }}>
            <div style={{ display: "flex", fontSize: px(30), color: GOLD, letterSpacing: px(5), fontWeight: 600 }}>RESERVAS</div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: wide ? "flex-start" : "center", gap: `${px(6)}px ${px(22)}px`, fontSize: px(32), color: WHITE }}>
              {card.bench.map((b, i) => <div key={i} style={{ display: "flex" }}>{b}</div>)}
            </div>
          </div>
        )}
      </div>
    );
  } else {
    const items = card.items.slice(0, compact ? 9 : 16);
    main = (
      <div style={{ display: "flex", flexDirection: "column", width: wide ? px(1300) : px(880), marginTop: px(30), gap: px(10) }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: `${k(12)}px ${px(26)}px`, borderRadius: px(12), background: i % 2 ? "rgba(255,255,255,0.03)" : "rgba(90,15,34,0.4)", borderLeft: `${px(4)}px solid ${GOLD_D}` }}>
            <div style={{ display: "flex", fontSize: k(40), color: WHITE, fontWeight: 600 }}>{it.left}</div>
            <div style={{ display: "flex", fontSize: k(40), color: GOLD, fontWeight: 700 }}>{it.right}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: w, height: h, fontFamily: "Barlow", background: `radial-gradient(ellipse at 50% 0%, ${WINE} 0%, ${INK} 62%)`, color: WHITE, padding: px(56) }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", width: "100%", height: "100%", border: `${px(3)}px solid ${GOLD_D}`, borderRadius: px(28), padding: px(44) }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {Header}
          <div style={{ display: "flex", marginTop: px(20) }}>{Title}</div>
        </div>
        {main}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: px(32), color: MUTED }}>{card.meta}</div>
          <div style={{ display: "flex", marginTop: px(12), fontSize: px(30), letterSpacing: px(12), color: GOLD, fontWeight: 600 }}>RISE. CONQUER. ASCEND.</div>
        </div>
      </div>
    </div>
  );
}

export async function renderCard(card: Card, format: FormatKey) {
  const { w, h } = FORMATS[format];
  const { fonts, crest } = await loadAssets();
  return new ImageResponse(<Body card={card} w={w} h={h} crest={crest} />, { width: w, height: h, fonts: fonts.map((f) => ({ ...f, style: "normal" as const })) });
}
