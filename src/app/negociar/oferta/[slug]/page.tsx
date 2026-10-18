import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OfferingDetailPage } from "@/components/negociar/OfferingDetailPage";
import { SelfServiceOfferingDetailPage } from "@/components/negociar/SelfServiceOfferingDetailPage";
import { SolanaOfferingDetailPage } from "@/components/negociar/SolanaOfferingDetailPage";
import { getOfferingBySlug } from "@/lib/mock/offerings";
import { getOnChainIndexBySlug } from "@/lib/mock/onChainOfferings";
import { getOfferingAssetPaths } from "@/lib/trade/offeringAssets";
import { loadConfirmedOnChainOfferingById, loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { BASE58_PUBKEY } from "@/lib/solana/config";
import { readVerifiedOfferingAccount } from "@/lib/solana/server";
import { resolvePartner } from "@/lib/auth/resolvePartner";
import { requireLogin, resolveAccount } from "@/lib/auth/resolveInvestor";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localize } from "@/lib/i18n/locale";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * An offering that exists only in the niara-pmes-solana program: the "slug" is the offering
 * account's (base58) address. Base58 has no "-", so it never collides with a mock slug or a uuid.
 * The account is read from the network and only counts if its owner is the program
 * (readVerifiedOfferingAccount). Never throws: an RPC outage = not found.
 */
async function solanaProgramOffering(slug: string) {
  if (!BASE58_PUBKEY.test(slug)) return null;
  try {
    return await readVerifiedOfferingAccount(slug);
  } catch (error) {
    console.error("negociar/oferta: failed to read the offering on Solana", error);
    return null;
  }
}

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

  const solanaOffering = await solanaProgramOffering(slug);
  if (solanaOffering) {
    return { title: `${solanaOffering.company} · Niara PMEs` };
  }

  return { title: `${dict.trade.offering.notFound.title} · Niara PMEs` };
}

export default async function Page({ params }: PageProps) {
  await requireLogin();

  const { slug } = await params;
  const offering = getOfferingBySlug(slug);

  if (offering) {
    // Real photos only exist (for now) for the 10 SME offerings linked to a real offering on
    // Sepolia — see src/lib/trade/offeringAssets.ts. For the other categories it's not even worth
    // checking the filesystem: there will never be a file, OfferingBanner already shows the
    // placeholder on its own.
    const assets = offering.category === "pmes" ? getOfferingAssetPaths(offering.slug) : { bannerUrl: null, logoUrl: null };
    const onChainIndex = offering.category === "pmes" ? getOnChainIndexBySlug(offering.slug) : null;
    // Only matters when onChainIndex !== null (decides the on-chain panel's "Close offering"
    // button) — always resolving is simpler than branching, and resolvePartner() doesn't redirect.
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

  // Not a mock (legacy) offering. A base58 address = an offering of the Solana program.
  if (BASE58_PUBKEY.test(slug)) {
    // Published by the issuer on the site: the right page is the self-service one (with the
    // company's data).
    const selfService = (await loadConfirmedOnChainOfferings()).find(
      (o) => o.rede === "solana-devnet" && o.contractAddress === slug,
    );
    if (selfService) redirect(`/negociar/oferta/${selfService.id}`);

    const solanaOffering = await solanaProgramOffering(slug);
    if (!solanaOffering) notFound();
    const { authorized: isPartner } = await resolvePartner();
    return <SolanaOfferingDetailPage address={solanaOffering.address} company={solanaOffering.company} isPartner={isPartner} />;
  }

  // Otherwise, a self-service offering (slug = the offerings.id uuid).
  // loadConfirmedOnChainOfferingById() never throws: it returns null for an invalid uuid, a
  // nonexistent offering, an unconfirmed one, or one without a category.
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
