"use client";

import { useState, type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "./RealOnChainInvestPanel";
import { getMockBrlContract } from "@/lib/web3/contracts";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import { ptBr } from "@/lib/i18n/pt-br";

type OpcaoOferta = {
  key: string;
  tokenAddress: `0x${string}`;
  ofertaAddress: `0x${string}`;
  label: string;
  proveniencia: string;
};

// Fase 4, sub-etapa 5.2 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md): o seletor passa a unir DUAS
// origens de oferta — a lista legada (NEXT_PUBLIC_OFERTAS_ONCHAIN, 10 ofertas de reserva criadas
// por script administrativo) e as ofertas self-service já confirmadas no Supabase
// (`confirmedOfferings`, lida no servidor por page.tsx via loadConfirmedOnChainOfferings()).
// Nenhuma das duas é "mais real" que a outra — toda a plataforma é demonstração, mesmo MockBRL
// sem lastro para as duas (confirmado on-chain antes desta sub-etapa: OfertaCaptacao.moeda() bate
// para ambas). A única diferença é de PROVENIÊNCIA do conteúdo (empresa inventada à mão vs. dados
// que o próprio emissor preencheu) — por isso cada opção carrega uma linha de proveniência, não
// uma separação estrutural.
function montarOpcoes(confirmedOfferings: ConfirmedOnChainOffering[]): OpcaoOferta[] {
  const t = ptBr.investirOnChain.seletorOferta;
  const legado = getOnChainAddresses()?.ofertas ?? [];

  const opcoesLegado: OpcaoOferta[] = legado.map((par, index) => ({
    key: `legado-${index}`,
    tokenAddress: par.token,
    ofertaAddress: par.oferta,
    label: `${t.opcao} ${index + 1}`,
    proveniencia: t.proveniencia.legado,
  }));

  const opcoesSelfService: OpcaoOferta[] = confirmedOfferings.map((oferta) => ({
    key: oferta.id,
    tokenAddress: oferta.tokenAddress,
    ofertaAddress: oferta.contractAddress,
    label: oferta.issuerTradeName ?? oferta.issuerLegalName,
    proveniencia: t.proveniencia.selfService,
  }));

  return [...opcoesLegado, ...opcoesSelfService];
}

export function OnChainInvestPage({
  isSocio = false,
  confirmedOfferings,
}: {
  isSocio?: boolean;
  confirmedOfferings: ConfirmedOnChainOffering[];
}) {
  const t = ptBr.investirOnChain;
  const opcoes = montarOpcoes(confirmedOfferings);

  const [selectedKey, setSelectedKey] = useState(opcoes[0]?.key ?? "");
  const selecionada = opcoes.find((opcao) => opcao.key === selectedKey) ?? opcoes[0] ?? null;

  function handleTrocarOferta(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedKey(event.target.value);
  }

  // Sem MockBRL configurado, nenhuma oferta (legada ou self-service) é investível — mesmo aviso
  // de "contrato não configurado" de antes desta sub-etapa. Sem nenhuma opção disponível (nem
  // legada nem self-service confirmada), o resultado prático é o mesmo: nada para mostrar.
  if (!getMockBrlContract() || opcoes.length === 0 || !selecionada) {
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
          {opcoes.length > 1 && (
            <label className="flex flex-col gap-1 rounded-lg border border-panel-border bg-panel p-5 text-sm">
              <span className="text-xs font-semibold text-on-military-muted">{t.seletorOferta.label}</span>
              <select
                value={selecionada.key}
                onChange={handleTrocarOferta}
                className="w-full max-w-xs rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
              >
                {opcoes.map((opcao) => (
                  <option key={opcao.key} value={opcao.key}>
                    {opcao.label} — {opcao.proveniencia}
                  </option>
                ))}
              </select>
            </label>
          )}

          <RealOnChainInvestPanel
            key={selecionada.key}
            tokenAddress={selecionada.tokenAddress}
            ofertaAddress={selecionada.ofertaAddress}
            isSocio={isSocio}
          />
        </div>
      </div>
    </main>
  );
}
