"use client";

// Self-service publication of the offering on Solana Devnet — the counterpart of
// PublicarOnChainPage.tsx (Sepolia), same design: 6 real gates (Phantom detected, connected, SOL
// balance, issuer authorized in the program, ownership, terms), the button only enabled when all
// are ok, and never "published" before the server's confirmation (confirmPublicationSolana)
// against the network itself.
//
// There's no "right network" gate: Phantom only signs and the site always sends through devnet
// (see src/lib/solana/phantom.ts).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { GateChecklist, type GateRow } from "./GateChecklist";
import { PublicationTerms, type DataToken } from "./TermoPublicacao";
import { useSolanaWallet } from "@/lib/solana/phantom";
import { solanaConnection, readSolanaIssuer } from "@/lib/solana/program";
import { usePublishSolanaOffering } from "@/lib/solana/hooks/usePublicarOfertaSolana";
import {
  MAX_COMPANY_SOLANA,
  MAX_NAME_SOLANA,
  MAX_SERIES_SOLANA,
  MAX_SYMBOL_SOLANA,
  UNIT_ON_CHAIN_SOLANA,
  solanaExplorerAccountLink,
  linkExplorerSolanaTx,
} from "@/lib/solana/config";
import {
  confirmPublicationSolana,
  verifyConsistencySolana,
} from "@/app/empresa/ofertas/solana-actions";
import type { ConfirmPublicationState, CheckConsistencyState } from "@/app/empresa/ofertas/onchain-actions";
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

const bytes = (text: string) => new TextEncoder().encode(text).length;

/** Cuts at the program's BYTE limit (UTF-8) without breaking a character in the middle. */
function cutBytes(text: string, max: number): string {
  let output = "";
  for (const ch of text) {
    if (bytes(output + ch) > max) break;
    output += ch;
  }
  return output.trim();
}

// Sizes of the accounts created by criar_oferta: Oferta (8 + INIT_SPACE = 410), SPL mint (82) and
// the escrow's SPL token account (165). A 30% margin, like the Sepolia gas gate.
const ACCOUNT_SIZES = [410, 82, 165];
const FEE_LAMPORTS = 10_000;
const LAMPORTS_PER_SOL = 1_000_000_000;

