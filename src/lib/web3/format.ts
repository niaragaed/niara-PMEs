import { formatUnits } from "viem";

// Formatação compartilhada de valores on-chain (bigint em unidade bruta do contrato) para
// exibição em pt-BR — usada por qualquer componente que leia dados reais em Sepolia
// (RealOnChainInvestPanel.tsx, RealPositionCard.tsx). Nunca duplicar esta lógica localmente.
//
// `maximumFractionDigits` tem default 2 (preserva o comportamento de todo call site
// existente — cotas/mBRL nesta demo sempre têm valores grandes o bastante para 2 casas serem
// suficientes). 🔴 Bug real encontrado na Fase 3: usar o default de 2 casas para exibir custo
// de gás em ETH (tipicamente 0,001–0,02 ETH nesta demo) arredonda para "0" — o valor
// continuava correto no bigint usado pela comparação do gate, só o texto mostrado é que
// mentia. `formatEth` abaixo já passa a precisão certa; ao formatar ETH em qualquer lugar
// novo, usar `formatEth`, nunca `formatToken(..., "ETH")` com o default.
export function formatToken(value: bigint, decimals: number, symbol: string, maximumFractionDigits = 2): string {
  const formatted = Number(formatUnits(value, decimals)).toLocaleString("pt-BR", {
    maximumFractionDigits,
  });
  return `${formatted} ${symbol}`;
}

/** ETH precisa de mais de 2 casas decimais para não arredondar custo de gás para "0". */
export function formatEth(valueWei: bigint): string {
  return formatToken(valueWei, 18, "ETH", 6);
}

export function formatPrazo(prazoUnixSeconds: bigint): string {
  if (prazoUnixSeconds === BigInt(0)) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(Number(prazoUnixSeconds) * 1000),
  );
}
