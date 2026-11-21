import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "Ascend FC — Ascend Group", template: "%s · Ascend FC" },
  description: "Plataforma oficial de gestão esportiva do Ascend FC. RISE. CONQUER. ASCEND.",
  applicationName: "Ascend FC",
  appleWebApp: { capable: true, title: "Ascend FC", statusBarStyle: "black-translucent" },
  icons: { icon: "/brand/ascend-fc-crest.png", apple: "/brand/ascend-fc-crest.png" },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
