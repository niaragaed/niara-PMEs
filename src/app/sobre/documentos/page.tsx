import type { Metadata } from "next";
import { DocsPage } from "@/components/documentacao/DocumentacaoPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.docs.meta.title} · Niara PMEs`,
  description: ptBr.docs.meta.description,
};

export default function Page() {
  return <DocsPage />;
}
