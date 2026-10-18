import Link from "next/link";
import { BadgeCheck, Building2 } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { ActiveOfferingSummary } from "@/lib/investments";
import { getDictionary } from "@/lib/i18n/server";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Card for a REAL offering (offerings.status = 'active'), shown to a
// signed-in investor browsing other companies' active offerings in this
// category (CategoryPage.tsx, "realOfferings" section). Visually distinct
// from the fictitious ShowcaseCard on purpose: a solid badge + a salmon ring around
// the card, so nobody confuses the two on the same screen (HONESTY
// RULE). The signed-in issuer's own offering uses a separate card
// (MyOfferCard.tsx), with a neutral demo badge — never this one.
export async function RealOfferCard({ offering }: { offering: ActiveOfferingSummary }) {
  const dict = await getDictionary();
  const t = dict.trade.realOffering;
  const name = offering.issuerTradeName ?? offering.issuerLegalName;

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-soft ring-2 ring-salmon">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {t.badge}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-alt">
          {offering.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- comes from the public Supabase Storage bucket, doesn't go through the next/image optimizer
            <img src={offering.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">{name}</h3>
          {offering.sector && <p className="text-xs text-ink-muted">{offering.sector}</p>}
        </div>
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="text-xs text-ink-muted">{t.fundraisingTarget}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{formatBRL(offering.baseCapCents / 100)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.valuePerShare}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {offering.sharePriceCents !== null ? formatBRL(offering.sharePriceCents / 100) : t.notProvided}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.shareCount}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{offering.sharesCount ?? t.notProvided}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.deadline}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {formatDate(offering.opensAt)} – {formatDate(offering.closesAt)}
          </dd>
        </div>
      </dl>

      <Link
        href={`/investir/${offering.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
      >
        {t.viewOffering}
      </Link>
    </div>
  );
}
