import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/site";
import { DocsPage } from "@/components/documentacao/DocsPage";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...canonicalMetadata("/sobre/documentos"),
  title: `${dict.docs.meta.title} · Niara PMEs`,
  description: dict.docs.meta.description,
};
}

export default function Page() {
  return <DocsPage />;
}
