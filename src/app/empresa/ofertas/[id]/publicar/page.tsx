import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicarOnChainPage } from "@/components/empresa/publicar/PublicarOnChainPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Sub-etapa 3 da Fase 3 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — Server Component: valida
// dono + elegibilidade (status), lê a carteira vinculada (issuers.wallet_address) e entrega
// tudo pronto para o Client Component calcular os 6 gates. Nenhuma escrita acontece aqui.
export const metadata: Metadata = {
  title: `${ptBr.empresaOfertas.publicarOnChain.meta.title} · Niara PMEs`,
  description: ptBr.empresaOfertas.publicarOnChain.meta.description,
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    redirect("/conta?aviso=apenas-empresa");
  }

  const admin = createAdminClient();

  // Lista branca explícita — mesma regra de ouro do resto do projeto (nunca select('*')).
  const { data: offering } = await admin
    .from("offerings")
    .select("id, status")
    .eq("id", id)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (!offering) {
    notFound();
  }

  const { data: issuer } = await admin.from("issuers").select("wallet_address").eq("id", accountId).maybeSingle();

  const walletVinculada = (issuer?.wallet_address as string | null) ?? null;

  if (offering.status !== "draft") {
    const t = ptBr.empresaOfertas.publicarOnChain;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.naoElegivel.titulo}</h1>
        <p className="max-w-md text-on-military-muted">{t.naoElegivel.texto}</p>
      </main>
    );
  }

  return <PublicarOnChainPage offeringId={offering.id as string} walletVinculada={walletVinculada} />;
}