function sol(lamports: number) {
  return (lamports / LAMPORTS_PER_SOL).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function PublishSolanaPage({
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
  const ts = dict.solana.publish;
  const tg = ts.gates;
  const tp = t.publication;
  const tsp = ts.publication;

  const wallet = useSolanaWallet();
  const connection = useMemo(() => solanaConnection(), []);
  const hook = usePublishSolanaOffering();

  const company = cutBytes(companyName || "Empresa", MAX_COMPANY_SOLANA);
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<DataToken>({
    name: cutBytes(`${companyName} ${dict.companyOfferings.publishOnChain.form.defaultNameSuffix}`, MAX_NAME_SOLANA),
    symbol: (companyName.replace(/[^A-Za-z]/g, "").slice(0, 6) || "TOKEN").toUpperCase(),
    series: `${currentYear}-A`,
  });
  const [accepted, setAccepted] = useState(false);

  // ── leituras on-chain dos gates ─────────────────────────────────────────────────────────────
  const address = wallet.address;
  const balance = useQuery({
    queryKey: ["solana-publicar-saldo", address],
    enabled: Boolean(address),
    queryFn: async () => {
      const [lamports, ...rents] = await Promise.all([
        connection.getBalance(new PublicKey(address as string), "confirmed"),
        ...ACCOUNT_SIZES.map((n) => connection.getMinimumBalanceForRentExemption(n)),
      ]);
      const cost = Math.ceil((rents.reduce((a, b) => a + b, 0) + FEE_LAMPORTS) * 1.3);
      return { lamports, cost };
    },
    refetchInterval: 20_000,
  });
  const issuer = useQuery({
    queryKey: ["solana-publicar-emissor", address],
    enabled: Boolean(address),
    queryFn: () => readSolanaIssuer(connection, address as string),
    refetchInterval: 20_000,
  });

  // ── reconciliation when (re)opening the screen — same logic as Sepolia ─────────────────────────
  const [reconciled, setReconciled] = useState<ConfirmPublicationState | null>(null);
  const [verifying, setVerifying] = useState(syncStatus === "pendente");
  useEffect(() => {
    if (syncStatus === "pendente") {
      confirmPublicationSolana(offeringId)
        .then(setReconciled)
        .finally(() => setVerifying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function verifyAgain() {
    setVerifying(true);
    setReconciled(await confirmPublicationSolana(offeringId));
    setVerifying(false);
  }

  const shouldVerifyConsistency = syncStatus === "confirmada" || (syncStatus === "divergente" && Boolean(contractAddress));
  const [consistency, setConsistency] = useState<CheckConsistencyState | null>(null);
  const [verifyingConsistency, setVerifyingConsistency] = useState(shouldVerifyConsistency);
  useEffect(() => {
    if (shouldVerifyConsistency) {
      verifyConsistencySolana(offeringId)
        .then(setConsistency)
        .finally(() => setVerifyingConsistency(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function verifyConsistencyAgain() {
    setVerifyingConsistency(true);
    setConsistency(await verifyConsistencySolana(offeringId));
    setVerifyingConsistency(false);
  }

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
          : ["pendente", "confirmada", "divergente"].includes(syncStatus)
            ? syncStatus
            : "idle";

  const displayTx = hook.txHash ?? txHash;
  const displayContract = hook.contractAddress ?? contractAddress ?? (reconciled?.status === "confirmada" ? reconciled.contractAddress : null);
  const displayToken = hook.tokenAddress ?? tokenAddress ?? (reconciled?.status === "confirmada" ? reconciled.tokenAddress : null);
  const displayError =
    hook.errorMessage ??
    (reconciled && "reason" in reconciled ? reconciled.reason : null) ??
    (reconciled?.status === "error" ? reconciled.message : null) ??
    (consistency && "reason" in consistency ? consistency.reason : null) ??
    (consistency?.status === "error" ? consistency.message : null) ??
    onchainLastError;
  const divergentIsConsistencyDrift = Boolean(displayContract);

  // ── gates ───────────────────────────────────────────────────────────────────────────────────
  const rowProvider: GateRow = {
    id: "provider",
    label: tg.provider.label,
    status: !wallet.started ? "loading" : wallet.available ? "ok" : "rejected",
    detail: wallet.started && !wallet.available ? tg.provider.rejected : null,
  };
  const rowConnection: GateRow = {
    id: "connection",
    label: tg.connection.label,
    status: address ? "ok" : "rejected",
    detail: address ? null : tg.connection.rejected,
  };

  let rowBalance: GateRow;
  if (!address) rowBalance = { id: "balance", label: tg.balance.label, status: "loading", detail: null };
  else if (balance.isError) rowBalance = { id: "balance", label: tg.balance.label, status: "error", detail: tg.balance.error };
  else if (!balance.data) rowBalance = { id: "balance", label: tg.balance.label, status: "loading", detail: tg.balance.loading };
  else if (balance.data.lamports < balance.data.cost)
    rowBalance = { id: "balance", label: tg.balance.label, status: "rejected", detail: tg.balance.rejected(sol(balance.data.lamports), sol(balance.data.cost)) };
  else rowBalance = { id: "balance", label: tg.balance.label, status: "ok", detail: tg.balance.ok(sol(balance.data.lamports), sol(balance.data.cost)) };

  let rowAuthorized: GateRow;
  if (!address) rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "loading", detail: tg.authorized.notConnected };
  else if (issuer.isError) rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "error", detail: tg.authorized.error };
  else if (!issuer.isSuccess) rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "loading", detail: null };
  else if (!issuer.data?.authorized) rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "rejected", detail: tg.authorized.rejected };
  else if (issuer.data.openOffering) rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "rejected", detail: tg.authorized.openOffering };
  else rowAuthorized = { id: "authorized", label: tg.authorized.label, status: "ok", detail: null };

  let rowOwnership: GateRow;
  if (!linkedWallet) rowOwnership = { id: "ownership", label: tg.ownership.label, status: "rejected", detail: tg.ownership.noLinkedWallet };
  else if (!address) rowOwnership = { id: "ownership", label: tg.ownership.label, status: "loading", detail: tg.ownership.notConnected };
  else if (address !== linkedWallet)
    rowOwnership = { id: "ownership", label: tg.ownership.label, status: "rejected", detail: tg.ownership.different(truncate(linkedWallet), truncate(address)) };
  else rowOwnership = { id: "ownership", label: tg.ownership.label, status: "ok", detail: null };

  const name = data.name.trim();
  const symbol = data.symbol.trim();
  const series = data.series.trim();
  const validData =
    name.length > 0 &&
    symbol.length > 0 &&
    series.length > 0 &&
    bytes(name) <= MAX_NAME_SOLANA &&
    bytes(symbol) <= MAX_SYMBOL_SOLANA &&
    bytes(series) <= MAX_SERIES_SOLANA;
  const termOk = accepted && validData;
  const rowTerm: GateRow = {
    id: "terms",
    label: tg.term.label,
    status: termOk ? "ok" : "rejected",
    detail: termOk ? null : `${tg.term.rejected} ${tg.term.limits}`,
  };

  const rows = [rowProvider, rowConnection, rowBalance, rowAuthorized, rowOwnership, rowTerm];
  const pendingItems = rows.filter((r) => r.status !== "ok");
  const canEnable = pendingItems.length === 0 && (displayStatus === "idle" || displayStatus === "error" || displayStatus === "reverted");

  async function handlePublish() {
    await hook.publish({
      offeringId,
      name,
      symbol,
      company,
      cnpjRefHex: cnpjRef,
      series,
      minTarget: BigInt(targetMinCents) * UNIT_ON_CHAIN_SOLANA,
      maxTarget: BigInt(hardCapCents) * UNIT_ON_CHAIN_SOLANA,
      pricePerShare: BigInt(sharePriceCents) * UNIT_ON_CHAIN_SOLANA,
      windowDays,
    });
  }

  const inProgress = displayStatus === "signing" || displayStatus === "registering" || displayStatus === "confirming";
  const linkClassName = "font-mono text-xs text-salmon hover:text-salmon-600";

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.common.demo}</span> — {ts.banner}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/empresa/ofertas" className="text-sm text-salmon hover:text-salmon-600">
          {t.back}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-military">
          {t.title} <span className="text-base font-normal text-on-military-muted">· {dict.solana.networkName}</span>
        </h1>
        <p className="mt-1 text-sm text-on-military-muted">{ts.subtitle}</p>

        {displayStatus === "confirmada" && (
          <div className="mt-6 rounded-lg border border-value-positive/40 bg-value-positive/10 p-4 text-sm text-on-military">
            <p className="font-medium">{tsp.confirmedTitle}</p>
            <p className="mt-1 text-on-military-muted">{tsp.confirmedText}</p>
            <dl className="mt-3 space-y-1">
              {displayContract && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tsp.contractLabel}</dt>
                  <dd className="break-all">
                    <a href={solanaExplorerAccountLink(displayContract)} target="_blank" rel="noreferrer" className={linkClassName}>
                      {displayContract}
                    </a>
                  </dd>
                </div>
              )}
              {displayToken && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tsp.tokenLabel}</dt>
                  <dd className="break-all">
                    <a href={solanaExplorerAccountLink(displayToken)} target="_blank" rel="noreferrer" className={linkClassName}>
                      {displayToken}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-4">
              {displayTx && (
                <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="text-salmon hover:text-salmon-600">
                  {tsp.viewOnExplorer}
                </a>
              )}
              <Link href={`/negociar/oferta/${offeringId}`} className="text-salmon hover:text-salmon-600">
                {tsp.viewOffering}
              </Link>
            </div>
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
              <p className="mt-1 text-xs text-on-military-muted">{tsp.verifyConsistencyNote}</p>
            </div>
          </div>
        )}

        {displayStatus === "pendente" && (
          <div className="mt-6 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <p className="font-medium">{tp.pendingTitle}</p>
            <p className="mt-1 text-on-military-muted">{tsp.pendingText}</p>
            {displayTx && (
              <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                {tsp.viewOnExplorer}
              </a>
            )}
            {hook.errorMessage && <p className="mt-2 text-xs text-on-military-muted">{hook.errorMessage}</p>}
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
            {displayTx && (
              <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-value-negative underline">
                {tsp.viewOnExplorer}
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={divergentIsConsistencyDrift ? verifyConsistencyAgain : verifyAgain}
                disabled={divergentIsConsistencyDrift ? verifyingConsistency : verifying}
                className="flex items-center gap-2 rounded-md border border-value-negative/40 px-3 py-1.5 text-sm text-value-negative hover:bg-value-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(divergentIsConsistencyDrift ? verifyingConsistency : verifying) && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {divergentIsConsistencyDrift ? tp.verifyConsistency : tp.reprocess}
              </button>
              <p className="mt-1 text-xs text-on-military-muted">
                {divergentIsConsistencyDrift ? tsp.verifyConsistencyNote : tp.reprocessNote}
              </p>
            </div>
          </div>
        )}

        {inProgress && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {displayStatus === "signing" && tsp.signing}
            {displayStatus === "registering" && tsp.registering}
            {displayStatus === "confirming" && tsp.confirming}
          </div>
        )}

        {(displayStatus === "idle" || displayStatus === "reverted" || displayStatus === "error") && (
          <>
            {!linkedWallet && (
              <div className="mt-6 rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
                <p className="font-medium">{ts.noLinkedWallet.title}</p>
                <p className="mt-1 text-on-military-muted">{ts.noLinkedWallet.text}</p>
                <Link href="/perfil#solana-wallet" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                  {ts.noLinkedWallet.link}
                </Link>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-panel-border bg-military p-4">
              <ConnectPhantom />
            </div>

            <h2 className="mt-8 text-sm font-semibold text-on-military">{t.gates.title}</h2>
            <div className="mt-3">
              <GateChecklist rows={rows} />
            </div>

            <div className="mt-8">
              <PublicationTerms texts={ts} data={data} onDataChange={setData} accepted={accepted} onAcceptedChange={setAccepted} disabled={false} />
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
                {t.button.label} · {dict.solana.networkName}
              </button>
              {!canEnable && pendingItems.length > 0 && (
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
