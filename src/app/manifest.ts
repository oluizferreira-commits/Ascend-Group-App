import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascend FC — Ascend Group",
    short_name: "Ascend FC",
    description: "Plataforma oficial de gestão esportiva do Ascend FC.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#07070a",
    theme_color: "#07070a",
    lang: "pt-BR",
    icons: [
      // Generated from the original crest by `npm run brand:assets` (original file untouched).
      { src: "/brand/generated/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/generated/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/generated/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
