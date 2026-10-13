import { ptBr } from "@/lib/i18n/pt-br";
import type { OfferingNetwork } from "@/lib/web3/confirmedOfferings";

/** Selo da rede onde a oferta vive — sempre explícito, nunca implícito (mesma regra do Register). */
export function NetworkBadge({ rede: network, background = "escuro" }: { rede: OfferingNetwork; background?: "escuro" | "claro" }) {
  const t = ptBr.solana;
  const colors = background === "claro" ? "border-border text-ink-muted" : "border-panel-border text-on-military-muted";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors}`}>
      {network === "solana-devnet" ? t.networkName : t.sepoliaNetwork}
    </span>
  );
}
