import type { Metadata } from "next";
import { DocumentacaoPage } from "@/components/documentacao/DocumentacaoPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.documentacao.meta.title} · Niara PMEs`,
  description: ptBr.documentacao.meta.description,
};

export default function Page() {
  return <DocumentacaoPage />;
}
