import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfilePage } from "@/components/perfil/PerfilPage";
import { loadMyOfferingsSummary, loadProfile } from "./actions";
import { requireLogin, resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.profile.meta.title} · Niara PMEs`,
  description: ptBr.profile.meta.description,
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ aviso?: "apenas-empresa" | "apenas-investidor"; onboarding?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { aviso: notice, onboarding } = await searchParams;

  await requireLogin();

  const { role } = await resolveAccount();
  if (!role) {
    redirect("/cadastro");
  }

  const profile = await loadProfile();
  const offerings = role === "issuer" ? await loadMyOfferingsSummary() : [];

  return (
    <ProfilePage profile={profile} offerings={offerings} aviso={notice} openInvestorQuiz={onboarding === "1"} />
  );
}
