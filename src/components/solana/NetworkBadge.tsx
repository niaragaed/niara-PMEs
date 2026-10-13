"use client";
import type { OfferingNetwork } from "@/lib/web3/confirmedOfferings";
import { useDictionary } from "@/lib/i18n/client";

/** Badge for the network where the offering lives — always explicit, never implied (same rule as Register). */
export function NetworkBadge({ rede: network, background = "dark" }: { rede: OfferingNetwork; background?: "dark" | "light" }) {
  const dict = useDictionary();
  const t = dict.solana;
  const colors = background === "light" ? "border-border text-ink-muted" : "border-panel-border text-on-military-muted";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors}`}>
      {network === "solana-devnet" ? t.networkName : t.sepoliaNetwork}
    </span>
  );
}
