import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { ShowcaseCard } from "./ShowcaseCard";
import { SmesSectorFilter, type SmesCardData } from "./PmesSectorFilter";
import { RealOfferCard } from "./RealOfferCard";
import { MyOfferCard } from "./MyOfferCard";
import { pt } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfferingsByCategory } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfferingAssetPaths } from "@/lib/negociar/ofertaAssets";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { loadActiveOfferingsByCategory } from "@/lib/investments";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { SectionGlow } from "@/components/ui/SectionGlow";

// Template reutilizado pelas 5 rotas de categoria (/negociar/token-pmes,
// token-agro, token-imobiliario, token-auto, titulos-de-divida) — muda só
// o ícone/acento/conteúdo, via `categoria`.
//
// REGRA DE OURO: visitante anônimo (sem sessão) vê exatamente a tela de
// sempre — só os exemplos fictícios, nenhuma query ao banco. As ofertas
// REAIS desta categoria só são buscadas quando resolveAccount() confirma
// role === "investor"; sem isso, ofertasReais fica [] e a seção nem
// renderiza. Este componente segue sendo público (nenhum redirect) —
// diferente de /investir, que exige login para a rota inteira.
//
// Um issuer logado NÃO entra no ramo acima (role !== "investor"), mas vê a
// PRÓPRIA oferta ativa nesta categoria (ofertasProprias), filtrada no banco
// por issuer_id = accountId (loadActiveOfferingsByCategory) — nunca ofertas
// de outras empresas. As duas listas (ofertasReais/ofertasProprias) nunca
// têm conteúdo ao mesmo tempo, já que role é ou "investor" ou "issuer".
export async function CategoryPage({ category }: { category: TokenCategory }) {
  const t = pt.trade.categories[category];
  const tt = pt.trade.categoryTemplate;
  const offerings = getOfferingsByCategory(category);

  const { role, accountId } = await resolveAccount();
  const realOfferings = role === "investor" ? await loadActiveOfferingsByCategory(category) : [];
  const ownOfferings =
    role === "issuer" && accountId ? await loadActiveOfferingsByCategory(category, accountId) : [];

  // Botão "Publicar oferta" (só na categoria pmes, ver JSX abaixo) — visível só para o emissor
  // logado (nunca investidor/visitante). Leva sempre para /empresa/ofertas ("Minhas ofertas") —
  // simplificado de propósito: a lista de lá já mostra o estado de cada oferta e o link certo por
  // oferta (ver OfertasPage.tsx), então não vale a pena este botão tentar adivinhar/pular direto
  // para uma oferta específica.
  const publishOfferingHref = role === "issuer" && accountId ? "/empresa/ofertas" : null;

  // getOnChainIndexBySlug/getOfertaAssetPaths precisam rodar aqui (server —
  // o último é fs-based) mesmo com o filtro de setor sendo client-side
  // (PmesSectorFilter.tsx): resolve tudo antes e passa a lista já pronta.
  const smesCardsLegacy: SmesCardData[] =
    category === "pmes"
      ? offerings.flatMap((offering) => {
          const onChainIndex = getOnChainIndexBySlug(offering.slug);
          if (onChainIndex === null) return [];
          const assets = getOfferingAssetPaths(offering.slug);
          return [{ origin: "legado" as const, offering, bannerUrl: assets.bannerUrl, logoUrl: assets.logoUrl }];
        })
      : [];

  // Ofertas PME self-service (emissor publicou a própria oferta on-chain — ver CLAUDE.md "Fase
  // 4", unificação da vitrine). loadConfirmedOnChainOfferings() não filtra por categoria (é
  // reaproveitado por /investir/onchain, que lista todas) — o filtro é feito aqui, só quando esta
  // página é a de PMEs.
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
        <span className="font-semibold text-salmon">{pt.trade.demoBanner.label}</span> —{" "}
        {pt.trade.demoBanner.text}
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
              {pt.assets.categories[category]}
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
