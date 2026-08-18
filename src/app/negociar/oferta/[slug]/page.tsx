import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfertaDetailPage } from "@/components/negociar/OfertaDetailPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { getOfertaBySlug } from "@/lib/mock/ofertas";
import { getOfertaAssetPaths } from "@/lib/negociar/ofertaAssets";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const oferta = getOfertaBySlug(slug);

  if (!oferta) {
    return { title: `${ptBr.negociar.oferta.naoEncontrada.title} · Niara PMEs` };
  }

  return {
    title: `${oferta.nome} · Niara PMEs`,
    description: oferta.empresa.resumo,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const oferta = getOfertaBySlug(slug);

  if (!oferta) {
    notFound();
  }

  // Fotos reais só existem (por ora) para as 10 ofertas PME ligadas a uma oferta real em
  // Sepolia — ver src/lib/negociar/ofertaAssets.ts. Para as demais categorias nem vale a pena
  // checar o filesystem: nunca vai haver arquivo, OfertaBanner já mostra o placeholder sozinho.
  const assets = oferta.categoria === "pmes" ? getOfertaAssetPaths(oferta.slug) : { bannerUrl: null, logoUrl: null };

  return <OfertaDetailPage oferta={oferta} bannerUrl={assets.bannerUrl} logoUrl={assets.logoUrl} />;
}
