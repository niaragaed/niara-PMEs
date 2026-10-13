import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfferingDetailPage } from "@/components/negociar/OfertaDetailPage";
import { SelfServiceOfferingDetailPage } from "@/components/negociar/SelfServiceOfertaDetailPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { getOfferingBySlug } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfferingAssetPaths } from "@/lib/negociar/ofertaAssets";
import { loadConfirmedOnChainOfferingById } from "@/lib/web3/confirmedOfferings";
import { resolvePartner } from "@/lib/auth/resolveSocio";
import { requireLogin, resolveAccount } from "@/lib/auth/resolveInvestor";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const offering = getOfferingBySlug(slug);

  if (offering) {
    return {
      title: `${offering.name} · Niara PMEs`,
      description: offering.company.summary,
    };
  }

  // Ofertas self-service não têm slug legível — o "slug" na URL é o próprio uuid de
  // offerings.id (ver src/lib/web3/confirmedOfferings.ts). Só tenta essa segunda consulta
  // quando a primeira (mock, síncrona) não achou nada.
  const confirmedOffering = await loadConfirmedOnChainOfferingById(slug);
  if (confirmedOffering) {
    return { title: `${confirmedOffering.issuerTradeName ?? confirmedOffering.issuerLegalName} · Niara PMEs` };
  }

  return { title: `${ptBr.trade.offering.notFound.title} · Niara PMEs` };
}

export default async function Page({ params }: PageProps) {
  await requireLogin();

  const { slug } = await params;
  const offering = getOfferingBySlug(slug);

  if (offering) {
    // Fotos reais só existem (por ora) para as 10 ofertas PME ligadas a uma oferta real em
    // Sepolia — ver src/lib/negociar/ofertaAssets.ts. Para as demais categorias nem vale a pena
    // checar o filesystem: nunca vai haver arquivo, OfertaBanner já mostra o placeholder sozinho.
    const assets = offering.category === "pmes" ? getOfferingAssetPaths(offering.slug) : { bannerUrl: null, logoUrl: null };
    const onChainIndex = offering.category === "pmes" ? getOnChainIndexBySlug(offering.slug) : null;
    // Só importa quando onChainIndex !== null (decide o botão "Encerrar oferta" do painel
    // on-chain) — resolver sempre é mais simples que condicionar, e resolveSocio() não redireciona.
    const { autorizado: isPartner } = await resolvePartner();

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

  // Não é uma oferta mock (legada) — tenta resolver como oferta self-service (slug = uuid de
  // offerings.id). loadConfirmedOnChainOfferingById() nunca lança: devolve null pra uuid
  // inválido, oferta inexistente, não confirmada, ou sem categoria.
  const confirmedOffering = await loadConfirmedOnChainOfferingById(slug);
  if (!confirmedOffering || !confirmedOffering.category) {
    notFound();
  }

  const { autorizado: isPartner } = await resolvePartner();
  // isEmissor só é possível pra ofertas self-service (têm issuer_id no Supabase) — as 10 legadas
  // nunca têm conta de emissor neste app, então nem chegam a este ramo.
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
