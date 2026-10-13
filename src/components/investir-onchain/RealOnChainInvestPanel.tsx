"use client";

// Real investment panel on Sepolia — extracted from OnChainInvestPage.tsx so it can also be
// reused inside the detail page of the unified SME offerings (OfertaDetailPage.tsx, see
// CLAUDE.md "/negociar screens").
//
// Since Phase 4 (sub-step 5.2): it receives the offering's address pair directly
// (`tokenAddress`/`offeringAddress`), no longer an `offeringIndex` in a fixed list — the offering
// can come either from the legacy list (`NEXT_PUBLIC_OFERTAS_ONCHAIN`) or from Supabase
// (self-service offerings already confirmed, `loadConfirmedOnChainOfferings`). This component
// doesn't know, nor needs to know, the source.
//
// The caller is responsible for remounting this component when switching offerings
// (`key={...}`, unique per offering) — that resets all local state for free (quantity, status of
// invest/close/redeem, the faucet field), with no manual resets needed.
//
// `isPartner` (resolved on the server via resolveSocio()) and `isIssuer` (resolved on the server
// by comparing resolveAccount() against the offering's issuer_id — only possible for self-service
// offerings, which have that link in Supabase; always `false` for the 10 legacy ones, which have
// no issuer account at all in this app) together only decide the "Close offering" BUTTON in this
// interface — the OfertaCaptacao.encerrar() contract stays truly permissionless (any wallet could
// call it via Etherscan/another dApp, whenever the offering is eligible); it's a PRODUCT
// restriction, not a change to the on-chain rule, and deliberately the other way around: the
// contract is permissionless precisely so that no investor is held hostage by the platform or the
// company to get their investment back from a fundraising that didn't close — this screen only
// decides who sees a convenient shortcut for that, never who CAN. Neither prop should be used to
// decide whether to show/hide the rest of the panel.
import { useMemo, useState, type ChangeEvent } from "react";
import { useConnection } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AlertTriangle, CheckCircle2, Coins } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import {
  useMyOnChainPosition,
  useOnChainOfferingTerms,
  type OfferingState,
} from "@/lib/web3/hooks/useOfertaOnChain";
import type { OnChainOfferingAddresses } from "@/lib/web3/contracts";
import {
  useCloseOffering,
  useInvestOnChain,
  useReleaseToIssuer,
  useMintMockBrl,
  useRedeemShares,
} from "@/lib/web3/hooks/useOnChainActions";
import { formatDeadline, formatToken } from "@/lib/web3/format";
import { useDictionary } from "@/lib/i18n/client";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-panel-border bg-panel p-6">
      <h2 className="text-lg font-semibold text-on-military">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FaucetCard({
  addresses,
  mockBrlBalance,
  mockBrlDecimals,
  mockBrlSymbol,
  disabled,
  onMinted,
}: {
  addresses: OnChainOfferingAddresses | null;
  mockBrlBalance: bigint;
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  disabled: boolean;
  onMinted: () => void;
}) {
  const dict = useDictionary();
  const t = dict.investOnChain.faucet;
  const [quantity, setQuantity] = useState("100");
  const { status, errorMessage, mint } = useMintMockBrl(addresses);

  const isBusy = status === "signing" || status === "confirming";

  async function handleMint() {
    const parsed = Number(quantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await mint(BigInt(Math.round(parsed)) * BigInt(10) ** BigInt(mockBrlDecimals));
    onMinted();
  }

  return (
    <Card title={t.title}>
      <p className="text-sm text-on-military-muted">{t.description}</p>

      <dl className="mt-4 flex items-center justify-between gap-4 text-sm">
        <dt className="text-on-military-muted">{t.balanceLabel}</dt>
        <dd className="font-mono text-on-military">
          {formatToken(mockBrlBalance, mockBrlDecimals, mockBrlSymbol)}
        </dd>
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-on-military-muted">{t.quantityLabel}</span>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantity(event.target.value)}
            className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
          />
        </label>
        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={handleMint}
          className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Coins className="h-4 w-4" aria-hidden="true" />
          {status === "signing" ? t.signing : status === "confirming" ? t.confirming : t.button}
        </button>
      </div>

      {status === "success" && (
        <p role="status" className="mt-3 text-sm text-value-positive">
          {t.success}
        </p>
      )}
      {status === "error" && errorMessage && (
        <p role="alert" className="mt-3 text-sm text-value-negative">
          {errorMessage}
        </p>
      )}
    </Card>
  );
}

export function RealOnChainInvestPanel({
  tokenAddress,
  offeringAddress,
  isPartner = false,
  isIssuer = false,
}: {
  tokenAddress: `0x${string}`;
  offeringAddress: `0x${string}`;
  isPartner?: boolean;
  isIssuer?: boolean;
}) {
  const dict = useDictionary();
  const t = dict.investOnChain;
  const connection = useConnection();
  const isOnSepolia = connection.chainId === sepolia.id;
  const canOperate = connection.isConnected && isOnSepolia;

  // Stable reference (the same object across renders while the addresses don't change) — avoids
  // recreating the 6 hooks/callbacks below on every render just because of a new object.
  const addresses = useMemo(() => ({ token: tokenAddress, offering: offeringAddress }), [tokenAddress, offeringAddress]);

  const terms = useOnChainOfferingTerms(addresses);
  const position = useMyOnChainPosition(addresses);

  const [shareQuantity, setShareQuantity] = useState("1");
  const invest = useInvestOnChain(addresses);
  const closeAction = useCloseOffering(addresses);
  const redeem = useRedeemShares(addresses);
  const release = useReleaseToIssuer(addresses);

  const quantityBigInt = useMemo(() => {
    const parsed = shareQuantity.trim();
    if (!/^\d+$/.test(parsed)) return BigInt(0);
    try {
      return BigInt(parsed);
    } catch {
      return BigInt(0);
    }
  }, [shareQuantity]);

  const investmentValue = quantityBigInt * terms.pricePerShare;
  const remainingCapacity = terms.maxTarget - terms.totalRaised;
  const remainingInvestorCap = terms.capPerInvestor - position.invested;

  const exceedsCapacity = investmentValue > remainingCapacity;
  const exceedsCap = investmentValue > remainingInvestorCap;
  const insufficientBalance = investmentValue > position.mockBrlBalance;
  const invalidValue = investmentValue <= BigInt(0);

  // Strict gate: never decide with an unreliable read. While `terms`/`position` haven't finished
  // successfully, the fields above (remainingCapacity, insufficientBalance etc.) may be computed
  // from the fallback value 0 — a real incident (see CLAUDE.md): a metaMaxima=0 from a failed
  // read once showed up as "zero capacity" (false), and a stale/unconfirmed allowanceMockBrl once
  // made the flow skip the approve by mistake.
  const readsReady = terms.ready && position.ready;

  const investDisabled =
    !canOperate ||
    !readsReady ||
    terms.state !== "Aberta" ||
    invalidValue ||
    exceedsCapacity ||
    exceedsCap ||
    insufficientBalance ||
    (invest.status !== "idle" && invest.status !== "success" && invest.status !== "error");

  async function handleInvest() {
    // invest.invest() no longer receives an allowance from outside — it reads it straight from the
    // chain at the moment it runs, so it never decides to skip the approve with a stale value (see
    // useOnChainActions.ts).
    await invest.invest(investmentValue);
    terms.refetch();
    position.refetch();
  }

  async function handleClose() {
    await closeAction.close();
    terms.refetch();
  }

  async function handleRedeem() {
    await redeem.redeem();
    terms.refetch();
    position.refetch();
  }

  async function handleRelease() {
    await release.release();
    terms.refetch();
  }

  const BPS_DENOMINATOR = BigInt(10_000);
  const feeWei = (terms.totalRaised * terms.feeBps) / BPS_DENOMINATOR;
  const issuerValueWei = terms.totalRaised - feeWei;

  if (!terms.configured) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
        <p>{t.contractNotConfigured}</p>
      </div>
    );
  }

  const stateLabel: Record<OfferingState, string> = t.terms.states;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
        {t.realNotice}
      </p>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <h2 className="text-sm font-semibold text-on-military">{t.requirements.title}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {t.requirements.items.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-on-military-muted">
              <span aria-hidden="true">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <ConnectWallet />
      </div>

      <Card title={t.terms.title}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.stateLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {terms.state ? stateLabel[terms.state] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.totalRaised}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(terms.totalRaised, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.minTarget}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(terms.minTarget, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.maxTarget}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(terms.maxTarget, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.pricePerShare}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(terms.pricePerShare, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.terms.capPerInvestor}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(terms.capPerInvestor, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-on-military-muted">{t.terms.deadline}</dt>
            <dd className="mt-0.5 text-sm text-on-military">{formatDeadline(terms.deadline)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-on-military-muted">{t.terms.feeLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {terms.feeBps === BigInt(0)
                ? t.terms.feeWithoutFee
                : t.terms.feeWithFee((Number(terms.feeBps) / 100).toFixed(2))}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-on-military-muted">{t.terms.note}</p>
      </Card>

      {!connection.isConnected && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {t.noWallet}
        </p>
      )}

      {canOperate && (
        <FaucetCard
          addresses={addresses}
          mockBrlBalance={position.mockBrlBalance}
          mockBrlDecimals={terms.mockBrlDecimals}
          mockBrlSymbol={terms.mockBrlSymbol}
          disabled={!canOperate}
          onMinted={() => position.refetch()}
        />
      )}

      {canOperate && readsReady && terms.state !== null && terms.state !== "Aberta" && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {terms.state === "EncerradaSucesso" ? t.invest.offeringClosedSuccess : t.invest.offeringClosedFailure}
        </p>
      )}

      {canOperate && (!readsReady || terms.state === "Aberta") && (
        <Card title={t.invest.title}>
          {!readsReady ? (
            <p className={terms.errorMessage || position.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
              {terms.errorMessage || position.errorMessage
                ? t.invest.readError((terms.errorMessage ?? position.errorMessage) as string)
                : t.invest.loading}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-on-military-muted">{t.invest.quantityLabel}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={shareQuantity}
                    onChange={(event) => setShareQuantity(event.target.value)}
                    className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
                  />
                </label>
                <div className="text-sm text-on-military-muted">
                  {t.invest.valueLabel}:{" "}
                  <span className="font-mono text-on-military">
                    {formatToken(investmentValue, terms.mockBrlDecimals, terms.mockBrlSymbol)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-on-military-muted">{t.invest.allowanceNote}</p>

              {invalidValue && shareQuantity !== "" && (
                <p className="mt-2 text-sm text-value-negative">{t.invest.invalidQuantity}</p>
              )}
              {!invalidValue && exceedsCapacity && (
                <p className="mt-2 text-sm text-value-negative">
                  {t.invest.exceedsCapacity(formatToken(remainingCapacity, terms.mockBrlDecimals, terms.mockBrlSymbol))}
                </p>
              )}
              {!invalidValue && !exceedsCapacity && exceedsCap && (
                <p className="mt-2 text-sm text-value-negative">
                  {t.invest.exceedsCap(formatToken(remainingInvestorCap, terms.mockBrlDecimals, terms.mockBrlSymbol))}
                </p>
              )}
              {!invalidValue && insufficientBalance && (
                <p className="mt-2 text-sm text-value-negative">{t.invest.insufficientBalance}</p>
              )}

              <button
                type="button"
                disabled={investDisabled}
                onClick={handleInvest}
                className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {invest.status === "idle" || invest.status === "success" || invest.status === "error"
                  ? t.invest.button
                  : t.invest.status[invest.status]}
              </button>

              {invest.status === "success" && (
                <p role="status" className="mt-3 flex items-center gap-2 text-sm text-value-positive">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {t.invest.status.success}
                </p>
              )}
              {invest.status === "error" && invest.errorMessage && (
                <p role="alert" className="mt-3 text-sm text-value-negative">
                  {invest.errorMessage}
                </p>
              )}
            </>
          )}
        </Card>
      )}

      {canOperate && (
        <Card title={t.position.title}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.invested}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {formatToken(position.invested, terms.mockBrlDecimals, terms.mockBrlSymbol)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.participationBalance}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {formatToken(
                  position.participationTokenBalance,
                  terms.participationTokenDecimals,
                  terms.participationTokenSymbol,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.alreadyRedeemed}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{position.alreadyRedeemedShares ? dict.common.yes : dict.common.no}</dd>
            </div>
          </dl>
        </Card>
      )}

      {canOperate && terms.state === "Aberta" && (
        <Card title={t.close.title}>
          <p className="text-sm text-on-military-muted">{t.close.description}</p>
          <button
            type="button"
            disabled={!(isPartner || isIssuer) || closeAction.status === "signing" || closeAction.status === "confirming"}
            onClick={handleClose}
            className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            {closeAction.status === "signing"
              ? t.close.signing
              : closeAction.status === "confirming"
                ? t.close.confirming
                : t.close.button}
          </button>
          {!(isPartner || isIssuer) && <p className="mt-3 text-xs text-on-military-muted">{t.close.restricted}</p>}
          {closeAction.status === "success" && (
            <p role="status" className="mt-3 text-sm text-value-positive">
              {t.close.success}
            </p>
          )}
          {closeAction.status === "error" && closeAction.errorMessage && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {closeAction.errorMessage}
            </p>
          )}
        </Card>
      )}

      {canOperate &&
        terms.state === "EncerradaSucesso" &&
        !position.alreadyRedeemedShares &&
        position.invested > BigInt(0) && (
        <Card title={t.redeem.title}>
          <p className="text-sm text-on-military-muted">{t.redeem.description}</p>
          <button
            type="button"
            disabled={redeem.status === "signing" || redeem.status === "confirming"}
            onClick={handleRedeem}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {redeem.status === "signing"
              ? t.redeem.signing
              : redeem.status === "confirming"
                ? t.redeem.confirming
                : t.redeem.button}
          </button>
          {redeem.status === "success" && (
            <p role="status" className="mt-3 text-sm text-value-positive">
              {t.redeem.success}
            </p>
          )}
          {redeem.status === "error" && redeem.errorMessage && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {redeem.errorMessage}
            </p>
          )}
        </Card>
      )}

      {canOperate && terms.state === "EncerradaSucesso" && (
        <Card title={t.release.title}>
          <p className="text-sm text-on-military-muted">{t.release.description}</p>
          {!terms.fundsReleased && (
            <p className="mt-2 text-sm text-on-military">
              {t.release.preview(
                formatToken(issuerValueWei, terms.mockBrlDecimals, terms.mockBrlSymbol),
                formatToken(feeWei, terms.mockBrlDecimals, terms.mockBrlSymbol),
              )}
            </p>
          )}
          {terms.fundsReleased ? (
            <p className="mt-4 text-sm text-value-positive">{t.release.alreadyReleased}</p>
          ) : (
            <>
              <button
                type="button"
                disabled={!isPartner || release.status === "signing" || release.status === "confirming"}
                onClick={handleRelease}
                className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {release.status === "signing"
                  ? t.release.signing
                  : release.status === "confirming"
                    ? t.release.confirming
                    : t.release.button}
              </button>
              {!isPartner && <p className="mt-3 text-xs text-on-military-muted">{t.release.restricted}</p>}
              {release.status === "success" && (
                <p role="status" className="mt-3 text-sm text-value-positive">
                  {t.release.success}
                </p>
              )}
              {release.status === "error" && release.errorMessage && (
                <p role="alert" className="mt-3 text-sm text-value-negative">
                  {release.errorMessage}
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
