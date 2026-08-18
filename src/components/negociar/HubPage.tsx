import { CategoryCard } from "./CategoryCard";
import { PmesOnChainCard } from "./PmesOnChainCard";
import { ShowcaseCard } from "./ShowcaseCard";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfertaBySlug, VITRINE_HUB_SLUGS, type Oferta } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfertaAssetPaths } from "@/lib/negociar/ofertaAssets";

const CATEGORIES: TokenCategory[] = ["pmes", "agro", "imobiliario", "auto", "divida"];

export function HubPage() {
  const vitrine = VITRINE_HUB_SLUGS.map(getOfertaBySlug).filter((oferta): oferta is Oferta => oferta !== undefined);

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.negociar.demoBanner.label}</span> —{" "}
        {ptBr.negociar.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{ptBr.negociar.hub.title}</h1>
        <p className="mt-1 max-w-2xl text-on-military-muted">{ptBr.negociar.hub.subtitle}</p>

        <h2 className="sr-only">{ptBr.negociar.hub.categoriasHeading}</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((categoria) => (
            <CategoryCard key={categoria} categoria={categoria} />
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-semibold text-on-military">{ptBr.negociar.vitrine.title}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vitrine.map((oferta) => {
              const onChainIndex = getOnChainIndexBySlug(oferta.slug);
              if (onChainIndex === null) {
                return <ShowcaseCard key={oferta.slug} oferta={oferta} />;
              }
              const assets = getOfertaAssetPaths(oferta.slug);
              return (
                <PmesOnChainCard key={oferta.slug} oferta={oferta} bannerUrl={assets.bannerUrl} logoUrl={assets.logoUrl} />
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
