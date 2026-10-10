import { ptBr } from "@/lib/i18n/pt-br";
import type { RedeOferta } from "@/lib/web3/confirmedOfferings";

/** Selo da rede onde a oferta vive — sempre explícito, nunca implícito (mesma regra do Register). */
export function RedeBadge({ rede, fundo = "escuro" }: { rede: RedeOferta; fundo?: "escuro" | "claro" }) {
  const t = ptBr.solana;
  const cores = fundo === "claro" ? "border-border text-ink-muted" : "border-panel-border text-on-military-muted";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cores}`}>
      {rede === "solana-devnet" ? t.redeNome : t.redeSepolia}
    </span>
  );
}
