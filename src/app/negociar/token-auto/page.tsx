import type { Metadata } from "next";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { requireLogin } from "@/lib/auth/resolveInvestor";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.assets.categories.auto} · Niara PMEs`,
  description: dict.trade.categories.auto.shortDescription,
};
}

export default async function Page() {
  await requireLogin();
  return <CategoryPage category="auto" />;
}
