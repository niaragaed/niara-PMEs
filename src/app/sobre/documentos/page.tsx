import type { Metadata } from "next";
import { DocsPage } from "@/components/documentacao/DocumentacaoPage";
import { pt } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${pt.docs.meta.title} · Niara PMEs`,
  description: pt.docs.meta.description,
};

export default function Page() {
  return <DocsPage />;
}
