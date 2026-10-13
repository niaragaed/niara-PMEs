import type { Metadata } from "next";
import { SignInPage } from "@/components/entrar/SignInPage";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.signIn.meta.title} · Niara PMEs`,
};
}

type PageProps = {
  searchParams: Promise<{ intent?: string; aviso?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { intent, aviso: notice } = await searchParams;
  return (
    <SignInPage isFundraisingIntent={intent === "captacao"} loginRequiredNotice={notice === "login-necessario"} />
  );
}
