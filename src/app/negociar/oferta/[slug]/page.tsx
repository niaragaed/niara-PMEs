import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OfertaDetailPage } from "@/components/negociar/OfertaDetailPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { getOfertaBySlug } from "@/lib/mock/ofertas";

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

  return <OfertaDetailPage oferta={oferta} />;
}
