"use client";

// Real investment panel on Solana devnet — the counterpart of RealOnChainInvestPanel.tsx
// (Sepolia), against the `niara-pmes-solana` program (niaragaed/niara-pmes-solana). Same offering
// rules (CVM Res. 88), same cycle: MockBRL faucet → invest → close → redeem shares (or a refund,
// if the fundraising fails) → release to the issuer.
//
// Mechanical differences (not rule differences) from Sepolia:
//   - There's no `approve`: the investment is an SPL transfer signed by the investor themselves
//     inside the `aportar` instruction — a single signature.
//   - Redeemed shares sit in a token account FROZEN by the program (non-transferable), the
//     equivalent of the EVM's DenyAllTransferPolicy.
//   - The refund of a fundraising that didn't reach the minimum target is exposed here (on Sepolia
//     the contract has the function, but the screen doesn't yet).
//
// Same product rule as the Sepolia panel for the "Close" (partners or the issuing company) and
// "Release funds" (partners only) buttons: in the program both instructions are permissionless;
// the restriction is interface-only. The caller remounts this component when switching offerings
// (`key`).
import { useMemo, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Coins, ExternalLink } from "lucide-react";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { useSolanaWallet } from "@/lib/solana/phantom";
import { useSolanaOffering } from "@/lib/solana/hooks/useOfertaSolana";
import { useSolanaAction, type SolanaActionStatus } from "@/lib/solana/hooks/useAcaoSolana";
import { txInvest, txClose, txFaucet, txRelease, txRefund, txRedeem } from "@/lib/solana/instrucoes";
import { DECIMALS_MBRL_SOLANA, FAUCET_MAX_MBRL_SOLANA, UNIT_MBRL_SOLANA, solanaExplorerAccountLink, linkExplorerSolanaTx } from "@/lib/solana/config";
import { formatDeadline, formatToken } from "@/lib/web3/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { useDictionary } from "@/lib/i18n/client";

const MBRL = "mBRL";

