import { AlertTriangle } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";

// Placeholder documents (the same "Coming soon" list for every offering, never specific to a
// company) + the generic Res. CVM 88 risks — shared by the detail pages of real on-chain offerings
// (SelfServiceOfferingDetailPage, SolanaOfferingDetailPage).
export async function DocumentsAndRisks() {
  const dict = await getDictionary();
  const t = dict.trade.offering;
  return (
    <>
            <section className="rounded-lg bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t.documents.title}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {dict.common.defaultDocuments.map((doc) => (
                  <li
                    key={doc}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2.5 text-sm text-ink-muted"
                  >
                    {doc}
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t.documents.comingSoon}
                      className="shrink-0 cursor-not-allowed rounded-full bg-military-100 px-3 py-1 text-xs font-medium text-military"
                    >
                      {t.documents.comingSoon}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-salmon/40 bg-surface p-6 shadow-soft">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-salmon" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-ink">{t.risks.title}</h2>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {t.risks.items.map((risk) => (
                  <li key={risk} className="flex gap-2 text-sm text-ink-muted">
                    <span aria-hidden="true">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </section>
    </>
  );
}
