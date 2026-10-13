"use client";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useDictionary } from "@/lib/i18n/client";

export type SyncStatus = "nao_onchain" | "pendente" | "confirmada" | "divergente";

// Small reusable indicator of the on-chain publication status (Phase 3, sub-step 5 — see
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md, section 4). Used on the OfferingsPage.tsx card and in the
// MyOffersSection.tsx summary (/perfil); PublishOnChainPage.tsx doesn't use this badge — it
// already conveys each status with its own, more detailed panel. `nao_onchain` renders nothing: an
// offering that never started the publication flow doesn't need an extra indicator.
const STYLES: Record<Exclude<SyncStatus, "nao_onchain">, string> = {
  pendente: "border-panel-border bg-military-600/40 text-on-military",
  confirmada: "border-value-positive/30 bg-value-positive/15 text-value-positive",
  divergente: "border-value-negative/30 bg-value-negative/15 text-value-negative",
};

const ICONS = { pendente: Clock, confirmada: CheckCircle2, divergente: AlertTriangle };

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  const dict = useDictionary();
  if (status === "nao_onchain") return null;

  const Icon = ICONS[status];
  const label = dict.companyOfferings.onchainStatus[status].title;

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STYLES[status]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
