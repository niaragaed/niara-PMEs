import type { Metadata } from "next";
import { AssetsPage } from "@/components/ativos/AtivosPage";
import { requireLogin } from "@/lib/auth/resolveInvestor";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.assets.meta.title} · Niara PMEs`,
  description: dict.assets.meta.description,
};
}

export default async function Page() {
  await requireLogin();
  return <AssetsPage />;
}
