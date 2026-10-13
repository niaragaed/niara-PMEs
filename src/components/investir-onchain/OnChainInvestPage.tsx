"use client";

import { useState, type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "./RealOnChainInvestPanel";
import { SolanaInvestPanel } from "./SolanaInvestPanel";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import { ptBr } from "@/lib/i18n/pt-br";

type OfferingOption = { key: string; label: string; proveniencia: string } & (
  | { rede: "sepolia"; tokenAddress: `0x${string}`; offeringAddress: `0x${string}` }
  | { rede: "solana-devnet"; offeringAddress: string }
);

/** Oferta do programa niara-pmes-solana, já lida no servidor (page.tsx). */
export type ServerSolanaOption = { address: string; company: string; open: boolean; opening: number };

// Fase 4, sub-etapa 5.2 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md): o seletor passa a unir DUAS
// origens de oferta — a lista legada (NEXT_PUBLIC_OFERTAS_ONCHAIN, 10 ofertas de reserva criadas
// por script administrativo) e as ofertas self-service já confirmadas no Supabase
// (`confirmedOfferings`, lida no servidor por page.tsx via loadConfirmedOnChainOfferings()).
// Nenhuma das duas é "mais real" que a outra — toda a plataforma é demonstração, MockBRL sem
// lastro para as duas. 🔴 Mas os dois lados NÃO compartilham o mesmo MockBRL — incidente real
// corrigido (ver CLAUDE.md, "Tela /investir/onchain"): a afirmação anterior deste comentário
// ("OfertaCaptacao.moeda() bate para ambas") nunca foi verificada linha a linha e estava errada.
// As 10 ofertas legadas de fato compartilham um único MockBRL; as self-service usam o MockBRL
// próprio do OfertaOrquestrador, diferente. Por isso cada oferta resolve seu próprio MockBRL
// on-chain (ver RealOnChainInvestPanel/useOfertaOnChain/useOnChainActions), nunca uma constante
// global — a única diferença que ESTE seletor precisa expor é a linha de proveniência do
// conteúdo (empresa inventada à mão vs. dados que o próprio emissor preencheu), não uma
// separação estrutural.
function buildOptions(confirmedOfferings: ConfirmedOnChainOffering[], solanaOfferings: ServerSolanaOption[]): OfferingOption[] {
  const t = ptBr.investOnChain.offeringSelector;
  const ts = ptBr.solana;
  const legacy = getOnChainAddresses()?.offerings ?? [];

  const legacyOptions: OfferingOption[] = legacy.map((pair, index) => ({
    rede: "sepolia" as const,
    key: `legado-${index}`,
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

  // Solana: a lista vem do próprio programa; as que têm linha confirmada no Supabase (publicadas
  // pelo emissor no site) ganham o nome da empresa cadastrada, as demais (criadas pelo script de
  // administração do niara-pmes-solana) são as empresas fictícias de demonstração, com o nome
  // gravado on-chain.
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
  const t = ptBr.investOnChain;
  const ts = ptBr.solana;
  const options = buildOptions(confirmedOfferings, solanaOfferings);
  const initial = (preferSolana ? options.find((o) => o.rede === "solana-devnet") : undefined) ?? options[0];

  const [selectedKey, setSelectedKey] = useState(initial?.key ?? "");
  const selected = options.find((option) => option.key === selectedKey) ?? options[0] ?? null;

  function handleSwitchOffering(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedKey(event.target.value);
  }

  // Sem nenhuma opção disponível (nem legada nem self-service confirmada), não há o que mostrar.
  // Não existe mais um check de "MockBRL global configurado" aqui — cada oferta resolve o seu
  // próprio MockBRL on-chain (ver RealOnChainInvestPanel), então a única coisa que pode faltar
  // neste nível é a lista de ofertas em si.
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
