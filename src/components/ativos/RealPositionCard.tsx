"use client";

// The only REAL card inside /ativos (the rest of the screen is 100% mock, see AssetsPage.tsx) —
// your actual position in the demo offering on Sepolia, read straight from the on-chain contract
// via the same hooks in src/lib/web3/hooks/useOnChainOffering.ts used in /investir/onchain. Never
// goes into the computeTotals/PortfolioSummary calculations nor into the PositionsTable rows —
// mock and real always stay on separate surfaces, never added together.
//
// Visually distinct on purpose (ring + solid salmon badge), the same pattern already used in
// RealOfferCard.tsx (src/components/negociar/) to tell a real offering from a fictitious one —
// here adapted to the dark card (bg-panel) already used in the rest of /ativos, instead of the
// white card of /negociar.
//
// Deliberate simplification: when several offerings are configured at the same time
// (NEXT_PUBLIC_OFERTAS_ONCHAIN, see src/lib/web3/addresses.ts — an in-person demo with several
// backup offerings), this card always shows the position in the FIRST one of the list (index 0,
// the hooks' default) — it doesn't try to guess "which offering the user is demonstrating now".
// Whoever wants to see/switch the specific offering uses the selector inside /investir/onchain.
import Link from "next/link";
import { useConnection } from "wagmi";
import { sepolia } from "wagmi/chains";
import { BadgeCheck } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useMyOnChainPosition, useOnChainOfferingTerms } from "@/lib/web3/hooks/useOnChainOffering";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import { formatToken } from "@/lib/web3/format";
import { useDictionary } from "@/lib/i18n/client";

export function RealPositionCard() {
  const dict = useDictionary();
  const t = dict.assets.realPosition;
  const connection = useConnection();
  const isOnSepolia = connection.chainId === sepolia.id;

  // Still always the first offering of the LEGACY list (env var) — the same deliberate
  // simplification as before Phase 4, sub-step 5.2: this card never tried to "guess" which
  // offering to show, and it isn't the place to decide that between legacy/self-service.
  const addresses = getOnChainAddresses()?.offerings[0] ?? null;
  const terms = useOnChainOfferingTerms(addresses);
  const position = useMyOnChainPosition(addresses);

  // Without the 3 addresses configured, the card simply doesn't show up — there's no real
  // position to show (the same "never breaks" rule as OnChainInvestPage.tsx).
  if (!terms.configured) return null;

  return (
    <div className="rounded-lg bg-panel p-5 ring-2 ring-salmon sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </span>
        <Link
          href="/investir/onchain"
          className="text-xs font-semibold text-salmon underline underline-offset-2 hover:text-salmon-600"
        >
          {t.link}
        </Link>
      </div>

      <p className="mt-3 text-xs text-on-military-muted">{t.explanation}</p>

      {!connection.isConnected ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-on-military-muted">{t.connectPrompt}</p>
          <ConnectWallet />
        </div>
      ) : !isOnSepolia ? (
        <p className="mt-4 text-sm text-on-military">{t.wrongNetwork}</p>
      ) : position.invested === BigInt(0) ? (
        <p className="mt-4 text-sm text-on-military-muted">{t.noPosition}</p>
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-on-military-muted">{t.invested}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {formatToken(position.invested, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.shares}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {formatToken(
                position.participationTokenBalance,
                terms.participationTokenDecimals,
                terms.participationTokenSymbol,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.stateLabel}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {terms.state ? dict.investOnChain.terms.states[terms.state] : "—"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
