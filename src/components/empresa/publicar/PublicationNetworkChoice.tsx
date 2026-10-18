import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Network selector for the publication — only shows up while the offering has no recorded
 * attempt (`sync_status='nao_onchain'`). It's simple navigation (`?rede=solana|sepolia`; without
 * the parameter, the network chosen when the offering was created applies), stateless: the
 * network only really takes effect when registerAttempt/registerAttemptSolana record the attempt,
 * and from then on the page follows the row's network (migration 0017).
 */
export async function PublicationNetworkChoice({ offeringId, current }: { offeringId: string; current: "sepolia" | "solana" }) {
  const dict = await getDictionary();
  const t = dict.solana.publish.networkChoice;
  const base = `/empresa/ofertas/${offeringId}/publicar`;
  const options = [
    { id: "sepolia" as const, href: `${base}?rede=sepolia`, label: t.sepolia },
    { id: "solana" as const, href: `${base}?rede=solana`, label: t.solana },
  ];
  return (
    <div className="border-b border-panel-border bg-military px-4 pt-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-sm font-semibold text-on-military">{t.title}</h2>
        <p className="mt-1 text-xs text-on-military-muted">{t.text}</p>
        <nav aria-label={t.title} className="mt-4 flex gap-2 pb-4">
          {options.map((o) => (
            <Link
              key={o.id}
              href={o.href}
              aria-current={current === o.id ? "page" : undefined}
              className={
                current === o.id
                  ? "rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon"
                  : "rounded-md border border-panel-border px-4 py-2 text-sm text-on-military hover:border-salmon"
              }
            >
              {o.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
