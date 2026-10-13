import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { loadPublicOffering } from "@/app/investir/actions";
import { OfferingDetailPage } from "@/components/investir/OfferingDetailPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { isOfferingOwner } from "@/lib/investments";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ offeringId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dict = await getDictionary();
  const { offeringId } = await params;
  const offering = await loadPublicOffering(offeringId);

  if (!offering) {
    return {
      title: `${dict.invest.detail.notFound.title} · Niara PMEs`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${offering.issuer.legalName} · Niara PMEs`,
    description: offering.issuer.businessSummary ?? dict.invest.meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: PageProps) {
  const { offeringId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  // Same investor gate as /investir. Deliberate exception: the issuer that
  // OWNS this specific offering (offerings.issuer_id === accountId) can also
  // see the page — without the reserve button (see OfferingDetailPage). A
  // company that doesn't own this offering is still redirected, same
  // pattern as /investir — isOfferingOwner only confirms "is it theirs?", it
  // never lists other companies' offerings.
  const { role, accountId } = await resolveAccount();
  const isOwner = role === "issuer" && accountId !== null && (await isOfferingOwner(offeringId, accountId));

  if (role !== "investor" && !isOwner) {
    redirect("/conta?aviso=apenas-investidor");
  }

  const offering = await loadPublicOffering(offeringId);
  if (!offering) {
    notFound();
  }

  return <OfferingDetailPage offering={offering} isOwner={isOwner} />;
}
