"use client";

// Diagnóstico temporário da Fase 3, sub-etapa 1 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — só
// leitura, sem carteira conectada, sem escrita. Prova duas coisas antes de qualquer código de
// assinatura existir: (1) o gate 4 (emissoresAutorizados no OfertaOrquestrador) lê certo para
// um endereço autorizado e para um não autorizado; (2) os dados públicos da oferta PSILVA (já
// publicada em Sepolia na Fase 2 dos contratos) batem com o que DEMO_SEPOLIA.md documenta.
import { sepolia } from "wagmi/chains";
import { useReadContracts } from "wagmi";
import { getOrquestradorContract, ORQUESTRADOR_CHAIN_ID } from "@/lib/web3/orquestrador";
import { ofertaCaptacaoAbi } from "@/lib/web3/abis/ofertaCaptacao";
import { participacaoTokenAbi } from "@/lib/web3/abis/participacaoToken";
import { describeOnChainError } from "@/lib/web3/errors";
import { formatToken, formatPrazo } from "@/lib/web3/format";

// Oferta de referência da Fase 2 dos contratos (niara-contracts-PMEs/DEMO_SEPOLIA.md, seção
// "Resultados — primeira oferta self-service real"). Hardcoded de propósito: é só para esta
// leitura de diagnóstico, não uma oferta do catálogo do site — nunca reaproveitar estes
// endereços numa tela real de investidor.
const PSILVA_TOKEN_ADDRESS = "0x76d8e88fe48Bfab2f2EEd7196321B2886750298D" as const;
const PSILVA_OFERTA_ADDRESS = "0x6587265f971Aa555106D64e3422Ee901A0D20546" as const;
// Mesma rede do orquestrador, fixada explicitamente (não inferida de nada) — ver
// src/lib/web3/orquestrador.ts.
const PSILVA_CHAIN_ID = sepolia.id;

const EMISSOR_REFERENCIA = "0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6" as const;
// Endereço de "burn" padrão da Ethereum — nunca terá AGENTE_ROLE/emissoresAutorizados
// concedido a ele por ninguém; serve só para provar que a leitura também retorna `false` de
// verdade, não um `false` "de mentira" por falta de configuração.
const ENDERECO_NAO_AUTORIZADO = "0x000000000000000000000000000000000000dEaD" as const;

const ESTADO_LABEL: Record<number, string> = {
  0: "Aberta",
  1: "EncerradaSucesso",
  2: "EncerradaFalha",
};

type ReadResultItem = { status: "success"; result: unknown } | { status: "failure"; error: Error } | undefined;

// Fora do componente de propósito (react-hooks/static-components) — recebe o item já
// resolvido do multicall em vez de fechar sobre `data`/`index`.
function Campo({
  label,
  item,
  format,
}: {
  label: string;
  item: ReadResultItem;
  format?: (v: unknown) => string;
}) {
  const falhou = !item || item.status === "failure";
  const valor = item && item.status === "success" ? item.result : undefined;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-panel-border py-2 text-sm">
      <dt className="text-on-military-muted">{label}</dt>
      <dd className="font-mono text-on-military">
        {falhou ? (
          <span className="text-value-negative">leitura falhou</span>
        ) : format ? (
          format(valor)
        ) : (
          String(valor)
        )}
      </dd>
    </div>
  );
}

