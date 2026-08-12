import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OfertasPage, type OfferingRow } from "@/components/empresa/OfertasPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.empresaOfertas.meta.title} · Niara PMEs`,
  description: ptBr.empresaOfertas.meta.description,
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

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    redirect("/conta?aviso=apenas-empresa");
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("offerings")
    .select(
      "id, status, target_min_cents, base_cap_cents, hard_cap_cents, share_price_cents, category, opens_at, closes_at, created_at",
    )
    .eq("issuer_id", accountId)
    .order("created_at", { ascending: false });

  const offerings = data ?? [];
  const offeringIds = offerings.map((offering) => offering.id as string);

  // Pago até agora (paid + settled) e refs de token emitido por oferta —
  // derivados aqui em JS a partir de investments/payment_events; nenhum dos
  // dois vem direto da tabela offerings.
  const paidCentsByOffering = new Map<string, number>();
  const tokenRefsByOffering = new Map<string, string[]>();

  if (offeringIds.length > 0) {
    const { data: investments } = await admin
      .from("investments")
      .select("id, offering_id, amount_cents, status")
      .in("offering_id", offeringIds)
      .in("status", ["paid", "settled"]);

    const offeringIdByInvestment = new Map<string, string>();
    for (const investment of investments ?? []) {
      const offeringId = investment.offering_id as string;
      offeringIdByInvestment.set(investment.id as string, offeringId);
      paidCentsByOffering.set(
        offeringId,
        (paidCentsByOffering.get(offeringId) ?? 0) + Number(investment.amount_cents),
      );
    }

    const investmentIds = [...offeringIdByInvestment.keys()];
    if (investmentIds.length > 0) {
      const { data: tokenEvents } = await admin
        .from("payment_events")
        .select("investment_id, external_ref")
        .eq("event_type", "tokens_issued")
        .in("investment_id", investmentIds);

      for (const event of tokenEvents ?? []) {
        const offeringId = offeringIdByInvestment.get(event.investment_id as string);
        if (!offeringId) continue;
        const refs = tokenRefsByOffering.get(offeringId) ?? [];
        refs.push(event.external_ref as string);
        tokenRefsByOffering.set(offeringId, refs);
      }
    }
  }

  const rows: OfferingRow[] = offerings.map((offering) => {
    const base = offering as Omit<OfferingRow, "paidCents" | "tokenRefs">;
    return {
      ...base,
      paidCents: paidCentsByOffering.get(base.id) ?? 0,
      tokenRefs: tokenRefsByOffering.get(base.id) ?? [],
    };
  });

  return <OfertasPage offerings={rows} />;
}
