import type { Metadata } from "next";
import { EntrarPage } from "@/components/entrar/EntrarPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.entrar.meta.title} · Niara PMEs`,
};

type PageProps = {
  searchParams: Promise<{ intent?: string; aviso?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { intent, aviso } = await searchParams;
  return (
    <EntrarPage isCaptacaoIntent={intent === "captacao"} avisoLoginNecessario={aviso === "login-necessario"} />
  );
}
