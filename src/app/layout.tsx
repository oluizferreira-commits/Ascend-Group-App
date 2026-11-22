import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa";
import { getThemeMode } from "@/lib/theme";

export const metadata: Metadata = {
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
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const mode = await getThemeMode();
  return (
    <html lang="pt-BR" data-theme={mode === "system" ? undefined : mode}>
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
