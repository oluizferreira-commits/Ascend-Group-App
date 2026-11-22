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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "web-push"],
  // Fonts and crest read from disk by the media generator must ship with the function.
  outputFileTracingIncludes: { "/api/media/[template]": ["./assets/fonts/**", "./public/brand/generated/crest-256.png"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
