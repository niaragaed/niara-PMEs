import type { Metadata } from "next";
import { SignInPage } from "@/components/entrar/EntrarPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.signIn.meta.title} · Niara PMEs`,
};

type PageProps = {
  searchParams: Promise<{ intent?: string; aviso?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { intent, aviso: notice } = await searchParams;
  return (
    <SignInPage isFundraisingIntent={intent === "captacao"} loginRequiredNotice={notice === "login-necessario"} />
  );
}
