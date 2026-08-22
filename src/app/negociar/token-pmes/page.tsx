import type { Metadata } from "next";
import { CategoryPage } from "@/components/negociar/CategoryPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { requireLogin } from "@/lib/auth/resolveInvestor";

export const metadata: Metadata = {
  title: `${ptBr.ativos.categorias.pmes} · Niara PMEs`,
  description: ptBr.negociar.categorias.pmes.descricaoCurta,
};

export default async function Page() {
  await requireLogin();
  return <CategoryPage categoria="pmes" />;
}
