import { CategoryCard } from "./CategoryCard";
import { SmesOnChainCard } from "./PmesOnChainCard";
import { ShowcaseCard } from "./ShowcaseCard";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfferingBySlug, SHOWCASE_HUB_SLUGS, type Offering } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfferingAssetPaths } from "@/lib/negociar/ofertaAssets";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { getDictionary } from "@/lib/i18n/server";

const CATEGORIES: TokenCategory[] = ["pmes", "agro", "imobiliario", "auto", "divida"];

export async function HubPage() {
  const dict = await getDictionary();
  const showcase = SHOWCASE_HUB_SLUGS.map(getOfferingBySlug).filter((offering): offering is Offering => offering !== undefined);

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.trade.demoBanner.label}</span> —{" "}
        {dict.trade.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{dict.trade.hub.title}</h1>
        <p className="mt-1 max-w-2xl text-on-military-muted">{dict.trade.hub.subtitle}</p>

        <h2 className="sr-only">{dict.trade.hub.categoriesHeading}</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category} category={category} />
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-semibold text-on-military">{dict.trade.showcase.title}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.map((offering) => {
              const onChainIndex = getOnChainIndexBySlug(offering.slug);
              if (onChainIndex === null) {
                return <ShowcaseCard key={offering.slug} offering={offering} />;
              }
              const assets = getOfferingAssetPaths(offering.slug);
              return (
                <SmesOnChainCard key={offering.slug} offering={offering} bannerUrl={assets.bannerUrl} logoUrl={assets.logoUrl} />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
