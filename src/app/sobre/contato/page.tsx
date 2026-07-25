import type { Metadata } from "next";
import { ContatoPage } from "@/components/contato/ContatoPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.contato.meta.title} · Niara PMEs`,
  description: ptBr.contato.meta.description,
};

export default function Page() {
  return <ContatoPage />;
}
