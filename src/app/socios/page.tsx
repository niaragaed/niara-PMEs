import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { resolvePartner } from "@/lib/auth/resolvePartner";
import { PartnersLoginForm } from "@/components/socios/PartnersLoginForm";
import { PartnersDashboard } from "@/components/socios/PartnersDashboard";
import { TransactionsSection } from "@/components/socios/TransactionsSection";
import { TransactionsSkeleton } from "@/components/socios/TransactionsSkeleton";
import { SignOutButton } from "@/components/conta/SignOutButton";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.partners.meta.title} · Niara PMEs`,
  robots: { index: false, follow: false },
};
}

// 60s (the Vercel Hobby plan's maximum) instead of the default 10s — the on-chain read
// (inside getTransactionsAndSummary(), via getEventsOnChain/getSummaryOnChain in the <Suspense>
// below) scans a block window that only grows over time and, without a dedicated
// NEXT_PUBLIC_SEPOLIA_RPC_URL, gets rate limited on the public RPC; without this, Vercel kills the
// function mid-run (no error at all for the browser, just the request hanging forever) before the
// Suspense even manages to deliver the rest of the page. Doesn't replace a dedicated RPC — it only
// avoids the worst case.
export const maxDuration = 60;

// Internal area, not the same flow as /entrar (investor/issuer) — see
// src/lib/auth/resolvePartner.ts. Signed in but outside the allowlist = access denied, without a
// redirect (stays on the page itself, with a clear message).
export default async function Page() {
  const dict = await getDictionary();
  const { userId, email, authorized } = await resolvePartner();

  if (!userId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-military px-4 py-16">
        <div className="w-full max-w-sm rounded-lg border border-panel-border bg-panel p-6">
          <h1 className="text-xl font-semibold text-on-military">{dict.partners.login.title}</h1>
          <p className="mt-1 text-sm text-on-military-muted">{dict.partners.login.subtitle}</p>
          <PartnersLoginForm />
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-military px-4 py-16">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border border-panel-border bg-panel p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-salmon" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-on-military">{dict.partners.denied.title}</h1>
            <p className="mt-1 text-sm text-on-military-muted">{dict.partners.denied.subtitle}</p>
          </div>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return (
    <PartnersDashboard
      email={email ?? ""}
      transactionsSlot={
        <Suspense fallback={<TransactionsSkeleton />}>
          <TransactionsSection />
        </Suspense>
      }
    />
  );
}
