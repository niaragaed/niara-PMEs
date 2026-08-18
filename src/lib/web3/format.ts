import { formatUnits } from "viem";

// Formatação compartilhada de valores on-chain (bigint em unidade bruta do contrato) para
// exibição em pt-BR — usada por qualquer componente que leia dados reais em Sepolia
// (RealOnChainInvestPanel.tsx, RealPositionCard.tsx). Nunca duplicar esta lógica localmente.
export function formatToken(value: bigint, decimals: number, symbol: string): string {
  const formatted = Number(formatUnits(value, decimals)).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
}

export function formatPrazo(prazoUnixSeconds: bigint): string {
  if (prazoUnixSeconds === BigInt(0)) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(Number(prazoUnixSeconds) * 1000),
  );
}
