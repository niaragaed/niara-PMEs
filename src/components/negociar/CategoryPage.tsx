import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { ShowcaseCard } from "./ShowcaseCard";
import { SmesSectorFilter, type SmesCardData } from "./PmesSectorFilter";
import { RealOfferCard } from "./RealOfferCard";
import { MyOfferCard } from "./MyOfferCard";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfferingsByCategory } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfferingAssetPaths } from "@/lib/negociar/ofertaAssets";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { loadActiveOfferingsByCategory } from "@/lib/investments";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { getDictionary } from "@/lib/i18n/server";

// Template reused by the 5 category routes (/negociar/token-pmes,
// token-agro, token-imobiliario, token-auto, titulos-de-divida) — only
// the icon/accent/content changes, via `category`.
//
// GOLDEN RULE: an anonymous visitor (no session) sees exactly the usual
// screen — only the fictitious examples, no database query. The REAL
// offerings of this category are only fetched when resolveAccount() confirms
// role === "investor"; without that, realOfferings stays [] and the section isn't even
// rendered. This component remains public (no redirect) —
// unlike /investir, which requires signing in for the whole route.
//
// A signed-in issuer does NOT enter the branch above (role !== "investor"), but sees their
// OWN active offering in this category (ownOfferings), filtered in the database
// by issuer_id = accountId (loadActiveOfferingsByCategory) — never other
// companies' offerings. The two lists (realOfferings/ownOfferings) never
// have content at the same time, since role is either "investor" or "issuer".
export async function CategoryPage({ category }: { category: TokenCategory }) {
  const dict = await getDictionary();
  const t = dict.trade.categories[category];
  const tt = dict.trade.categoryTemplate;
  const offerings = getOfferingsByCategory(category);

  const { role, accountId } = await resolveAccount();
  const realOfferings = role === "investor" ? await loadActiveOfferingsByCategory(category) : [];
  const ownOfferings =
    role === "issuer" && accountId ? await loadActiveOfferingsByCategory(category, accountId) : [];

  // "Publish offering" button (only in the pmes category, see the JSX below) — visible only to the
  // signed-in issuer (never an investor/visitor). Always leads to /empresa/ofertas ("My
  // offerings") — simplified on purpose: the list there already shows each offering's state and
  // the right link per offering (see OfertasPage.tsx), so it's not worth this button trying to
  // guess/jump straight to a specific offering.
  const publishOfferingHref = role === "issuer" && accountId ? "/empresa/ofertas" : null;

  // getOnChainIndexBySlug/getOfferingAssetPaths need to run here (server —
  // the latter is fs-based) even though the sector filter is client-side
  // (PmesSectorFilter.tsx): everything is resolved first and the list is passed ready.
  const smesCardsLegacy: SmesCardData[] =
    category === "pmes"
      ? offerings.flatMap((offering) => {
          const onChainIndex = getOnChainIndexBySlug(offering.slug);
          if (onChainIndex === null) return [];
          const assets = getOfferingAssetPaths(offering.slug);
          return [{ origin: "legado" as const, offering, bannerUrl: assets.bannerUrl, logoUrl: assets.logoUrl }];
        })
      : [];

  // Self-service SME offerings (an issuer published their own offering on-chain — see CLAUDE.md
  // "Phase 4", showcase unification). loadConfirmedOnChainOfferings() doesn't filter by category
  // (it's reused by /investir/onchain, which lists all of them) — the filter is applied here, only
  // when this page is the SMEs one.
  const smesCardsSelfService: SmesCardData[] =
    category === "pmes"
      ? (await loadConfirmedOnChainOfferings())
          .filter((offering) => offering.category === "pmes")
          .map((offering) => ({
            origin: "selfService" as const,
            id: offering.id,
            name: offering.issuerTradeName ?? offering.issuerLegalName,
            sector: offering.issuerSector,
            bannerUrl: offering.bannerUrl,
            logoUrl: offering.logoUrl,
            hardCapCents: offering.hardCapCents,
            sharePriceCents: offering.sharePriceCents,
            sharesCount: offering.sharesCount,
            rede: offering.rede,
          }))
      : [];

  const smesCards: SmesCardData[] = [...smesCardsLegacy, ...smesCardsSelfService];

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.trade.demoBanner.label}</span> —{" "}
        {dict.trade.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/negociar/ativos-e-tokens"
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {tt.back}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <CategoryChip category={category} size="lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-military">
              {dict.assets.categories[category]}
            </h1>
            <p className="mt-1 max-w-2xl text-on-military-muted">{t.shortDescription}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-surface p-6 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tt.factSheetTitle}</h2>
          <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-muted">{tt.backing}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{t.backing}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.audience}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.audienceValue}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.framework}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.frameworkValue}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.stage}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.stageValue}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{tt.useCasesTitle}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {t.useCases.map((useCase) => (
              <li key={useCase} className="rounded-lg bg-surface p-4 text-sm text-ink shadow-soft">
                {useCase}
              </li>
            ))}
          </ul>
        </div>

        {realOfferings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-on-military">{tt.realOfferingsTitle}</h2>
            <p className="mt-1 text-xs text-on-military-muted">{tt.realOfferingsNote}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {realOfferings.map((offering) => (
                <RealOfferCard key={offering.id} offering={offering} />
              ))}
            </div>
          </div>
        )}

        {ownOfferings.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-on-military">{tt.yourOfferingTitle}</h2>
            <p className="mt-1 text-xs text-on-military-muted">{tt.yourOfferingNote}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ownOfferings.map((offering) => (
                <MyOfferCard key={offering.id} offering={offering} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-on-military">
              {category === "pmes" ? tt.showcaseTitleSmesOnChain : tt.showcaseTitle}
            </h2>
            {category === "pmes" && publishOfferingHref && (
              <Link
                href={publishOfferingHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon hover:bg-salmon-600"
              >
                {tt.publishOfferingButton}
              </Link>
            )}
          </div>
          {category === "pmes" ? (
            <SmesSectorFilter items={smesCards} />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((offering) => (
                <ShowcaseCard key={offering.slug} offering={offering} />
              ))}
            </div>
          )}
        </div>

        <p className="mt-10 text-xs text-on-military-muted">{tt.footnote}</p>
      </div>
    </main>
  );
}
