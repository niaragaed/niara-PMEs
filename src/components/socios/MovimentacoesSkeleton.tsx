import { ptBr } from "@/lib/i18n/pt-br";

// Fallback do <Suspense> em page.tsx enquanto MovimentacoesSection busca a timeline (on-chain +
// off-chain) — pode demorar sem uma RPC dedicada (NEXT_PUBLIC_SEPOLIA_RPC_URL), ver
// src/lib/web3/events.ts.
export function MovimentacoesSkeleton() {
  const t = ptBr.socios;
  return (
    <section className="mt-8" aria-live="polite">
      <h2 className="text-lg font-semibold text-on-military">{t.movimentacoes.title}</h2>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg border border-panel-border bg-panel" />
        ))}
      </div>
      <p className="mt-3 text-xs text-on-military-muted">{t.movimentacoes.carregando}</p>
    </section>
  );
}
