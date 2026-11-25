import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/site";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { requireLogin } from "@/lib/auth/resolveInvestor";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...canonicalMetadata("/negociar/token-imobiliario"),
  title: `${dict.assets.categories.imobiliario} · Niara PMEs`,
  description: dict.trade.categories.imobiliario.shortDescription,
};
}

export default async function Page() {
  await requireLogin();
  return <CategoryPage category="imobiliario" />;
}
