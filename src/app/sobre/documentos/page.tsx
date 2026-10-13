import type { Metadata } from "next";
import { DocsPage } from "@/components/documentacao/DocumentacaoPage";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.docs.meta.title} · Niara PMEs`,
  description: dict.docs.meta.description,
};
}

export default function Page() {
  return <DocsPage />;
}
