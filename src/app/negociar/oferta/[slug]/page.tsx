import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferingDetailPage } from "@/components/negociar/OfertaDetailPage";
import { SelfServiceOfferingDetailPage } from "@/components/negociar/SelfServiceOfertaDetailPage";
import { getOfferingBySlug } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfferingAssetPaths } from "@/lib/negociar/ofertaAssets";
import { loadConfirmedOnChainOfferingById } from "@/lib/web3/confirmedOfferings";
import { resolvePartner } from "@/lib/auth/resolveSocio";
import { requireLogin, resolveAccount } from "@/lib/auth/resolveInvestor";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localize } from "@/lib/i18n/locale";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dict = await getDictionary();
  const locale = await getLocale();
  const { slug } = await params;
  const offering = getOfferingBySlug(slug);

  if (offering) {
    return {
      title: `${localize(offering.name, locale)} · Niara PMEs`,
      description: localize(offering.company.summary, locale),
    };
  }

  // Self-service offerings have no readable slug — the "slug" in the URL is the
  // offerings.id uuid itself (see src/lib/web3/confirmedOfferings.ts). Only tries this second
  // query when the first one (mock, synchronous) found nothing.
  const confirmedOffering = await loadConfirmedOnChainOfferingById(slug);
  if (confirmedOffering) {
    return { title: `${confirmedOffering.issuerTradeName ?? confirmedOffering.issuerLegalName} · Niara PMEs` };
  }

  return { title: `${dict.trade.offering.notFound.title} · Niara PMEs` };
}

export default async function Page({ params }: PageProps) {
  await requireLogin();

  const { slug } = await params;
  const offering = getOfferingBySlug(slug);

  if (offering) {
    // Real photos only exist (for now) for the 10 SME offerings linked to a real offering on
    // Sepolia — see src/lib/negociar/ofertaAssets.ts. For the other categories it's not even worth
    // checking the filesystem: there will never be a file, OfferingBanner already shows the
    // placeholder on its own.
    const assets = offering.category === "pmes" ? getOfferingAssetPaths(offering.slug) : { bannerUrl: null, logoUrl: null };
    const onChainIndex = offering.category === "pmes" ? getOnChainIndexBySlug(offering.slug) : null;
    // Only matters when onChainIndex !== null (decides the on-chain panel's "Close offering"
    // button) — always resolving is simpler than branching, and resolveSocio() doesn't redirect.
    const { authorized: isPartner } = await resolvePartner();

    return (
      <OfferingDetailPage
        offering={offering}
        bannerUrl={assets.bannerUrl}
        logoUrl={assets.logoUrl}
        onChainIndex={onChainIndex}
        isPartner={isPartner}
      />
    );
  }

  // Not a mock (legacy) offering — tries to resolve it as a self-service offering (slug = the
  // offerings.id uuid). loadConfirmedOnChainOfferingById() never throws: it returns null for an
  // invalid uuid, a nonexistent offering, an unconfirmed one, or one without a category.
  const confirmedOffering = await loadConfirmedOnChainOfferingById(slug);
  if (!confirmedOffering || !confirmedOffering.category) {
    notFound();
  }

  const { authorized: isPartner } = await resolvePartner();
  // isIssuer is only possible for self-service offerings (they have issuer_id in Supabase) — the 10
  // legacy ones never have an issuer account in this app, so they don't even reach this branch.
  const { role, accountId } = await resolveAccount();
  const isIssuer = role === "issuer" && accountId === confirmedOffering.issuerAccountId;

  return (
    <SelfServiceOfferingDetailPage
      offering={{ ...confirmedOffering, category: confirmedOffering.category }}
      isPartner={isPartner}
      isIssuer={isIssuer}
    />
  );
}
