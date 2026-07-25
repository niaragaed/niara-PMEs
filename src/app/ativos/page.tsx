import type { Metadata } from "next";
import { AtivosPage } from "@/components/ativos/AtivosPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.ativos.meta.title} · Niara PMEs`,
  description: ptBr.ativos.meta.description,
};

export default function Page() {
  return <AtivosPage />;
}
