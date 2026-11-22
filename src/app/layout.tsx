import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { ServiceWorkerRegistrar, AppTouchGuards } from "@/components/pwa";
import { UpdateNotice } from "@/components/update-notice";
import { CookieNotice } from "@/components/cookie-notice";
import { MotionProvider } from "@/components/fx/motion-provider";
import { getThemeMode } from "@/lib/theme";

export const metadata: Metadata = {
  // Absolute base for Open Graph images in link previews (WhatsApp, Instagram, TikTok…).
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Ascend CF — Ascend Group", template: "%s · Ascend CF" },
  description: "Plataforma oficial de gestão esportiva do Ascend CF. RISE. CONQUER. ASCEND.",
  applicationName: "Ascend CF",
  appleWebApp: { capable: true, title: "Ascend CF", statusBarStyle: "black-translucent" },
  icons: { icon: "/brand/generated/crest-64.png", apple: "/brand/generated/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#04060b" },
  ],
  width: "device-width",
  initialScale: 1,
  // App-like behaviour requested by the club: no pinch / double-tap zoom.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const mode = await getThemeMode();
  return (
    <html lang="pt-BR" data-theme={mode === "system" ? undefined : mode}>
      <body>
        <MotionProvider>{children}</MotionProvider>
        <ServiceWorkerRegistrar />
        <AppTouchGuards />
        <UpdateNotice />
        <CookieNotice />
      </body>
    </html>
  );
}
