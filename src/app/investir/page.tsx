import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InvestirPage, type MinhaReservaRow, type OfertaAtivaRow } from "@/components/investir/InvestirPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.investir.meta.title} · Niara PMEs`,
  description: ptBr.investir.meta.description,
  robots: { index: false, follow: false },
};

// Conjunto de status que "ocupa" o hard_cap de uma oferta — mesmo conjunto
// que o trigger enforce_offering_hard_cap usa (0001_core.sql). Usado só para
// exibir "já reservado" na vitrine; NUNCA para decidir aceitar/barrar um
// aporte — quem barra é o banco (FOR UPDATE), esta soma é puramente
// informativa e pode estar um instante desatualizada por concorrência.
const CAP_OCCUPYING_STATUSES = ["reserved", "paid", "settled"];

type OfferingQueryRow = {
  id: string;
  issuer_id: string;
  target_min_cents: number;
  hard_cap_cents: number;
  opens_at: string;
  closes_at: string;
  issuers: { legal_name: string } | { legal_name: string }[] | null;
};

function issuerLegalName(issuers: OfferingQueryRow["issuers"]): string {
  if (!issuers) return "";
  return Array.isArray(issuers) ? (issuers[0]?.legal_name ?? "") : issuers.legal_name;
}

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    redirect("/conta?aviso=apenas-investidor");
  }

  const admin = createAdminClient();

  const { data: offeringsData } = await admin
    .from("offerings")
    .select("id, issuer_id, target_min_cents, hard_cap_cents, opens_at, closes_at, issuers(legal_name)")
    .eq("status", "active")
    .order("opens_at", { ascending: false });

  const offerings = (offeringsData ?? []) as unknown as OfferingQueryRow[];
  const offeringIds = offerings.map((offering) => offering.id);

  const arrecadadoPorOferta = new Map<string, number>();
  if (offeringIds.length > 0) {
    const { data: investmentsData } = await admin
      .from("investments")
      .select("offering_id, amount_cents, status")
      .in("offering_id", offeringIds)
      .in("status", CAP_OCCUPYING_STATUSES);

    for (const investment of investmentsData ?? []) {
      const atual = arrecadadoPorOferta.get(investment.offering_id as string) ?? 0;
      arrecadadoPorOferta.set(investment.offering_id as string, atual + Number(investment.amount_cents));
    }
  }

  const ofertasAtivas: OfertaAtivaRow[] = offerings.map((offering) => ({
    id: offering.id,
    issuerLegalName: issuerLegalName(offering.issuers),
    targetMinCents: Number(offering.target_min_cents),
    hardCapCents: Number(offering.hard_cap_cents),
    arrecadadoCents: arrecadadoPorOferta.get(offering.id) ?? 0,
    opensAt: offering.opens_at,
    closesAt: offering.closes_at,
  }));

  // "Minhas reservas" mostra reserved (aguardando pagamento) e paid (pago,
  // simulado) — sempre filtrado por investor_id = accountId (o investidor
  // logado), nunca aportes de outro investidor.
  const { data: minhasReservasData } = await admin
    .from("investments")
    .select("id, offering_id, amount_cents, status, payment_ref, created_at")
    .eq("investor_id", accountId)
    .in("status", ["reserved", "paid"])
    .order("created_at", { ascending: false });

  const nomeOfertaPorId = new Map(
    offerings.map((offering) => [offering.id, issuerLegalName(offering.issuers)]),
  );

  const minhasReservas: MinhaReservaRow[] = (minhasReservasData ?? []).map((reserva) => ({
    id: reserva.id as string,
    offeringId: reserva.offering_id as string,
    issuerLegalName: nomeOfertaPorId.get(reserva.offering_id as string) ?? "",
    amountCents: Number(reserva.amount_cents),
    status: reserva.status as "reserved" | "paid",
    paymentRef: (reserva.payment_ref as string | null) ?? null,
    createdAt: reserva.created_at as string,
  }));

  const { data: investorData } = await admin
    .from("investors")
    .select("kyc_status")
    .eq("id", accountId)
    .single();
  const kycStatus = (investorData?.kyc_status as "pending" | "approved" | "rejected" | undefined) ?? "pending";

  return <InvestirPage ofertas={ofertasAtivas} minhasReservas={minhasReservas} kycStatus={kycStatus} />;
}
