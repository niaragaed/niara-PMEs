import { formatUnits } from "viem";

// Shared formatting of on-chain values (a bigint in the contract's raw unit) for display, in
// pt-BR number format (BRL product) — used by any component that reads real data on Sepolia
// (RealOnChainInvestPanel.tsx, RealPositionCard.tsx). Never duplicate this logic locally.
//
// `maximumFractionDigits` defaults to 2 (keeps the behavior of every existing call site —
// shares/mBRL in this demo always have values large enough for 2 decimals to be enough).
// 🔴 A real bug found in Phase 3: using the 2-decimal default to display a gas cost in ETH
// (typically 0.001–0.02 ETH in this demo) rounds it to "0" — the value stayed correct in the
// bigint used by the gate's comparison, only the displayed text lied. `formatEth` below already
// passes the right precision; when formatting ETH anywhere new, use `formatEth`, never
// `formatToken(..., "ETH")` with the default.
export function formatToken(value: bigint, decimals: number, symbol: string, maximumFractionDigits = 2): string {
  const formatted = Number(formatUnits(value, decimals)).toLocaleString("pt-BR", {
    maximumFractionDigits,
  });
  return `${formatted} ${symbol}`;
}

/** ETH needs more than 2 decimals so a gas cost isn't rounded to "0". */
export function formatEth(valueWei: bigint): string {
  return formatToken(valueWei, 18, "ETH", 6);
}

export function formatDeadline(deadlineUnixSeconds: bigint): string {
  if (deadlineUnixSeconds === BigInt(0)) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(Number(deadlineUnixSeconds) * 1000),
  );
}