export function DiagnosticoOnChain() {
  const orquestrador = getOrquestradorContract();

  const { data, isLoading, isError, error } = useReadContracts({
    chainId: ORQUESTRADOR_CHAIN_ID,
    query: { enabled: orquestrador !== null },
    contracts: orquestrador
      ? ([
          {
            address: orquestrador.address,
            abi: orquestrador.abi,
            functionName: "emissoresAutorizados",
            args: [EMISSOR_REFERENCIA],
          },
          {
            address: orquestrador.address,
            abi: orquestrador.abi,
            functionName: "emissoresAutorizados",
            args: [ENDERECO_NAO_AUTORIZADO],
          },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "emissorWallet" },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "estado" },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "metaMinima" },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "metaMaxima" },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "precoPorCota" },
          { address: PSILVA_OFERTA_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "prazo" },
          { address: PSILVA_TOKEN_ADDRESS, abi: participacaoTokenAbi, functionName: "name" },
          { address: PSILVA_TOKEN_ADDRESS, abi: participacaoTokenAbi, functionName: "symbol" },
          { address: PSILVA_TOKEN_ADDRESS, abi: participacaoTokenAbi, functionName: "empresa" },
          { address: PSILVA_TOKEN_ADDRESS, abi: participacaoTokenAbi, functionName: "cotasAutorizadas" },
          { address: PSILVA_TOKEN_ADDRESS, abi: participacaoTokenAbi, functionName: "totalSupply" },
        ] as const)
      : undefined,
  });

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">Diagnóstico temporário</span> — Fase 3,
        sub-etapa 1. Só leitura on-chain, sem carteira, sem escrita. Não faz parte do produto
        final.
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">
          Diagnóstico on-chain — Sepolia
        </h1>
        <p className="mt-2 text-sm text-on-military-muted">
          Rede fixada: Sepolia (chainId {ORQUESTRADOR_CHAIN_ID}).
        </p>

        {orquestrador === null && (
          <p className="mt-6 rounded-md border border-panel-border bg-panel p-4 text-sm text-on-military-muted">
            Contrato não configurado — defina{" "}
            <code className="text-on-military">NEXT_PUBLIC_ORQUESTRADOR_ADDRESS</code> no
            ambiente.
          </p>
        )}

        {orquestrador !== null && isLoading && (
          <p className="mt-6 text-sm text-on-military-muted">Lendo a chain…</p>
        )}

        {orquestrador !== null && !isLoading && isError && (
          <p role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            Não foi possível ler os dados on-chain: {describeOnChainError(error)}
          </p>
        )}

        {orquestrador !== null && !isLoading && !isError && data && (
          <div className="mt-6 flex flex-col gap-6">
            <section>
              <h2 className="text-sm font-semibold text-on-military">
                Gate 4 — emissoresAutorizados (OfertaOrquestrador {orquestrador.address})
              </h2>
              <dl className="mt-2">
                <Campo label={`${EMISSOR_REFERENCIA} (emissor da PSILVA, deve ser true)`} item={data?.[0]} />
                <Campo label={`${ENDERECO_NAO_AUTORIZADO} (não autorizado, deve ser false)`} item={data?.[1]} />
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-on-military">
                Oferta de referência — PSILVA ({PSILVA_OFERTA_ADDRESS}, chainId {PSILVA_CHAIN_ID})
              </h2>
              <dl className="mt-2">
                <Campo label="emissorWallet" item={data?.[2]} />
                <Campo label="estado" item={data?.[3]} format={(v) => `${v} (${ESTADO_LABEL[Number(v)] ?? "?"})`} />
                <Campo label="metaMinima" item={data?.[4]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Campo label="metaMaxima" item={data?.[5]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Campo label="precoPorCota" item={data?.[6]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Campo label="prazo" item={data?.[7]} format={(v) => formatPrazo(v as bigint)} />
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-on-military">
                Token — PSILVA ({PSILVA_TOKEN_ADDRESS})
              </h2>
              <dl className="mt-2">
                <Campo label="name" item={data?.[8]} />
                <Campo label="symbol" item={data?.[9]} />
                <Campo label="empresa" item={data?.[10]} />
                <Campo label="cotasAutorizadas" item={data?.[11]} format={(v) => formatToken(v as bigint, 18, "cotas")} />
                <Campo label="totalSupply" item={data?.[12]} format={(v) => formatToken(v as bigint, 18, "cotas")} />
              </dl>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
