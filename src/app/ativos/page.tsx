import type { Metadata } from "next";
import { AssetsPage } from "@/components/ativos/AtivosPage";
import { pt } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${pt.assets.meta.title} · Niara PMEs`,
  description: pt.assets.meta.description,
};

export default async function Page() {
  await requireLogin();
  return <AssetsPage />;
}
