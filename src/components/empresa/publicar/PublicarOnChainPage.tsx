"use client";

// Phase 3, sub-step 4 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — the 6 gates actually computed
// (the terms are real now, no longer a stub), the button enabled when all of them pass, real
// signing via usePublicarOfertaOnChain. Never fakes success: "pendente" is always shown as "not
// published yet", with a link to Etherscan, until confirmPublication() comes back "confirmada".
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { GateChecklist, type GateRow } from "./GateChecklist";
import { PublicationTerms, type DataToken } from "./TermoPublicacao";
import { usePublishOnChainGates } from "@/lib/web3/hooks/usePublicarOnChainGates";
import { usePublishOfferingOnChain } from "@/lib/web3/hooks/usePublicarOfertaOnChain";
import { UNIT_ON_CHAIN } from "@/lib/web3/gates";
import { formatEth } from "@/lib/web3/format";
import {
  confirmPublication,
  checkConsistency,
  type ConfirmPublicationState,
  type CheckConsistencyState,
} from "@/app/empresa/ofertas/onchain-actions";
import { useDictionary } from "@/lib/i18n/client";

type Props = {
  offeringId: string;
  linkedWallet: string | null;
  companyName: string;
  cnpjRef: `0x${string}`;
  windowDays: number;
  targetMinCents: number;
  hardCapCents: number;
  sharePriceCents: number;
  syncStatus: string;
  txHash: string | null;
  contractAddress: string | null;
  tokenAddress: string | null;
  onchainLastError: string | null;
};

function etherscanTx(hash: string) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}
function etherscanAddress(address: string) {
  return `https://sepolia.etherscan.io/address/${address}`;
}

