import type { Metadata } from "next";
import { ContactPage } from "@/components/contato/ContatoPage";
import { pt } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${pt.contact.meta.title} · Niara PMEs`,
  description: pt.contact.meta.description,
};

export default function Page() {
  return <ContactPage />;
}
