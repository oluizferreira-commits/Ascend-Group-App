import type { NextConfig } from "next";

// Cache Components is intentionally disabled: almost every screen of this
// platform is per-user, permission-scoped and must reflect writes immediately.
// Rendering is dynamic by default; see docs/ARCHITECTURE.md.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Unique per deploy: Vercel's commit SHA, or the build time locally.
const APP_VERSION = (process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`).slice(0, 12);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  // "Seja do Ascend" photo uploads are resized in the browser (~200 KB); keep headroom below Vercel's 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  serverExternalPackages: ["@node-rs/argon2", "web-push"],
  // Fonts and crest read from disk by the media generator must ship with the function.
  outputFileTracingIncludes: {
    "/api/media/[template]": ["./assets/fonts/**", "./public/brand/generated/crest-256.png"],
    "/api/card/[id]": ["./assets/fonts/**", "./public/brand/generated/crest-256.png"],
    "/api/compare": ["./assets/fonts/**", "./public/brand/generated/crest-256.png"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Always revalidate the service worker so app updates are picked up immediately.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;
