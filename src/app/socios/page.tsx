import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { resolveSocio } from "@/lib/auth/resolveSocio";
import { SociosLoginForm } from "@/components/socios/SociosLoginForm";
import { SociosDashboard } from "@/components/socios/SociosDashboard";
import { RealOnChainSection } from "@/components/socios/RealOnChainSection";
import { RealOnChainSkeleton } from "@/components/socios/RealOnChainSkeleton";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { computeResumoMock, listarTransacoesMock } from "@/lib/socios/mockTransacoes";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.socios.meta.title} · Niara PMEs`,
  robots: { index: false, follow: false },
};

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

  const transacoesMock = await listarTransacoesMock();
  const resumoMock = computeResumoMock(transacoesMock);

  return (
    <SociosDashboard
      email={email ?? ""}
      transacoesMock={transacoesMock}
      resumoMock={resumoMock}
      realOnChainSlot={
        <Suspense fallback={<RealOnChainSkeleton />}>
          <RealOnChainSection />
        </Suspense>
      }
    />
  );
}
