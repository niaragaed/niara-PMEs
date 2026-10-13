import type { Metadata } from "next";
import { HubPage } from "@/components/negociar/HubPage";
import { pt } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${pt.trade.hub.meta.title} · Niara PMEs`,
  description: pt.trade.hub.meta.description,
};

export default async function Page() {
  await requireLogin();
  return <HubPage />;
}