export function PublishOnChainPage({
  offeringId,
  linkedWallet,
  companyName,
  cnpjRef,
  windowDays,
  targetMinCents,
  hardCapCents,
  sharePriceCents,
  syncStatus,
  txHash,
  contractAddress,
  tokenAddress,
  onchainLastError,
}: Props) {
  const dict = useDictionary();
  const t = dict.companyOfferings.publishOnChain;
  const tg = t.gates;
  const tp = t.publication;

  const { connection, gateProvider, gateNetwork: networkGate, gateBalance: balanceGate, gateAuthorized: authorizedGate, gateOwnership: ownershipGate } =
    usePublishOnChainGates(linkedWallet);
  const hook = usePublishOfferingOnChain();

  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<DataToken>({
    name: `${companyName} ${t.form.defaultNameSuffix}`.trim(),
    symbol: (companyName.replace(/[^A-Za-z]/g, "").slice(0, 6) || "TOKEN").toUpperCase(),
    series: `${currentYear}-A`,
  });
  const [accepted, setAccepted] = useState(false);

  // Reconciliation when (re)opening the screen: if there was already a pending attempt from a
  // previous visit (e.g. closed the tab right after signing), checks it again against the chain
  // without requiring a click. Runs a single time per page load.
  const [reconciled, setReconciled] = useState<ConfirmPublicationState | null>(null);
  // The initial value already reflects whether we'll check on mount — avoids calling the setter
  // synchronously inside the effect below (the effect only needs to turn it off when done).
  const [verifying, setVerifying] = useState(syncStatus === "pendente");
  useEffect(() => {
    if (syncStatus === "pendente") {
      confirmPublication(offeringId)
        .then(setReconciled)
        .finally(() => setVerifying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyAgain() {
    setVerifying(true);
    const result = await confirmPublication(offeringId);
    setReconciled(result);
    setVerifying(false);
  }

  // Sub-step 5 (continuous reconciliation, see onchain-actions.ts): runs when (re)opening the
  // screen whenever there's already a contract_address to compare — a confirmed offering (routine
  // check) or a divergent one with an address already stored (a previous drift, possibly already
  // fixed in Supabase since the last visit). Never runs for 'pendente'/'divergente' without an
  // address — those have no contract to read yet, and are still resolved by
  // confirmPublication()/"Reprocess" above.
  const shouldVerifyConsistency = syncStatus === "confirmada" || (syncStatus === "divergente" && Boolean(contractAddress));
  const [consistency, setConsistency] = useState<CheckConsistencyState | null>(null);
  const [verifyingConsistency, setVerifyingConsistency] = useState(shouldVerifyConsistency);
  useEffect(() => {
    if (shouldVerifyConsistency) {
      checkConsistency(offeringId)
        .then(setConsistency)
        .finally(() => setVerifyingConsistency(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyConsistencyAgain() {
    setVerifyingConsistency(true);
    const result = await checkConsistency(offeringId);
    setConsistency(result);
    setVerifyingConsistency(false);
  }

  // Display priority: an action in progress in this session (hook) > reconciliation of a pending
  // publication (reconciled) > consistency check (consistency) > persisted state the page already
  // loaded (props).
  const displayStatus: string =
    hook.status !== "idle"
      ? hook.status
      : reconciled
        ? reconciled.status === "error"
          ? "error"
          : reconciled.status
        : consistency
          ? consistency.status === "error"
            ? "error"
            : consistency.status
          : syncStatus === "pendente"
            ? "pendente"
            : syncStatus === "confirmada"
              ? "confirmada"
              : syncStatus === "divergente"
                ? "divergente"
                : "idle";

  const displayTxHash = hook.txHash ?? txHash;
  const displayContract = hook.contractAddress ?? contractAddress ?? (reconciled?.status === "confirmada" ? reconciled.contractAddress : null);
  const displayToken = hook.tokenAddress ?? tokenAddress ?? (reconciled?.status === "confirmada" ? reconciled.tokenAddress : null);
  const displayError =
    hook.errorMessage ??
    onchainLastError ??
    (reconciled && "reason" in reconciled ? reconciled.reason : null) ??
    (reconciled?.status === "error" ? reconciled.message : null) ??
    (consistency && "reason" in consistency ? consistency.reason : null) ??
    (consistency?.status === "error" ? consistency.message : null);
  // Tells apart the two possible causes of 'divergente' (see onchain-actions.ts): with an address
  // already stored, it's consistency drift (recoverable by checkConsistency, without touching any
  // transaction); without an address, it's a confirmPublication failure that never got to confirm
  // (recoverable only by "Reprocess").
  const divergentIsConsistencyDrift = Boolean(displayContract);

  // ── Gate 1 — MetaMask detectada ────────────────────────────────────────────────────────
  const rowProvider: GateRow = {
    id: "provider",
    label: tg.provider.label,
    status: gateProvider.status,
    detail: gateProvider.status === "rejected" ? tg.provider.rejected : null,
  };

  // ── Gate 2 — Sepolia network ────────────────────────────────────────────────────────────
  let networkDetail: string | null = null;
  if (networkGate.status === "rejected") {
    networkDetail = networkGate.reason === "nao_conectado" ? tg.network.notConnected : tg.network.wrongNetwork(networkGate.connectedChainId);
  }
  const rowNetwork: GateRow = { id: "network", label: tg.network.label, status: networkGate.status, detail: networkDetail };

  // ── Gate 3 — saldo de ETH suficiente ───────────────────────────────────────────────────
  let balanceDetail: string | null = null;
  if (balanceGate.status === "loading") balanceDetail = tg.balance.loading;
  else if (balanceGate.status === "error") balanceDetail = tg.balance.error;
  else if (balanceGate.status === "rejected") {
    balanceDetail = tg.balance.rejected(formatEth(balanceGate.balanceWei), formatEth(balanceGate.estimatedCostWei));
  } else if (balanceGate.status === "ok") {
    balanceDetail = tg.balance.ok(formatEth(balanceGate.balanceWei), formatEth(balanceGate.estimatedCostWei));
  }
  const rowBalance: GateRow = { id: "balance", label: tg.balance.label, status: balanceGate.status, detail: balanceDetail };

  // ── Gate 4 — emissoresAutorizados on-chain ─────────────────────────────────────────────
  let authorizedStatus: GateRow["status"];
  let authorizedDetail: string | null = null;
  if (!connection.address) {
    authorizedStatus = "loading";
    authorizedDetail = tg.authorized.notConnected;
  } else if (authorizedGate.errorMessage) {
    authorizedStatus = "error";
    authorizedDetail = authorizedGate.errorMessage;
  } else if (authorizedGate.isLoading || authorizedGate.authorized === null) {
    authorizedStatus = "loading";
  } else if (authorizedGate.authorized === false) {
    authorizedStatus = "rejected";
    authorizedDetail = tg.authorized.rejected;
  } else {
    authorizedStatus = "ok";
  }
  const rowAuthorized: GateRow = { id: "authorized", label: tg.authorized.label, status: authorizedStatus, detail: authorizedDetail };

  // ── Gate 5 — connected wallet == issuers.wallet_address ────────────────────────────────
  let ownershipDetail: string | null = null;
  if (ownershipGate.status === "rejected") {
    if (ownershipGate.reason === "sem_carteira_vinculada") ownershipDetail = tg.ownership.noLinkedWallet;
    else if (ownershipGate.reason === "nao_conectado") ownershipDetail = tg.ownership.notConnected;
    else ownershipDetail = tg.ownership.different(ownershipGate.linkedWallet, ownershipGate.connectedWallet);
  }
  const rowOwnership: GateRow = {
    id: "ownership",
    label: tg.ownership.label,
    status: ownershipGate.status === "rejected" && ownershipGate.reason === "nao_conectado" ? "loading" : ownershipGate.status,
    detail: ownershipDetail,
  };

  // ── Gate 6 — publication terms (real from this step on) ────────────────────────────────
  const validData = data.name.trim().length > 0 && data.symbol.trim().length > 0 && data.series.trim().length > 0;
  const gate6Ok = accepted && validData;
  const rowTerm: GateRow = { id: "terms", label: tg.term.label, status: gate6Ok ? "ok" : "rejected", detail: gate6Ok ? null : tg.term.rejected };

  const rows: GateRow[] = [rowProvider, rowNetwork, rowBalance, rowAuthorized, rowOwnership, rowTerm];
  const pendingItems = rows.filter((r) => r.status !== "ok");
  const canEnable = pendingItems.length === 0 && displayStatus === "idle";

  async function handlePublish() {
    await hook.publish({
      offeringId,
      name: data.name.trim(),
      symbol: data.symbol.trim(),
      company: companyName,
      cnpjRef,
      series: data.series.trim(),
      minTargetWei: BigInt(targetMinCents) * UNIT_ON_CHAIN,
      maxTargetWei: BigInt(hardCapCents) * UNIT_ON_CHAIN,
      pricePerShareWei: BigInt(sharePriceCents) * UNIT_ON_CHAIN,
      windowDays,
    });
  }

  const inProgress = displayStatus === "signing" || displayStatus === "registering" || displayStatus === "confirming";

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.common.demo}</span> — {t.banner}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/empresa/ofertas" className="text-sm text-salmon hover:text-salmon-600">
          {t.back}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-military">{t.title}</h1>
        <p className="mt-1 text-sm text-on-military-muted">{t.subtitle}</p>

        {displayStatus === "confirmada" && (
          <div className="mt-6 rounded-lg border border-value-positive/40 bg-value-positive/10 p-4 text-sm text-on-military">
            <p className="font-medium">{tp.confirmedTitle}</p>
            <p className="mt-1 text-on-military-muted">{tp.confirmedText}</p>
            <dl className="mt-3 space-y-1">
              {displayContract && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tp.contractLabel}</dt>
                  <dd>
                    <a href={etherscanAddress(displayContract)} target="_blank" rel="noreferrer" className="font-mono text-xs text-salmon hover:text-salmon-600">
                      {displayContract}
                    </a>
                  </dd>
                </div>
              )}
              {displayToken && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tp.tokenLabel}</dt>
                  <dd>
                    <a href={etherscanAddress(displayToken)} target="_blank" rel="noreferrer" className="font-mono text-xs text-salmon hover:text-salmon-600">
                      {displayToken}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {displayTxHash && (
              <a href={etherscanTx(displayTxHash)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-salmon hover:text-salmon-600">
                {tp.viewOnEtherscan}
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={verifyConsistencyAgain}
                disabled={verifyingConsistency}
                className="flex items-center gap-2 rounded-md border border-panel-border px-3 py-1.5 text-sm text-on-military hover:text-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyingConsistency && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tp.verifyConsistency}
              </button>
              <p className="mt-1 text-xs text-on-military-muted">{tp.verifyConsistencyNote}</p>
            </div>
          </div>
        )}

        {displayStatus === "pendente" && (
          <div className="mt-6 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <p className="font-medium">{tp.pendingTitle}</p>
            <p className="mt-1 text-on-military-muted">{tp.pendingText}</p>
            {displayTxHash && (
              <a href={etherscanTx(displayTxHash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                {tp.viewOnEtherscan}
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={verifyAgain}
                disabled={verifying}
                className="flex items-center gap-2 rounded-md border border-panel-border px-3 py-1.5 text-sm text-on-military hover:text-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tp.verifyAgain}
              </button>
            </div>
          </div>
        )}

        {(displayStatus === "reverted" || displayStatus === "error") && displayError && (
          <div role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            {displayStatus === "reverted" && <p className="font-medium">{tp.revertedTitle}</p>}
            <p className="mt-1">{displayError}</p>
          </div>
        )}

        {displayStatus === "divergente" && (
          <div role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            <p className="font-medium">{tp.divergentTitle}</p>
            <p className="mt-1">{divergentIsConsistencyDrift ? tp.divergentConsistencyText : tp.divergentText}</p>
            {displayError && <p className="mt-1 text-xs">{displayError}</p>}
            {displayTxHash && (
              <a href={etherscanTx(displayTxHash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-value-negative underline">
                {tp.viewOnEtherscan}
              </a>
            )}
            {divergentIsConsistencyDrift ? (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={verifyConsistencyAgain}
                  disabled={verifyingConsistency}
                  className="flex items-center gap-2 rounded-md border border-value-negative/40 px-3 py-1.5 text-sm text-value-negative hover:bg-value-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyingConsistency && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {tp.verifyConsistency}
                </button>
                <p className="mt-1 text-xs text-on-military-muted">{tp.verifyConsistencyNote}</p>
              </div>
            ) : (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={verifyAgain}
                  disabled={verifying}
                  className="flex items-center gap-2 rounded-md border border-value-negative/40 px-3 py-1.5 text-sm text-value-negative hover:bg-value-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {tp.reprocess}
                </button>
                <p className="mt-1 text-xs text-on-military-muted">{tp.reprocessNote}</p>
              </div>
            )}
          </div>
        )}

        {inProgress && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {displayStatus === "signing" && tp.signing}
            {displayStatus === "registering" && tp.registering}
            {displayStatus === "confirming" && tp.confirming}
          </div>
        )}

        {(displayStatus === "idle" || displayStatus === "reverted" || displayStatus === "error") && (
          <>
            {!linkedWallet && (
              <div className="mt-6 rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
                <p className="font-medium">{t.noLinkedWallet.title}</p>
                <p className="mt-1 text-on-military-muted">{t.noLinkedWallet.text}</p>
                <Link href="/perfil#wallet" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                  {t.noLinkedWallet.link}
                </Link>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-panel-border bg-military p-4">
              <ConnectWallet />
            </div>

            <h2 className="mt-8 text-sm font-semibold text-on-military">{tg.title}</h2>
            <div className="mt-3">
              <GateChecklist rows={rows} />
            </div>

            <div className="mt-8">
              <PublicationTerms data={data} onDataChange={setData} accepted={accepted} onAcceptedChange={setAccepted} disabled={false} />
            </div>

            <div className="mt-8 flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canEnable}
                aria-disabled={!canEnable}
                aria-label={canEnable ? t.button.label : t.button.blockedAria}
                title={canEnable ? t.button.label : t.button.blockedAria}
                className={
                  canEnable
                    ? "rounded-md bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
                    : "cursor-not-allowed rounded-md bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon opacity-60"
                }
              >
                {t.button.label}
              </button>

              {!canEnable && (
                <div className="text-xs text-on-military-muted">
                  <p>{t.button.pendingItems}</p>
                  <ul className="mt-1 list-inside list-disc">
                    {pendingItems.map((p) => (
                      <li key={p.id}>{p.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
