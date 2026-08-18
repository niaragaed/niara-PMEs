"use client";

import { useState, type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "./RealOnChainInvestPanel";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import { ptBr } from "@/lib/i18n/pt-br";

export function OnChainInvestPage() {
  const t = ptBr.investirOnChain;

  // Várias ofertas podem estar configuradas ao mesmo tempo (demo presencial — ver
  // NEXT_PUBLIC_OFERTAS_ONCHAIN em src/lib/web3/addresses.ts). O seletor abaixo só aparece
  // quando há mais de uma; com só uma (ou nenhuma configurada), o comportamento é idêntico ao
  // de antes desta mudança.
  const numOfertas = getOnChainAddresses()?.ofertas.length ?? 0;
  const [ofertaIndex, setOfertaIndex] = useState(0);

  function handleTrocarOferta(event: ChangeEvent<HTMLSelectElement>) {
    setOfertaIndex(Number(event.target.value));
  }

  if (numOfertas === 0) {
    return (
      <main className="flex flex-1 flex-col bg-military">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
            <p>{t.contratoNaoConfigurado}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-2 text-sm text-on-military-muted">{t.subtitulo}</p>

        <div className="mt-6 flex flex-col gap-6">
          {numOfertas > 1 && (
            <label className="flex flex-col gap-1 rounded-lg border border-panel-border bg-panel p-5 text-sm">
              <span className="text-xs font-semibold text-on-military-muted">{t.seletorOferta.label}</span>
              <select
                value={ofertaIndex}
                onChange={handleTrocarOferta}
                className="w-full max-w-xs rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
              >
                {Array.from({ length: numOfertas }, (_, index) => (
                  <option key={index} value={index}>
                    {t.seletorOferta.opcao} {index + 1}
                  </option>
                ))}
              </select>
            </label>
          )}

          <RealOnChainInvestPanel key={ofertaIndex} ofertaIndex={ofertaIndex} />
        </div>
      </div>
    </main>
  );
}
