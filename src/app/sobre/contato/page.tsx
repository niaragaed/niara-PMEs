import type { Metadata } from "next";
import { ContactPage } from "@/components/contato/ContatoPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.contact.meta.title} · Niara PMEs`,
  description: ptBr.contact.meta.description,
};

export default function Page() {
  return <ContactPage />;
}
