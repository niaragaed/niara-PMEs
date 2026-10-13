import type { Metadata } from "next";
import { AssetsPage } from "@/components/ativos/AtivosPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${ptBr.assets.meta.title} · Niara PMEs`,
  description: ptBr.assets.meta.description,
};

export default async function Page() {
  await requireLogin();
  return <AssetsPage />;
}
