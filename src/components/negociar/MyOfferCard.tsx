import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { OfferingBanner } from "./OfferingBanner";
import { formatBRL } from "@/lib/format";
import type { ActiveOfferingSummary } from "@/lib/investments";
import { getDictionary } from "@/lib/i18n/server";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Card for the signed-in issuer's OWN active offering, in the matching category
// (CategoryPage.tsx, "ownOfferings" section — visible only to the owner,
// never to other investors). The same visual layout as SmesOnChainCard.tsx
// (banner + overlapping round logo, via OfferingBanner) so the owner
// recognizes how their own offering would look next to the 10 real SMEs on
// Sepolia — but with a deliberately NEUTRAL badge (never the salmon ring +
// BadgeCheck of real/on-chain offerings): this is a real offering in the database
// (it actually writes, accepts reservations from other investors in /investir),
// but with no relation to blockchain. The badge exists so the owner
// never mistakes this preview for "Real — Sepolia" (HONESTY
// RULE, here in the sense of not letting two different real concepts
// look like the same kind of "real").
export async function MyOfferCard({ offering }: { offering: ActiveOfferingSummary }) {
  const dict = await getDictionary();
  const t = dict.trade.myOfferingCard;
  const name = offering.issuerTradeName ?? offering.issuerLegalName;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
      <OfferingBanner
        bannerUrl={offering.bannerUrl}
        logoUrl={offering.logoUrl}
        tradeName={name}
        category={offering.category}
        size="card"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{name}</h3>
          {offering.sector && <p className="text-xs text-ink-muted">{offering.sector}</p>}
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
    </div>
  );
}
