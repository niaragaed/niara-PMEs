import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";

export type SyncStatus = "nao_onchain" | "pendente" | "confirmada" | "divergente";

// Pequeno indicador reutilizável do status de publicação on-chain (Fase 3, sub-etapa 5 — ver
// PLANO_FASE_3_PUBLICACAO_ONCHAIN.md, seção 4). Usado no card de OfertasPage.tsx e no resumo de
// MyOffersSection.tsx (/perfil); PublicarOnChainPage.tsx não usa este badge — já comunica cada
// status com um painel próprio, mais detalhado. `nao_onchain` não renderiza nada: uma oferta que
// nunca começou o fluxo de publicação não precisa de indicador extra.
const STYLES: Record<Exclude<SyncStatus, "nao_onchain">, string> = {
  pendente: "border-panel-border bg-military-600/40 text-on-military",
  confirmada: "border-value-positive/30 bg-value-positive/15 text-value-positive",
  divergente: "border-value-negative/30 bg-value-negative/15 text-value-negative",
};

const ICONS = { pendente: Clock, confirmada: CheckCircle2, divergente: AlertTriangle };

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (status === "nao_onchain") return null;

  const Icon = ICONS[status];
  const label = ptBr.empresaOfertas.onchainStatus[status].titulo;

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${STYLES[status]}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
