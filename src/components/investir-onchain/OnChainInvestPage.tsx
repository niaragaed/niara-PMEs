"use client";

import { useState, type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "./RealOnChainInvestPanel";
import { SolanaInvestPanel } from "./SolanaInvestPanel";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary } from "@/lib/i18n/client";

type OfferingOption = { key: string; label: string; proveniencia: string } & (
  | { rede: "sepolia"; tokenAddress: `0x${string}`; offeringAddress: `0x${string}` }
  | { rede: "solana-devnet"; offeringAddress: string }
);

/** An offering from the niara-pmes-solana program, already read on the server (page.tsx). */
export type ServerSolanaOption = { address: string; company: string; open: boolean; opening: number };

// Phase 4, sub-step 5.2 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md): the selector now joins TWO
// offering sources — the legacy list (NEXT_PUBLIC_OFERTAS_ONCHAIN, 10 backup offerings created by
// an admin script) and the self-service offerings already confirmed in Supabase
// (`confirmedOfferings`, read on the server by page.tsx via loadConfirmedOnChainOfferings()).
// Neither is "more real" than the other — the whole platform is a demo, with unbacked MockBRL for
// both. 🔴 But the two sides do NOT share the same MockBRL — a real incident, fixed (see
// CLAUDE.md, "/investir/onchain screen"): this comment's previous claim ("OfertaCaptacao.moeda()
// matches for both") was never checked line by line and was wrong. The 10 legacy offerings do
// share a single MockBRL; the self-service ones use OfertaOrquestrador's own, different MockBRL.
// That's why each offering resolves its own MockBRL on-chain (see
// RealOnChainInvestPanel/useOnChainOffering/useOnChainActions), never a global constant — the only
// difference THIS selector needs to expose is the content's provenance line (a hand-made company
// vs. data the issuer itself filled in), not a structural separation.
function buildOptions(
  confirmedOfferings: ConfirmedOnChainOffering[],
  solanaOfferings: ServerSolanaOption[],
  dict: Dictionary,
): OfferingOption[] {
  const t = dict.investOnChain.offeringSelector;
  const ts = dict.solana;
  const legacy = getOnChainAddresses()?.offerings ?? [];

  const legacyOptions: OfferingOption[] = legacy.map((pair, index) => ({
    rede: "sepolia" as const,
    key: `legacy-${index}`,
    tokenAddress: pair.token,
    offeringAddress: pair.offering,
    label: `${t.option} ${index + 1}`,
    proveniencia: t.provenance.legacy,
  }));

  const selfServiceOptions: OfferingOption[] = confirmedOfferings.flatMap((offering) =>
    offering.rede === "sepolia"
      ? [
          {
            rede: "sepolia" as const,
            key: offering.id,
            tokenAddress: offering.tokenAddress,
            offeringAddress: offering.contractAddress,
            label: offering.issuerTradeName ?? offering.issuerLegalName,
            proveniencia: t.provenance.selfService,
          },
        ]
      : [],
  );

  // Solana: the list comes from the program itself; the ones with a confirmed row in Supabase
  // (published by the issuer on the site) get the registered company's name, the others (created
  // by the niara-pmes-solana admin script) are the fictitious demo companies, with the name
  // stored on-chain.
  const selfServiceSolana = new Map(
    confirmedOfferings.filter((o) => o.rede === "solana-devnet").map((o) => [o.contractAddress, o]),
  );
  const solanaOptions: OfferingOption[] = solanaOfferings.map((o) => {
    const registered = selfServiceSolana.get(o.address);
    return {
      rede: "solana-devnet" as const,
      key: `solana-${o.address}`,
      offeringAddress: o.address,
      label: registered ? (registered.issuerTradeName ?? registered.issuerLegalName) : o.company,
      proveniencia: registered ? ts.selector.provenanceSelfService : ts.selector.provenanceDemo,
    };
  });

  return [...legacyOptions, ...selfServiceOptions, ...solanaOptions];
}

export function OnChainInvestPage({
  isPartner = false,
  confirmedOfferings,
  solanaOfferings = [],
  preferSolana = false,
}: {
  isPartner?: boolean;
  confirmedOfferings: ConfirmedOnChainOffering[];
  solanaOfferings?: ServerSolanaOption[];
  preferSolana?: boolean;
}) {
  const dict = useDictionary();
  const t = dict.investOnChain;
  const ts = dict.solana;
  const options = buildOptions(confirmedOfferings, solanaOfferings, dict);
  const initial = (preferSolana ? options.find((o) => o.rede === "solana-devnet") : undefined) ?? options[0];

  const [selectedKey, setSelectedKey] = useState(initial?.key ?? "");
  const selected = options.find((option) => option.key === selectedKey) ?? options[0] ?? null;

  function handleSwitchOffering(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedKey(event.target.value);
  }

  // With no option available (neither legacy nor confirmed self-service), there's nothing to show.
  // There's no longer a "global MockBRL configured" check here — each offering resolves its own
  // MockBRL on-chain (see RealOnChainInvestPanel), so the only thing that can be missing at this
  // level is the list of offerings itself.
  if (options.length === 0 || !selected) {
    return (
      <main className="flex flex-1 flex-col bg-military">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.title}</h1>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
            <p>{t.contractNotConfigured}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">
          {selected.rede === "solana-devnet" ? ts.investPage.title : t.title}
        </h1>
        <p className="mt-2 text-sm text-on-military-muted">
          {selected.rede === "solana-devnet" ? ts.investPage.subtitle : t.subtitle}
        </p>

        <div className="mt-6 flex flex-col gap-6">
          {options.length > 1 && (
            <label className="flex flex-col gap-1 rounded-lg border border-panel-border bg-panel p-5 text-sm">
              <span className="text-xs font-semibold text-on-military-muted">{t.offeringSelector.label}</span>
              <select
                value={selected.key}
                onChange={handleSwitchOffering}
                className="w-full max-w-xs rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
              >
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    [{option.rede === "solana-devnet" ? ts.networkName : ts.sepoliaNetwork}] {option.label} — {option.proveniencia}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selected.rede === "sepolia" ? (
            <RealOnChainInvestPanel
              key={selected.key}
              tokenAddress={selected.tokenAddress}
              offeringAddress={selected.offeringAddress}
              isPartner={isPartner}
            />
          ) : (
            <SolanaInvestPanel key={selected.key} offeringAddress={selected.offeringAddress} isPartner={isPartner} />
          )}
        </div>
      </div>
    </main>
  );
}
