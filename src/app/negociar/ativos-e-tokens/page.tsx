import type { Metadata } from "next";
import { HubPage } from "@/components/negociar/HubPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.negociar.hub.meta.title} · Niara PMEs`,
  description: ptBr.negociar.hub.meta.description,
};

export default function Page() {
  return <HubPage />;
}
