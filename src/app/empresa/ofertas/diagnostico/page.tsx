import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnChainDiagnostics } from "@/components/empresa/OnChainDiagnostics";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createClient } from "@/lib/supabase/server";

// Temporary page from Phase 3, sub-step 1 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — on-chain
// reads only, no writes at all, no publication UI. Same access gate as /empresa/ofertas
// (role === 'issuer'); there's no link to this route in any menu — reachable only by whoever
// knows the URL. Remove it (or replace it with the real publication screen) when Phase 3 moves
// on to the next sub-steps.
export const metadata: Metadata = {
  title: "On-chain diagnostic · Niara PMEs",
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

  return <OnChainDiagnostics />;
}
