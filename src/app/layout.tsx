import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Inter } from "next/font/google";
import { cookieToInitialState } from "wagmi";
import { Header } from "@/components/nav/Header";
import { Footer } from "@/components/nav/Footer";
import { LenisProvider } from "@/components/scroll/LenisProvider";
import { config } from "@/lib/web3/config";
import { Providers } from "./providers";
import "./globals.css";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { htmlLang } from "@/lib/i18n/locale";
import { getSiteOrigin } from "@/lib/site";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    // Base for every relative URL in the metadata (canonical, og:url, ...).
    metadataBase: new URL(getSiteOrigin()),
    title: dict.meta.title,
    description: dict.meta.description,
    // Tab icons: transparent mark, dark for light tab bars and light for dark ones.
    // Source: public/icons (see public/icons/README.md).
    icons: {
      icon: [
        { url: "/icons/icon-dark-mark-16.png", sizes: "16x16", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/icons/icon-dark-mark-32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
        { url: "/icons/icon-light-mark-16.png", sizes: "16x16", type: "image/png", media: "(prefers-color-scheme: dark)" },
        { url: "/icons/icon-light-mark-32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
      ],
      apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary();
  // Next 16: headers() is async — it needs await.
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));

  return (
    <html
      lang={htmlLang(locale)}
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-soft-lg"
        >
          {dict.common.skipToContent}
        </a>
        <I18nProvider locale={locale}>
          <Providers initialState={initialState}>
            <LenisProvider>
              <Header />
              <div id="main-content" className="flex flex-1 flex-col">
                {children}
              </div>
              <Footer />
            </LenisProvider>
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
