// Generates display/PWA derivatives from the ORIGINAL crest without modifying it.
// The crest is placed, unaltered and proportion-preserving, on the brand's black background.
import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const SRC = "public/brand/ascend-fc-crest.png";
const OUT = "public/brand/generated";
if (!existsSync(SRC)) {
  console.error(`✖ ${SRC} não encontrado. Adicione o escudo original e rode novamente.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });
const BG = { r: 7, g: 7, b: 10, alpha: 1 };

async function icon(size, padding, name) {
  const inner = Math.round(size * (1 - padding * 2));
  const crest = await sharp(SRC).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: crest, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`✔ ${OUT}/${name}`);
}

await icon(192, 0.08, "icon-192.png");
await icon(512, 0.08, "icon-512.png");
await icon(512, 0.2, "icon-maskable-512.png"); // safe zone for Android masks
await icon(180, 0.08, "apple-touch-icon.png");
for (const w of [64, 128, 256]) {
  await sharp(SRC).resize({ width: w, fit: "inside" }).png().toFile(`${OUT}/crest-${w}.png`);
  console.log(`✔ ${OUT}/crest-${w}.png`);
}

// iOS launch screens (apple-touch-startup-image) — crest on the brand gradient, original untouched.
const SPLASH = [[1290, 2796], [1179, 2556], [1170, 2532], [1284, 2778], [1125, 2436], [828, 1792], [1242, 2688], [750, 1334]];
for (const [w, h] of SPLASH) {
  const crestW = Math.round(w * 0.42);
  const crest = await sharp(SRC).resize(crestW, crestW, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#15318a"/><stop offset="0.4" stop-color="#0c1d4f"/><stop offset="0.85" stop-color="#04060b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  await sharp(bg).composite([{ input: crest, gravity: "center" }]).png().toFile(`${OUT}/splash-${w}x${h}.png`);
  console.log(`✔ ${OUT}/splash-${w}x${h}.png`);
}
