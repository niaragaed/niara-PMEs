"use client";

import { useState, type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { RealOnChainInvestPanel } from "./RealOnChainInvestPanel";
import { SolanaInvestPanel } from "./SolanaInvestPanel";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import type { ConfirmedOnChainOffering } from "@/lib/web3/confirmedOfferings";
import { ptBr } from "@/lib/i18n/pt-br";

type OpcaoOferta = { key: string; label: string; proveniencia: string } & (
  | { rede: "sepolia"; tokenAddress: `0x${string}`; ofertaAddress: `0x${string}` }
  | { rede: "solana-devnet"; ofertaEndereco: string }
);

/** Oferta do programa niara-pmes-solana, já lida no servidor (page.tsx). */
export type OpcaoSolanaServidor = { endereco: string; empresa: string; aberta: boolean; abertura: number };

// Fase 4, sub-etapa 5.2 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md): o seletor passa a unir DUAS
// origens de oferta — a lista legada (NEXT_PUBLIC_OFERTAS_ONCHAIN, 10 ofertas de reserva criadas
// por script administrativo) e as ofertas self-service já confirmadas no Supabase
// (`confirmedOfferings`, lida no servidor por page.tsx via loadConfirmedOnChainOfferings()).
// Nenhuma das duas é "mais real" que a outra — toda a plataforma é demonstração, MockBRL sem
// lastro para as duas. 🔴 Mas os dois lados NÃO compartilham o mesmo MockBRL — incidente real
// corrigido (ver CLAUDE.md, "Tela /investir/onchain"): a afirmação anterior deste comentário
// ("OfertaCaptacao.moeda() bate para ambas") nunca foi verificada linha a linha e estava errada.
// As 10 ofertas legadas de fato compartilham um único MockBRL; as self-service usam o MockBRL
// próprio do OfertaOrquestrador, diferente. Por isso cada oferta resolve seu próprio MockBRL
// on-chain (ver RealOnChainInvestPanel/useOfertaOnChain/useOnChainActions), nunca uma constante
// global — a única diferença que ESTE seletor precisa expor é a linha de proveniência do
// conteúdo (empresa inventada à mão vs. dados que o próprio emissor preencheu), não uma
// separação estrutural.
function montarOpcoes(confirmedOfferings: ConfirmedOnChainOffering[], ofertasSolana: OpcaoSolanaServidor[]): OpcaoOferta[] {
  const t = ptBr.investirOnChain.seletorOferta;
  const ts = ptBr.solana;
  const legado = getOnChainAddresses()?.ofertas ?? [];

  const opcoesLegado: OpcaoOferta[] = legado.map((par, index) => ({
    rede: "sepolia" as const,
    key: `legado-${index}`,
    tokenAddress: par.token,
    ofertaAddress: par.oferta,
    label: `${t.opcao} ${index + 1}`,
    proveniencia: t.proveniencia.legado,
  }));

  const opcoesSelfService: OpcaoOferta[] = confirmedOfferings.flatMap((oferta) =>
    oferta.rede === "sepolia"
      ? [
          {
            rede: "sepolia" as const,
            key: oferta.id,
            tokenAddress: oferta.tokenAddress,
            ofertaAddress: oferta.contractAddress,
            label: oferta.issuerTradeName ?? oferta.issuerLegalName,
            proveniencia: t.proveniencia.selfService,
          },
        ]
      : [],
  );

  // Solana: a lista vem do próprio programa; as que têm linha confirmada no Supabase (publicadas
  // pelo emissor no site) ganham o nome da empresa cadastrada, as demais (criadas pelo script de
  // administração do niara-pmes-solana) são as empresas fictícias de demonstração, com o nome
  // gravado on-chain.
  const selfServiceSolana = new Map(
    confirmedOfferings.filter((o) => o.rede === "solana-devnet").map((o) => [o.contractAddress, o]),
  );
  const opcoesSolana: OpcaoOferta[] = ofertasSolana.map((o) => {
    const cadastrada = selfServiceSolana.get(o.endereco);
    return {
      rede: "solana-devnet" as const,
      key: `solana-${o.endereco}`,
      ofertaEndereco: o.endereco,
      label: cadastrada ? (cadastrada.issuerTradeName ?? cadastrada.issuerLegalName) : o.empresa,
      proveniencia: cadastrada ? ts.seletor.provenienciaSelfService : ts.seletor.provenienciaDemo,
    };
  });

  return [...opcoesLegado, ...opcoesSelfService, ...opcoesSolana];
}

export function OnChainInvestPage({
  isSocio = false,
  confirmedOfferings,
  ofertasSolana = [],
  preferirSolana = false,
}: {
  isSocio?: boolean;
  confirmedOfferings: ConfirmedOnChainOffering[];
  ofertasSolana?: OpcaoSolanaServidor[];
  preferirSolana?: boolean;
}) {
  const t = ptBr.investirOnChain;
  const ts = ptBr.solana;
  const opcoes = montarOpcoes(confirmedOfferings, ofertasSolana);
  const inicial = (preferirSolana ? opcoes.find((o) => o.rede === "solana-devnet") : undefined) ?? opcoes[0];

  const [selectedKey, setSelectedKey] = useState(inicial?.key ?? "");
  const selecionada = opcoes.find((opcao) => opcao.key === selectedKey) ?? opcoes[0] ?? null;

  function handleTrocarOferta(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedKey(event.target.value);
  }

  // Sem nenhuma opção disponível (nem legada nem self-service confirmada), não há o que mostrar.
  // Não existe mais um check de "MockBRL global configurado" aqui — cada oferta resolve o seu
  // próprio MockBRL on-chain (ver RealOnChainInvestPanel), então a única coisa que pode faltar
  // neste nível é a lista de ofertas em si.
  if (opcoes.length === 0 || !selecionada) {
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
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">
          {selecionada.rede === "solana-devnet" ? ts.paginaInvestir.titulo : t.titulo}
        </h1>
        <p className="mt-2 text-sm text-on-military-muted">
          {selecionada.rede === "solana-devnet" ? ts.paginaInvestir.subtitulo : t.subtitulo}
        </p>

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
                    [{opcao.rede === "solana-devnet" ? ts.redeNome : ts.redeSepolia}] {opcao.label} — {opcao.proveniencia}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selecionada.rede === "sepolia" ? (
            <RealOnChainInvestPanel
              key={selecionada.key}
              tokenAddress={selecionada.tokenAddress}
              ofertaAddress={selecionada.ofertaAddress}
              isSocio={isSocio}
            />
          ) : (
            <SolanaInvestPanel key={selecionada.key} ofertaEndereco={selecionada.ofertaEndereco} isSocio={isSocio} />
          )}
        </div>
      </div>
    </main>
  );
}
