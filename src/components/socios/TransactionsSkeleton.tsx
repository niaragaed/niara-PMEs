import { getDictionary } from "@/lib/i18n/server";

// The <Suspense> fallback in page.tsx while TransactionsSection fetches the timeline (on-chain +
// off-chain) — it can take a while without a dedicated RPC (NEXT_PUBLIC_SEPOLIA_RPC_URL), see
// src/lib/web3/events.ts.
export async function TransactionsSkeleton() {
  const dict = await getDictionary();
  const t = dict.partners;
  return (
    <section className="mt-8" aria-live="polite">
      <h2 className="text-lg font-semibold text-on-military">{t.transactions.title}</h2>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-lg border border-panel-border bg-panel" />
        ))}
      </div>
      <p className="mt-3 text-xs text-on-military-muted">{t.transactions.loading}</p>
    </section>
  );
}
