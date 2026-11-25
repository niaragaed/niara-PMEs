import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/site";
import { AssetsPage } from "@/components/ativos/AssetsPage";
import { requireLogin } from "@/lib/auth/resolveInvestor";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...canonicalMetadata("/ativos"),
  title: `${dict.assets.meta.title} · Niara PMEs`,
  description: dict.assets.meta.description,
};
}

export default async function Page() {
  await requireLogin();
  return <AssetsPage />;
}
