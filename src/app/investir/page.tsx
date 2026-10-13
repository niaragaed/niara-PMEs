import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InvestPage, type MyReservationRow, type ActiveOfferingRow } from "@/components/investir/InvestirPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAP_OCCUPYING_STATUSES } from "@/lib/investments";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${ptBr.invest.meta.title} · Niara PMEs`,
  description: ptBr.invest.meta.description,
  robots: { index: false, follow: false },
};

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

  const raisedByOffering = new Map<string, number>();
  if (offeringIds.length > 0) {
    const { data: investmentsData } = await admin
      .from("investments")
      .select("offering_id, amount_cents, status")
      .in("offering_id", offeringIds)
      .in("status", CAP_OCCUPYING_STATUSES);

    for (const investment of investmentsData ?? []) {
      const current = raisedByOffering.get(investment.offering_id as string) ?? 0;
      raisedByOffering.set(investment.offering_id as string, current + Number(investment.amount_cents));
    }
  }

  const activeOfferings: ActiveOfferingRow[] = offerings.map((offering) => ({
    id: offering.id,
    issuerLegalName: issuerLegalName(offering.issuers),
    targetMinCents: Number(offering.target_min_cents),
    hardCapCents: Number(offering.hard_cap_cents),
    raisedCents: raisedByOffering.get(offering.id) ?? 0,
    opensAt: offering.opens_at,
    closesAt: offering.closes_at,
  }));

  // "Minhas reservas" mostra reserved (aguardando pagamento) e paid (pago,
  // simulado) — sempre filtrado por investor_id = accountId (o investidor
  // logado), nunca aportes de outro investidor.
  const { data: myReservationsData } = await admin
    .from("investments")
    .select("id, offering_id, amount_cents, status, payment_ref, created_at")
    .eq("investor_id", accountId)
    .in("status", ["reserved", "paid"])
    .order("created_at", { ascending: false });

  const offeringNameById = new Map(
    offerings.map((offering) => [offering.id, issuerLegalName(offering.issuers)]),
  );

  const myReservations: MyReservationRow[] = (myReservationsData ?? []).map((reservation) => ({
    id: reservation.id as string,
    offeringId: reservation.offering_id as string,
    issuerLegalName: offeringNameById.get(reservation.offering_id as string) ?? "",
    amountCents: Number(reservation.amount_cents),
    status: reservation.status as "reserved" | "paid",
    paymentRef: (reservation.payment_ref as string | null) ?? null,
    createdAt: reservation.created_at as string,
  }));

  const { data: investorData } = await admin
    .from("investors")
    .select("kyc_status")
    .eq("id", accountId)
    .single();
  const kycStatus = (investorData?.kyc_status as "pending" | "approved" | "rejected" | undefined) ?? "pending";

  return <InvestPage offerings={activeOfferings} myReservations={myReservations} kycStatus={kycStatus} />;
}
