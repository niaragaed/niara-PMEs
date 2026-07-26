import type { Metadata } from "next";
import { EntrarPage } from "@/components/entrar/EntrarPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.entrar.meta.title} · Niara PMEs`,
};

type PageProps = {
  searchParams: Promise<{ intent?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { intent } = await searchParams;
  return <EntrarPage isCaptacaoIntent={intent === "captacao"} />;
}
