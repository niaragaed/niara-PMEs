import type { Metadata } from "next";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.ativos.categorias.pmes} · Niara PMEs`,
  description: ptBr.negociar.categorias.pmes.descricaoCurta,
};

export default function Page() {
  return <CategoryPage categoria="pmes" />;
}
