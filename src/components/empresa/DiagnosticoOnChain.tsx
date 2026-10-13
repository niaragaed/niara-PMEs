"use client";

// Temporary diagnostic from Phase 3, sub-step 1 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — read
// only, no connected wallet, no writes. Proves two things before any signing code exists: (1) gate
// 4 (emissoresAutorizados on OfertaOrquestrador) reads correctly for an authorized address and for
// an unauthorized one; (2) the public data of the PSILVA offering (already published on Sepolia in
// the contracts' Phase 2) matches what DEMO_SEPOLIA.md documents. An internal developer tool, so
// its copy is English-only (not part of the bilingual product interface).
import { sepolia } from "wagmi/chains";
import { useReadContracts } from "wagmi";
import { getOrchestratorContract, ORCHESTRATOR_CHAIN_ID } from "@/lib/web3/orquestrador";
import { ofertaCaptacaoAbi } from "@/lib/web3/abis/ofertaCaptacao";
import { participacaoTokenAbi } from "@/lib/web3/abis/participacaoToken";
import { describeOnChainError } from "@/lib/web3/errors";
import { formatToken, formatDeadline } from "@/lib/web3/format";
import { useDictionary } from "@/lib/i18n/client";

// Reference offering from the contracts' Phase 2 (niara-contracts-PMEs/DEMO_SEPOLIA.md, section
// "Resultados — primeira oferta self-service real"). Hard-coded on purpose: it's only for this
// diagnostic read, not an offering from the site's catalog — never reuse these addresses on a real
// investor screen.
const PSILVA_TOKEN_ADDRESS = "0x76d8e88fe48Bfab2f2EEd7196321B2886750298D" as const;
const PSILVA_OFFERING_ADDRESS = "0x6587265f971Aa555106D64e3422Ee901A0D20546" as const;
// Same network as the orchestrator, pinned explicitly (not inferred from anything) — see
// src/lib/web3/orquestrador.ts.
const PSILVA_CHAIN_ID = sepolia.id;

const REFERENCE_ISSUER = "0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6" as const;
// Ethereum's standard "burn" address — it will never have AGENTE_ROLE/emissoresAutorizados granted
// by anyone; it only serves to prove the read also returns a real `false`, not a "fake" `false`
// caused by missing configuration.
const UNAUTHORIZED_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

// The contract's `Estado` enum (on-chain values).
const STATE_LABEL: Record<number, string> = {
  0: "Aberta",
  1: "EncerradaSucesso",
  2: "EncerradaFalha",
};

type ReadResultItem = { status: "success"; result: unknown } | { status: "failure"; error: Error } | undefined;

// Outside the component on purpose (react-hooks/static-components) — receives the multicall item
// already resolved instead of closing over `data`/`index`.
function Field({
  label,
  item,
  format,
}: {
  label: string;
  item: ReadResultItem;
  format?: (v: unknown) => string;
}) {
  const failed = !item || item.status === "failure";
  const value = item && item.status === "success" ? item.result : undefined;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-panel-border py-2 text-sm">
      <dt className="text-on-military-muted">{label}</dt>
      <dd className="font-mono text-on-military">
        {failed ? (
          <span className="text-value-negative">read failed</span>
        ) : format ? (
          format(value)
        ) : (
          String(value)
        )}
      </dd>
    </div>
  );
}

export function OnChainDiagnostics() {
  const orchestrator = getOrchestratorContract();
  const dict = useDictionary();

  const { data, isLoading, isError, error } = useReadContracts({
    chainId: ORCHESTRATOR_CHAIN_ID,
    query: { enabled: orchestrator !== null },
    contracts: orchestrator
      ? ([
          {
            address: orchestrator.address,
            abi: orchestrator.abi,
            functionName: "emissoresAutorizados",
            args: [REFERENCE_ISSUER],
          },
          {
            address: orchestrator.address,
            abi: orchestrator.abi,
            functionName: "emissoresAutorizados",
            args: [UNAUTHORIZED_ADDRESS],
          },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "emissorWallet" },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "estado" },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "metaMinima" },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "metaMaxima" },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "precoPorCota" },
          { address: PSILVA_OFFERING_ADDRESS, abi: ofertaCaptacaoAbi, functionName: "prazo" },
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
        <span className="font-semibold text-salmon">Temporary diagnostic</span> — Phase 3, sub-step 1.
        On-chain reads only, no wallet, no writes. Not part of the final product.
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">On-chain diagnostic — Sepolia</h1>
        <p className="mt-2 text-sm text-on-military-muted">Pinned network: Sepolia (chainId {ORCHESTRATOR_CHAIN_ID}).</p>

        {orchestrator === null && (
          <p className="mt-6 rounded-md border border-panel-border bg-panel p-4 text-sm text-on-military-muted">
            Contract not configured — set <code className="text-on-military">NEXT_PUBLIC_ORQUESTRADOR_ADDRESS</code> in
            the environment.
          </p>
        )}

        {orchestrator !== null && isLoading && <p className="mt-6 text-sm text-on-military-muted">Reading the chain…</p>}

        {orchestrator !== null && !isLoading && isError && (
          <p role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            Couldn&apos;t read the on-chain data: {describeOnChainError(error, dict.chainErrors.evm)}
          </p>
        )}

        {orchestrator !== null && !isLoading && !isError && data && (
          <div className="mt-6 flex flex-col gap-6">
            <section>
              <h2 className="text-sm font-semibold text-on-military">
                Gate 4 — emissoresAutorizados (OfertaOrquestrador {orchestrator.address})
              </h2>
              <dl className="mt-2">
                <Field label={`${REFERENCE_ISSUER} (PSILVA's issuer, must be true)`} item={data?.[0]} />
                <Field label={`${UNAUTHORIZED_ADDRESS} (not authorized, must be false)`} item={data?.[1]} />
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-on-military">
                Reference offering — PSILVA ({PSILVA_OFFERING_ADDRESS}, chainId {PSILVA_CHAIN_ID})
              </h2>
              <dl className="mt-2">
                <Field label="emissorWallet" item={data?.[2]} />
                <Field label="estado" item={data?.[3]} format={(v) => `${v} (${STATE_LABEL[Number(v)] ?? "?"})`} />
                <Field label="metaMinima" item={data?.[4]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Field label="metaMaxima" item={data?.[5]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Field label="precoPorCota" item={data?.[6]} format={(v) => formatToken(v as bigint, 18, "mBRL")} />
                <Field label="prazo" item={data?.[7]} format={(v) => formatDeadline(v as bigint)} />
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-on-military">Token — PSILVA ({PSILVA_TOKEN_ADDRESS})</h2>
              <dl className="mt-2">
                <Field label="name" item={data?.[8]} />
                <Field label="symbol" item={data?.[9]} />
                <Field label="empresa" item={data?.[10]} />
                <Field label="cotasAutorizadas" item={data?.[11]} format={(v) => formatToken(v as bigint, 18, "shares")} />
                <Field label="totalSupply" item={data?.[12]} format={(v) => formatToken(v as bigint, 18, "shares")} />
              </dl>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
