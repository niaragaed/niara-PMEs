import { ExternalLink } from "lucide-react";
import type { Transaction } from "@/lib/partners/transactions";
import { OriginBadge } from "./PartnersDashboard";
import { getDictionary } from "@/lib/i18n/server";

// Explicit time zone: the server (Vercel) runs in UTC; without it the time would show 3h ahead.
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function formatEpoch(timestamp: number): string {
  if (!timestamp) return "—";
  return dateFormatter.format(new Date(timestamp * 1000));
}

// A single timeline with ALL the activity on the site (real on-chain + off-chain/Supabase), an
// explicit user request: one table only, not split into sections — each row carries its
// own OriginBadge for anyone who wants to know where it came from, but there's one list/ordering.
export async function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const dict = await getDictionary();
  const t = dict.partners.transactions;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-on-military">{t.title}</h2>
      <p className="mt-1 text-xs text-on-military-muted">{t.subtitle}</p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-panel-border bg-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-panel-border text-xs uppercase tracking-wide text-on-military-muted">
              <th className="px-4 py-3">{t.colOrigin}</th>
              <th className="px-4 py-3">{t.colType}</th>
              <th className="px-4 py-3">{t.colActor}</th>
              <th className="px-4 py-3">{t.colValue}</th>
              <th className="px-4 py-3">{t.colDate}</th>
              <th className="px-4 py-3">{t.colLink}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-on-military-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              transactions.map((mov) => (
                <tr key={mov.id} className="border-b border-panel-border last:border-0">
                  <td className="px-4 py-3">
                    <OriginBadge real={mov.origin === "onchain"} network={mov.network} />
                  </td>
                  <td className="px-4 py-3 text-on-military">{mov.type}</td>
                  <td className="px-4 py-3 text-on-military-muted">{mov.actor ?? "—"}</td>
                  <td className="px-4 py-3 text-on-military">{mov.value ?? "—"}</td>
                  <td className="px-4 py-3 text-on-military-muted">{formatEpoch(mov.timestamp)}</td>
                  <td className="px-4 py-3">
                    {mov.link ? (
                      <a
                        href={mov.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-salmon underline underline-offset-2 hover:text-salmon-600"
                      >
                        {t.viewOnChain}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
