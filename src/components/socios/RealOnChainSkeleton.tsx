import { OrigemBadge } from "./SociosDashboard";
import { ptBr } from "@/lib/i18n/pt-br";

// Fallback do <Suspense> em page.tsx enquanto RealOnChainSection lê os eventos on-chain — pode
// demorar sem uma RPC dedicada (NEXT_PUBLIC_SEPOLIA_RPC_URL), ver src/lib/web3/events.ts.
export function RealOnChainSkeleton() {
  const t = ptBr.socios;
  return (
    <section className="mt-8" aria-live="polite">
      <div className="flex items-center gap-2">
        <OrigemBadge real />
        <h2 className="text-lg font-semibold text-on-military">{t.resumoReal.title}</h2>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg border border-panel-border bg-panel" />
        ))}
      </div>
      <p className="mt-3 text-xs text-on-military-muted">{t.resumoReal.carregando}</p>
    </section>
  );
}
