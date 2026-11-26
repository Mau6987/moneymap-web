import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { ServiceWorker } from "@/components/service-worker";

import { LocaleProvider } from "@/lib/i18n/client";
import { getMessages } from "@/lib/i18n/server";
import { themeScript } from "@/lib/theme";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export async function generateMetadata(): Promise<Metadata> {
  const messages = (await getMessages()).common;
  return {
    title: messages.appName,
    description: messages.appDescription,
    applicationName: messages.appName,
    // La PWA: el manifest sale de app/manifest.ts; los íconos son el logo de la app.
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
    appleWebApp: { capable: true, title: messages.appName, statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1022" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const i18n = await getMessages();
  return (
    // El script de <head> pone `data-theme` antes de que React hidrate.
    <html lang={i18n.tag} className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <LocaleProvider locale={i18n.locale}>{children}</LocaleProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
