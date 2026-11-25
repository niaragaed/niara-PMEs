import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/site";
import { HubPage } from "@/components/negociar/HubPage";
import { requireLogin } from "@/lib/auth/resolveInvestor";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...canonicalMetadata("/negociar/ativos-e-tokens"),
  title: `${dict.trade.hub.meta.title} · Niara PMEs`,
  description: dict.trade.hub.meta.description,
};
}

export default async function Page() {
  await requireLogin();
  return <HubPage />;
}
