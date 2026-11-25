import type { Metadata } from "next";
import { canonicalMetadata } from "@/lib/site";
import { ContactPage } from "@/components/contato/ContactPage";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    ...canonicalMetadata("/sobre/contato"),
  title: `${dict.contact.meta.title} · Niara PMEs`,
  description: dict.contact.meta.description,
};
}

export default function Page() {
  return <ContactPage />;
}
