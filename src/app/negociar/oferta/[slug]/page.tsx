import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfertaDetailPage } from "@/components/negociar/OfertaDetailPage";
import { SelfServiceOfertaDetailPage } from "@/components/negociar/SelfServiceOfertaDetailPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { getOfertaBySlug } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfertaAssetPaths } from "@/lib/negociar/ofertaAssets";
import { loadConfirmedOnChainOfferingById } from "@/lib/web3/confirmedOfferings";
import { resolveSocio } from "@/lib/auth/resolveSocio";
import { requireLogin } from "@/lib/auth/resolveInvestor";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const oferta = getOfertaBySlug(slug);

  if (oferta) {
    return {
      title: `${oferta.nome} · Niara PMEs`,
      description: oferta.empresa.resumo,
    };
  }

  // Ofertas self-service não têm slug legível — o "slug" na URL é o próprio uuid de
  // offerings.id (ver src/lib/web3/confirmedOfferings.ts). Só tenta essa segunda consulta
  // quando a primeira (mock, síncrona) não achou nada.
  const confirmedOffering = await loadConfirmedOnChainOfferingById(slug);
  if (confirmedOffering) {
    return { title: `${confirmedOffering.issuerTradeName ?? confirmedOffering.issuerLegalName} · Niara PMEs` };
  }

  return { title: `${ptBr.negociar.oferta.naoEncontrada.title} · Niara PMEs` };
}

export default async function Page({ params }: PageProps) {
  await requireLogin();

  const { slug } = await params;
  const oferta = getOfertaBySlug(slug);

  if (oferta) {
    // Fotos reais só existem (por ora) para as 10 ofertas PME ligadas a uma oferta real em
    // Sepolia — ver src/lib/negociar/ofertaAssets.ts. Para as demais categorias nem vale a pena
    // checar o filesystem: nunca vai haver arquivo, OfertaBanner já mostra o placeholder sozinho.
    const assets = oferta.categoria === "pmes" ? getOfertaAssetPaths(oferta.slug) : { bannerUrl: null, logoUrl: null };
    const onChainIndex = oferta.categoria === "pmes" ? getOnChainIndexBySlug(oferta.slug) : null;
    // Só importa quando onChainIndex !== null (decide o botão "Encerrar oferta" do painel
    // on-chain) — resolver sempre é mais simples que condicionar, e resolveSocio() não redireciona.
    const { autorizado: isSocio } = await resolveSocio();

    return (
      <OfertaDetailPage
        oferta={oferta}
        bannerUrl={assets.bannerUrl}
        logoUrl={assets.logoUrl}
        onChainIndex={onChainIndex}
        isSocio={isSocio}
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

  const { autorizado: isSocio } = await resolveSocio();

  return (
    <SelfServiceOfertaDetailPage oferta={{ ...confirmedOffering, category: confirmedOffering.category }} isSocio={isSocio} />
  );
}
