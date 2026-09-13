import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SkipLink } from "@/components/skip-link";

export const metadata: Metadata = {
  title: { default: "ClauseSaathi", template: "%s · ClauseSaathi" },
  description:
    "Understand any legal document before you sign it. Plain-language explanations with clause citations, obligations and deadlines, risks checked against Indian law, and questions to take to a lawyer.",
  metadataBase: new URL("https://clausesaathi.bisman.org"),
};

/** Every page renders per request so the CSP nonce from `proxy.ts` applies. */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#161412" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <LocaleProvider>
          <SkipLink />
          <SiteHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl flex-1 px-4 py-8"
          >
            {children}
          </main>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
