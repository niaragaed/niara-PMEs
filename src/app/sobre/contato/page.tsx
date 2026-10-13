import type { Metadata } from "next";
import { ContactPage } from "@/components/contato/ContatoPage";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.contact.meta.title} · Niara PMEs`,
  description: dict.contact.meta.description,
};
}

export default function Page() {
  return <ContactPage />;
}
