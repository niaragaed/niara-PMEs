import type { Metadata } from "next";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${ptBr.assets.categories.divida} · Niara PMEs`,
  description: ptBr.trade.categories.divida.shortDescription,
};

export default async function Page() {
  await requireLogin();
  return <CategoryPage category="divida" />;
}
