import type { Metadata } from "next";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { pt } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${pt.assets.categories.imobiliario} · Niara PMEs`,
  description: pt.trade.categories.imobiliario.shortDescription,
};

export default async function Page() {
  await requireLogin();
  return <CategoryPage category="imobiliario" />;
}
