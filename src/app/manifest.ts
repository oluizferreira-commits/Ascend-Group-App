import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascend CF — Ascend Group",
    short_name: "Ascend CF",
    description: "Plataforma oficial de gestão esportiva do Ascend CF.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#04060b",
    theme_color: "#04060b",
    lang: "pt-BR",
    icons: [
      // Generated from the original crest by `npm run brand:assets` (original file untouched).
      { src: "/brand/generated/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/generated/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/generated/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
