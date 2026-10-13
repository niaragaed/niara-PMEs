import type { Metadata } from "next";
import { OnChainInvestPage, type ServerSolanaOption } from "@/components/investir-onchain/OnChainInvestPage";
import { resolvePartner } from "@/lib/auth/resolveSocio";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { solanaConnection, listSolanaOfferings } from "@/lib/solana/program";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.investOnChain.meta.title} · Niara PMEs`,
  description: dict.investOnChain.meta.description,
  robots: { index: false, follow: false },
};
}

// Read on every request: the list of Solana offerings comes from the program itself
// (getProgramAccounts), not from an env var — a new offering published by an issuer shows up
// without a redeploy.
export const dynamic = "force-dynamic";

/**
 * Offerings from the niara-pmes-solana program (devnet), read on the server. Never breaks the
 * page: RPC down or program not deployed on this network yet = an empty list, and the selector
 * only shows the Sepolia offerings. Open ones first, then the most recent.
 */
async function loadSolanaOfferings(): Promise<ServerSolanaOption[]> {
  try {
    const offerings = await listSolanaOfferings(solanaConnection());
    return offerings
      .map((o) => ({ address: o.address, company: o.company, open: o.state === "Aberta", opening: o.opening }))
      .sort((a, b) => Number(b.open) - Number(a.open) || b.opening - a.opening);
  } catch (error) {
    console.error("invest/onchain: failed to list the Solana offerings", error);
    return [];
  }
}

// Unlike /investir (Supabase, requires signing in as an investor — see src/app/investir/page.tsx),
// this route doesn't depend on a platform account: it's driven entirely by the connected wallet
// (MetaMask on Sepolia, Phantom on Solana Devnet). Deliberate decision — any wallet can
// demonstrate the full flow without signing up/in to Niara PMEs. `isPartner` only decides whether
// the "Close offering"/"Release funds" buttons are enabled in this interface — it doesn't affect
// the rest of the page. `?rede=solana` opens straight on the first Solana offering.
export default async function Page({ searchParams }: { searchParams: Promise<{ rede?: string }> }) {
  const { rede: network } = await searchParams;
  const [{ authorized: isPartner }, confirmedOfferings, solanaOfferings] = await Promise.all([
    resolvePartner(),
    loadConfirmedOnChainOfferings(),
    loadSolanaOfferings(),
  ]);
  return (
    <OnChainInvestPage
      isPartner={isPartner}
      confirmedOfferings={confirmedOfferings}
      solanaOfferings={solanaOfferings}
      preferSolana={network === "solana"}
    />
  );
}
