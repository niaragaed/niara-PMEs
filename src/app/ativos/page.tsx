import type { Metadata } from "next";
import { AtivosPage } from "@/components/ativos/AtivosPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${ptBr.ativos.meta.title} · Niara PMEs`,
  description: ptBr.ativos.meta.description,
};

export default async function Page() {
  await requireLogin();
  return <AtivosPage />;
}
