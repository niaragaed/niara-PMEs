"use client";

// Lista visual dos gates de publicação (Fase 3) — puramente apresentacional: recebe as linhas
// já resolvidas (label/status/motivo em pt-BR) e só desenha. Toda decisão de "o que cada
// status significa" já aconteceu antes, em src/lib/web3/gates.ts + o mapeamento em
// PublicarOnChainPage.tsx — este componente nunca interpreta um erro como reprovação nem
// inventa texto.
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import type { GateStatus } from "@/lib/web3/gates";

export type GateRow = {
  id: string;
  label: string;
  status: GateStatus;
  /** Texto extra em pt-BR — motivo da reprovação/erro, ou um detalhe informativo mesmo em "ok". */
  detalhe: string | null;
};

function StatusIcon({ status }: { status: GateStatus }) {
  switch (status) {
    case "ok":
      return <Check className="h-4 w-4 shrink-0 text-value-positive" aria-hidden="true" />;
    case "reprovado":
      return <X className="h-4 w-4 shrink-0 text-value-negative" aria-hidden="true" />;
    case "erro":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />;
    case "carregando":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-on-military-muted" aria-hidden="true" />;
  }
}

function statusLabel(status: GateStatus): string {
  switch (status) {
    case "ok":
      return "OK";
    case "reprovado":
      return "Reprovado";
    case "erro":
      return "Erro de leitura";
    case "carregando":
      return "Verificando…";
  }
}

export function GateChecklist({ rows }: { rows: GateRow[] }) {
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
                      : row.status === "reprovado"
                        ? "text-xs text-value-negative"
                        : row.status === "erro"
                          ? "text-xs text-salmon"
                          : "text-xs text-on-military-muted"
                  }
                >
                  {statusLabel(row.status)}
                </span>
              </div>
              {row.detalhe && <p className="mt-1 text-xs text-on-military-muted">{row.detalhe}</p>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
