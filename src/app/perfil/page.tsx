import type { Metadata } from "next";
import { PerfilPage } from "@/components/perfil/PerfilPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.perfil.meta.title} · Niara PMEs`,
  description: ptBr.perfil.meta.description,
};

export default function Page() {
  return <PerfilPage />;
}
