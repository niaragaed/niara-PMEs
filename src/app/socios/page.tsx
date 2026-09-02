import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { resolveSocio } from "@/lib/auth/resolveSocio";
import { SociosLoginForm } from "@/components/socios/SociosLoginForm";
import { SociosDashboard } from "@/components/socios/SociosDashboard";
import { MovimentacoesSection } from "@/components/socios/MovimentacoesSection";
import { MovimentacoesSkeleton } from "@/components/socios/MovimentacoesSkeleton";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.socios.meta.title} · Niara PMEs`,
  robots: { index: false, follow: false },
};

// 60s (máximo do plano Hobby da Vercel) em vez do padrão de 10s — a leitura on-chain
// (dentro de getMovimentacoes(), via getEventosOnChain/getResumoOnChain no <Suspense> abaixo)
// escaneia uma janela de blocos que só cresce com o tempo e, sem NEXT_PUBLIC_SEPOLIA_RPC_URL
// dedicada, sofre rate limit no RPC público; sem isto, a Vercel mata a função no meio da
// execução (sem erro nenhum pro navegador, só a requisição pendurada para sempre) antes mesmo do
// Suspense conseguir entregar o resto da página. Não substitui uma RPC dedicada — só evita o
// pior caso.
export const maxDuration = 60;

// Área interna, não é o mesmo fluxo de /entrar (investidor/emissor) — ver
// src/lib/auth/resolveSocio.ts. Autenticado mas fora da allowlist = acesso negado, sem
// redirect (fica na própria página, mensagem clara).
export default async function Page() {
  const { userId, email, autorizado } = await resolveSocio();

  if (!userId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-military px-4 py-16">
        <div className="w-full max-w-sm rounded-lg border border-panel-border bg-panel p-6">
          <h1 className="text-xl font-semibold text-on-military">{ptBr.socios.login.title}</h1>
          <p className="mt-1 text-sm text-on-military-muted">{ptBr.socios.login.subtitle}</p>
          <SociosLoginForm />
        </div>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-military px-4 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-panel-border bg-panel p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-salmon" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-on-military">{ptBr.socios.negado.title}</h1>
            <p className="mt-1 text-sm text-on-military-muted">{ptBr.socios.negado.subtitle}</p>
          </div>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <SociosDashboard
      email={email ?? ""}
      movimentacoesSlot={
        <Suspense fallback={<MovimentacoesSkeleton />}>
          <MovimentacoesSection />
        </Suspense>
      }
    />
  );
}
