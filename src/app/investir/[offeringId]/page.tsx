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

  // Mesmo gate de /investir para investidor. Exceção deliberada: o issuer
  // DONO desta oferta específica (offerings.issuer_id === accountId) também
  // pode ver a página — sem botão de reserva (ver OfferingDetailPage). Uma
  // empresa que não é dona desta oferta continua redirecionada, mesmo
  // padrão de /investir — isOfferingOwner só confirma "é dele?", nunca lista
  // ofertas de outras empresas.
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
