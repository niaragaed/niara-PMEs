"use client";

// Visual list of the publication gates (Phase 3) — purely presentational: receives the rows
// already resolved (label/status/reason, already translated) and only draws them. Every decision
// about "what each status means" already happened before, in src/lib/web3/gates.ts + the mapping
// in PublicarOnChainPage.tsx — this component never interprets an error as a rejection nor makes
// up text.
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { GateStatus } from "@/lib/web3/gates";
import { useDictionary } from "@/lib/i18n/client";

export type GateRow = {
  id: string;
  label: string;
  status: GateStatus;
  /** Extra text — the reason for the rejection/error, or an informative detail even on "ok". */
  detail: string | null;
};

function StatusIcon({ status }: { status: GateStatus }) {
  switch (status) {
    case "ok":
      return <Check className="h-4 w-4 shrink-0 text-value-positive" aria-hidden="true" />;
    case "rejected":
      return <X className="h-4 w-4 shrink-0 text-value-negative" aria-hidden="true" />;
    case "error":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />;
    case "loading":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-on-military-muted" aria-hidden="true" />;
  }
}

export function GateChecklist({ rows }: { rows: GateRow[] }) {
  const statusLabels = useDictionary().companyOfferings.publishOnChain.gates.statusLabels;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border border-panel-border bg-panel p-4">
          <div className="flex items-start gap-3">
            <StatusIcon status={row.status} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-on-military">{row.label}</p>
                <span
                  className={
                    row.status === "ok"
                      ? "text-xs text-value-positive"
                      : row.status === "rejected"
                        ? "text-xs text-value-negative"
                        : row.status === "error"
                          ? "text-xs text-salmon"
                          : "text-xs text-on-military-muted"
                  }
                >
                  {statusLabels[row.status]}
                </span>
              </div>
              {row.detail && <p className="mt-1 text-xs text-on-military-muted">{row.detail}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
