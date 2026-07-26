import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Inter } from "next/font/google";
import { cookieToInitialState } from "wagmi";
import { Header } from "@/components/nav/Header";
import { Footer } from "@/components/nav/Footer";
import { LenisProvider } from "@/components/scroll/LenisProvider";
import { ptBr } from "@/lib/i18n/pt-br";
import { config } from "@/lib/web3/config";
import { Providers } from "./providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Niara PMEs",
  description:
    "Niara PMEs — plataforma para pequenas e médias empresas estruturarem captação e dividirem capital via tokenização. Estágio institucional / demonstração.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Next 16: headers() é assíncrono — precisa de await.
  const initialState = cookieToInitialState(config, (await headers()).get("cookie"));

  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-soft-lg"
        >
          {ptBr.common.pularParaConteudo}
        </a>
        <Providers initialState={initialState}>
          <LenisProvider>
            <Header />
            <div id="main-content" className="flex flex-1 flex-col">
              {children}
            </div>
            <Footer />
          </LenisProvider>
        </Providers>
      </body>
    </html>
  );
}