/** A clock in seconds, rounded to 15 s (a stable snapshot across renders; 0 on the server). */
function useNow(): number {
  return useSyncExternalStore(
    (cb) => {
      const id = setInterval(cb, 15_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 15_000) * 15,
    () => 0,
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-panel-border bg-panel p-6">
      <h2 className="text-lg font-semibold text-on-military">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function fmt(value: bigint) {
  return formatToken(value, DECIMALS_MBRL_SOLANA, MBRL);
}

function Return({ status, errorMessage, signature, success }: { status: SolanaActionStatus; errorMessage: string | null; signature: string | null; success: string }) {
  const dict = useDictionary();
  const t = dict.solana.invest;
  return (
    <>
      {status === "success" && (
        <p role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-value-positive">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {success}
          {signature && (
            <a href={linkExplorerSolanaTx(signature)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-salmon hover:text-salmon-600">
              {t.viewOnExplorer}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </p>
      )}
      {status === "error" && errorMessage && (
        <p role="alert" className="mt-3 text-sm text-value-negative">
          {errorMessage}
        </p>
      )}
    </>
  );
}

function buttonLabel(dict: Dictionary, status: SolanaActionStatus, defaultLabel: string) {
  const t = dict.solana.invest;
  if (status === "signing") return t.signing;
  if (status === "confirming") return t.confirming;
  return defaultLabel;
}

export function SolanaInvestPanel({
  offeringAddress,
  isPartner = false,
  isIssuer = false,
}: {
  offeringAddress: string;
  isPartner?: boolean;
  isIssuer?: boolean;
}) {
  const dict = useDictionary();
  const t = dict.investOnChain;
  const ts = dict.solana.invest;
  const wallet = useSolanaWallet();
  const investor = wallet.address;
  const offeringRead = useSolanaOffering(offeringAddress, investor);
  const { offering, position } = offeringRead;

  const faucet = useSolanaAction();
  const investAction = useSolanaAction();
  const closeAction = useSolanaAction();
  const redeemAction = useSolanaAction();
  const refundAction = useSolanaAction();
  const releaseAction = useSolanaAction();

  const now = useNow();
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [shareCount, setShareCount] = useState("1");

  const zero = BigInt(0);
  const quantity = useMemo(() => (/^\d+$/.test(shareCount.trim()) ? BigInt(shareCount.trim()) : zero), [shareCount, zero]);

  if (offeringRead.nonexistent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
        <p>{ts.nonexistentOffering}</p>
      </div>
    );
  }

  const connected = Boolean(investor);
  const ready = offeringRead.ready && offering !== null;

  const price = offering?.pricePerShare ?? zero;
  const investmentAmount = quantity * price;
  const remainingCapacity = offering ? offering.maxTarget - offering.totalRaised : zero;
  const remainingCap = offering ? offering.capPerInvestor - position.invested : zero;
  const invalidAmount = investmentAmount <= zero;
  const exceedsCapacity = investmentAmount > remainingCapacity;
  const exceedsCap = investmentAmount > remainingCap;
  const insufficientBalance = investmentAmount > offeringRead.mbrlBalance;
  const deadlinePassed = offering && now > 0 ? now > offering.deadline : false;

  const isOpen = offering?.state === "Aberta";
  const canCloseNow = Boolean(offering && isOpen && (deadlinePassed || offering.totalRaised === offering.maxTarget));

  const investDisabled =
    !connected || !ready || !isOpen || Boolean(offering?.paused) || deadlinePassed || invalidAmount || exceedsCapacity || insufficientBalance || investAction.busy;

  async function handleFaucet() {
    if (!investor) return;
    const n = Number(faucetAmount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > FAUCET_MAX_MBRL_SOLANA) return;
    await faucet.execute((c) => txFaucet(c, investor, BigInt(Math.round(n)) * UNIT_MBRL_SOLANA));
    offeringRead.refetch();
  }

  async function handleInvest() {
    if (!investor || !offering) return;
    await investAction.execute((c) => txInvest(c, investor, offering, investmentAmount));
    offeringRead.refetch();
  }

  async function handleClose() {
    if (!offering) return;
    await closeAction.execute((c) => txClose(c, offering));
    offeringRead.refetch();
  }

  async function handleRedeem() {
    if (!investor || !offering) return;
    await redeemAction.execute((c) => txRedeem(c, investor, offering));
    offeringRead.refetch();
  }

  async function handleRefund() {
    if (!investor || !offering) return;
    await refundAction.execute((c) => txRefund(c, investor, offering));
    offeringRead.refetch();
  }

  async function handleRelease() {
    if (!investor || !offering) return;
    await releaseAction.execute((c) => txRelease(c, investor, offering));
    offeringRead.refetch();
  }

  const fee = offering ? (offering.totalRaised * BigInt(offering.feeBps)) / BigInt(10_000) : zero;
  const issuerAmount = offering ? offering.totalRaised - fee : zero;
  const sharesToRedeem = offering && price > zero ? position.invested / price : zero;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
        {ts.realNotice}
      </p>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <h2 className="text-sm font-semibold text-on-military">{t.requirements.title}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {ts.requirements.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-on-military-muted">
              <span aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <ConnectPhantom />
      </div>

      <Card title={ts.termsTitle}>
        {!offering ? (
          <p className={offeringRead.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
            {offeringRead.errorMessage ? t.invest.readError(offeringRead.errorMessage) : t.invest.loading}
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.stateLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {t.terms.states[offering.state]}
                  {offering.paused && isOpen ? ` — ${ts.paused}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.totalRaised}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(offering.totalRaised)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.minTarget}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(offering.minTarget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.maxTarget}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(offering.maxTarget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.pricePerShare}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(offering.pricePerShare)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.capPerInvestor}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(offering.capPerInvestor)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.terms.deadline}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{formatDeadline(BigInt(offering.deadline))}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.terms.feeLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {offering.feeBps === 0 ? ts.noFee : t.terms.feeWithFee((offering.feeBps / 100).toFixed(2))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{ts.offeringAccount}</dt>
                <dd className="mt-0.5 break-all text-sm">
                  <a href={solanaExplorerAccountLink(offering.address)} target="_blank" rel="noreferrer" className="font-mono text-xs text-salmon hover:text-salmon-600">
                    {offering.address}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-on-military-muted">{t.terms.note}</p>
          </>
        )}
      </Card>

      {!connected && <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">{ts.noWallet}</p>}

      {connected && (
        <Card title={ts.faucet.title}>
          <p className="text-sm text-on-military-muted">{ts.faucet.description}</p>
          <dl className="mt-4 flex items-center justify-between gap-4 text-sm">
            <dt className="text-on-military-muted">{t.faucet.balanceLabel}</dt>
            <dd className="font-mono text-on-military">{fmt(offeringRead.mbrlBalance)}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-on-military-muted">{t.faucet.quantityLabel}</span>
              <input
                type="text"
                inputMode="decimal"
                value={faucetAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFaucetAmount(e.target.value)}
                className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
              />
            </label>
            <button
              type="button"
              disabled={faucet.busy}
              onClick={handleFaucet}
              className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Coins className="h-4 w-4" aria-hidden="true" />
              {buttonLabel(dict, faucet.status, t.faucet.button)}
            </button>
          </div>
          <Return {...faucet} success={t.faucet.success} />
        </Card>
      )}

      {connected && ready && offering && !isOpen && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {offering.state === "EncerradaSucesso" ? t.invest.offeringClosedSuccess : ts.offeringClosedFailure}
        </p>
      )}

      {connected && (!ready || isOpen) && (
        <Card title={t.invest.title}>
          {!ready ? (
            <p className={offeringRead.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
              {offeringRead.errorMessage ? t.invest.readError(offeringRead.errorMessage) : t.invest.loading}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-on-military-muted">{t.invest.quantityLabel}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={shareCount}
                    onChange={(e) => setShareCount(e.target.value)}
                    className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
                  />
                </label>
                <div className="text-sm text-on-military-muted">
                  {t.invest.valueLabel}: <span className="font-mono text-on-military">{fmt(investmentAmount)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-on-military-muted">{ts.noApprove}</p>

              {invalidAmount && shareCount !== "" && <p className="mt-2 text-sm text-value-negative">{ts.invalidQuantity}</p>}
              {!invalidAmount && exceedsCapacity && <p className="mt-2 text-sm text-value-negative">{ts.exceedsCapacity(fmt(remainingCapacity))}</p>}
              {!invalidAmount && !exceedsCapacity && exceedsCap && (
                <p className="mt-2 text-sm text-value-negative">{ts.exceedsCap(fmt(remainingCap < zero ? zero : remainingCap))}</p>
              )}
              {!invalidAmount && insufficientBalance && <p className="mt-2 text-sm text-value-negative">{ts.insufficientBalance}</p>}
              {deadlinePassed && <p className="mt-2 text-sm text-value-negative">{ts.deadlinePassed}</p>}
              {offering?.paused && <p className="mt-2 text-sm text-value-negative">{ts.pausedText}</p>}

              <button
                type="button"
                disabled={investDisabled}
                onClick={handleInvest}
                className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buttonLabel(dict, investAction.status, t.invest.button)}
              </button>
              <Return {...investAction} success={t.invest.status.success} />
            </>
          )}
        </Card>
      )}

      {connected && offering && (
        <Card title={t.position.title}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.invested}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{fmt(position.invested)}</dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.participationBalance}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {offeringRead.shareBalance.toString()} {offering.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.alreadyRedeemed}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{position.sharesRedeemed ? dict.common.yes : dict.common.no}</dd>
            </div>
            {position.refunded && (
              <div>
                <dt className="text-xs text-on-military-muted">{ts.refundedLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{dict.common.yes}</dd>
              </div>
            )}
          </dl>
          {position.sharesRedeemed && <p className="mt-3 text-xs text-on-military-muted">{ts.sharesFrozen}</p>}
        </Card>
      )}

      {connected && offering && isOpen && (
        <Card title={t.close.title}>
          <p className="text-sm text-on-military-muted">{ts.closeDescription}</p>
          <button
            type="button"
            disabled={!(isPartner || isIssuer) || !canCloseNow || closeAction.busy}
            onClick={handleClose}
            className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(dict, closeAction.status, t.close.button)}
          </button>
          {!(isPartner || isIssuer) && <p className="mt-3 text-xs text-on-military-muted">{t.close.restricted}</p>}
          {(isPartner || isIssuer) && !canCloseNow && <p className="mt-3 text-xs text-on-military-muted">{ts.closeNotYet}</p>}
          <Return {...closeAction} success={t.close.success} />
        </Card>
      )}

      {connected && offering?.state === "EncerradaSucesso" && !position.sharesRedeemed && position.invested > zero && (
        <Card title={t.redeem.title}>
          <p className="text-sm text-on-military-muted">{ts.redeemDescription(sharesToRedeem.toString(), offering.symbol)}</p>
          <button
            type="button"
            disabled={redeemAction.busy}
            onClick={handleRedeem}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(dict, redeemAction.status, t.redeem.button)}
          </button>
          <Return {...redeemAction} success={t.redeem.success} />
        </Card>
      )}

      {connected && offering?.state === "EncerradaFalha" && !position.refunded && position.invested > zero && (
        <Card title={ts.refund.title}>
          <p className="text-sm text-on-military-muted">{ts.refund.description(fmt(position.invested))}</p>
          <button
            type="button"
            disabled={refundAction.busy}
            onClick={handleRefund}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(dict, refundAction.status, ts.refund.button)}
          </button>
          <Return {...refundAction} success={ts.refund.success} />
        </Card>
      )}

      {connected && offering?.state === "EncerradaSucesso" && (
        <Card title={t.release.title}>
          <p className="text-sm text-on-military-muted">{ts.releaseDescription}</p>
          {!offering.fundsReleased && <p className="mt-2 text-sm text-on-military">{t.release.preview(fmt(issuerAmount), fmt(fee))}</p>}
          {offering.fundsReleased ? (
            <p className="mt-4 text-sm text-value-positive">{t.release.alreadyReleased}</p>
          ) : (
            <>
              <button
                type="button"
                disabled={!isPartner || releaseAction.busy}
                onClick={handleRelease}
                className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buttonLabel(dict, releaseAction.status, t.release.button)}
              </button>
              {!isPartner && <p className="mt-3 text-xs text-on-military-muted">{t.release.restricted}</p>}
              <Return {...releaseAction} success={ts.releaseSuccess} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
