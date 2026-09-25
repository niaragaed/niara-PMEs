import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DiagnosticoOnChain } from "@/components/empresa/DiagnosticoOnChain";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createClient } from "@/lib/supabase/server";

// Página temporária da Fase 3, sub-etapa 1 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — só
// leitura on-chain, sem nenhuma escrita, sem UI de publicação. Mesmo gate de acesso de
// /empresa/ofertas (role === 'issuer'); não há link para esta rota em nenhum menu — acessível
// só por quem souber a URL. Remover (ou substituir pela tela de publicação real) quando a
// Fase 3 avançar para as próximas sub-etapas.
export const metadata: Metadata = {
  title: "Diagnóstico on-chain · Niara PMEs",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role } = await resolveAccount();
  if (role !== "issuer") {
    redirect("/conta?aviso=apenas-empresa");
  }

  return <DiagnosticoOnChain />;
}
