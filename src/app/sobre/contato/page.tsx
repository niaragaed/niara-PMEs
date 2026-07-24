import type { Metadata } from "next";
import { StubPage } from "@/components/ui/StubPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = { title: `${ptBr.stubs.contato.title} · Niara PMEs` };

export default function Page() {
  return <StubPage {...ptBr.stubs.contato} />;
}
