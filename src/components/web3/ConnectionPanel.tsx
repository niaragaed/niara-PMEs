"use client";

import { useBalance, useConnection } from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { ptBr } from "@/lib/i18n/pt-br";

export function ConnectionPanel() {
  const t = ptBr.profile.wallet.panel;
  const connection = useConnection();
  const isOnSepolia = connection.chainId === sepolia.id;

  const balance = useBalance({
    address: connection.address,
    chainId: sepolia.id,
    query: { enabled: connection.isConnected && isOnSepolia && Boolean(connection.address) },
  });

  function networkName(chainId: number | undefined) {
    if (chainId === undefined) return "—";
    if (chainId === sepolia.id) return sepolia.name;
    return `${t.unknownNetwork} (${chainId})`;
  }

  function balanceValue() {
    if (!connection.isConnected) return "—";
    if (!isOnSepolia) return t.unknownNetwork;
    if (balance.isPending) return t.loadingBalance;
    if (!balance.data) return "—";
    return `${formatUnits(balance.data.value, balance.data.decimals)} ${balance.data.symbol}`;
  }

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    {
      label: t.status,
      value: connection.isConnected ? t.statusConnected : t.statusDisconnected,
    },
    {
      label: t.address,
      value: connection.address ?? "—",
      mono: true,
    },
    {
      label: t.network,
      value: connection.isConnected ? networkName(connection.chainId) : "—",
    },
    {
      label: t.balance,
      value: balanceValue(),
      mono: true,
    },
  ];

  return (
    <div className="rounded-lg border border-panel-border bg-panel p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-on-military">{t.title}</h3>

      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-on-military-muted">{row.label}</dt>
            <dd
              className={
                row.mono
                  ? "break-all text-right font-mono tabular-nums text-on-military"
                  : "text-right text-on-military"
              }
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {!connection.isConnected && (
        <p className="mt-4 text-xs text-on-military-muted">{t.noConnectionNote}</p>
      )}
    </div>
  );
}
