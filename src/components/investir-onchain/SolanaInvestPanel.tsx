"use client";

// Painel de investimento real na Solana devnet — par do RealOnChainInvestPanel.tsx (Sepolia),
// contra o programa `niara-pmes-solana` (niaragaed/niara-pmes-solana). Mesmas regras da oferta
// (Res. CVM 88), mesmo ciclo: faucet de MockBRL → aportar → encerrar → resgatar cotas (ou
// reembolso, se a captação falhar) → liberar ao emissor.
//
// Diferenças de mecânica (não de regra) em relação à Sepolia:
//   - Não existe `approve`: o aporte é uma transferência SPL assinada pelo próprio investidor dentro
//     da instrução `aportar` — uma assinatura só.
//   - Cotas resgatadas ficam numa conta de token CONGELADA pelo programa (intransferíveis), o
//     equivalente da DenyAllTransferPolicy da EVM.
//   - Reembolso de captação que não atingiu a meta mínima está exposto aqui (na Sepolia o contrato
//     tem a função, mas a tela ainda não).
//
// Mesma regra de produto do painel da Sepolia para os botões "Encerrar" (sócios ou empresa
// emissora) e "Liberar recursos" (só sócios): no programa as duas instruções são permissionless;
// a restrição é só de interface. O chamador remonta este componente ao trocar de oferta (`key`).
import { useMemo, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Coins, ExternalLink } from "lucide-react";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { useSolanaWallet } from "@/lib/solana/phantom";
import { useSolanaOffering } from "@/lib/solana/hooks/useOfertaSolana";
import { useSolanaAction, type SolanaActionStatus } from "@/lib/solana/hooks/useAcaoSolana";
import { txInvest, txClose, txFaucet, txRelease, txRefund, txRedeem } from "@/lib/solana/instrucoes";
import { DECIMALS_MBRL_SOLANA, FAUCET_MAX_MBRL_SOLANA, UNIT_MBRL_SOLANA, solanaExplorerAccountLink, linkExplorerSolanaTx } from "@/lib/solana/config";
import { formatDeadline, formatToken } from "@/lib/web3/format";
import { pt } from "@/lib/i18n/pt-br";

const MBRL = "mBRL";

/** Relógio em segundos, arredondado a 15 s (snapshot estável entre renders; 0 no servidor). */
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
  const t = pt.solana.invest;
  return (
    <>
      {status === "sucesso" && (
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
      {status === "erro" && errorMessage && (
        <p role="alert" className="mt-3 text-sm text-value-negative">
          {errorMessage}
        </p>
      )}
    </>
  );
}

function buttonLabel(status: SolanaActionStatus, defaultLabel: string) {
  const t = pt.solana.invest;
  if (status === "assinando") return t.signing;
  if (status === "confirmando") return t.confirming;
  return defaultLabel;
}

export function SolanaInvestPanel({
  offeringAddress,
  isPartner: isSocio = false,
  isEmissor: isIssuer = false,
}: {
  offeringAddress: string;
  isPartner?: boolean;
  isEmissor?: boolean;
}) {
  const t = pt.investOnChain;
  const ts = pt.solana.invest;
  const carteira = useSolanaWallet();
  const investidor = carteira.address;
  const leitura = useSolanaOffering(offeringAddress, investidor);
  const { offering: oferta, position: posicao } = leitura;

  const faucet = useSolanaAction();
  const investir = useSolanaAction();
  const encerrar = useSolanaAction();
  const resgatar = useSolanaAction();
  const reembolsar = useSolanaAction();
  const liberar = useSolanaAction();

  const agora = useNow();
  const [quantidadeFaucet, setQuantidadeFaucet] = useState("100");
  const [quantidadeCotas, setQuantidadeCotas] = useState("1");

  const zero = BigInt(0);
  const quantidade = useMemo(() => (/^\d+$/.test(quantidadeCotas.trim()) ? BigInt(quantidadeCotas.trim()) : zero), [quantidadeCotas, zero]);

  if (leitura.nonexistent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
        <p>{ts.nonexistentOffering}</p>
      </div>
    );
  }

  const conectado = Boolean(investidor);
  const pronto = leitura.ready && oferta !== null;

  const preco = oferta?.pricePerShare ?? zero;
  const valorAporte = quantidade * preco;
  const capacidadeRestante = oferta ? oferta.maxTarget - oferta.totalRaised : zero;
  const tetoRestante = oferta ? oferta.capPerInvestor - posicao.invested : zero;
  const valorInvalido = valorAporte <= zero;
  const excedeCapacidade = valorAporte > capacidadeRestante;
  const excedeTeto = valorAporte > tetoRestante;
  const saldoInsuficiente = valorAporte > leitura.mbrlBalance;
  const prazoEncerrado = oferta && agora > 0 ? agora > oferta.deadline : false;

  const aberta = oferta?.state === "Aberta";
  const podeEncerrarAgora = Boolean(oferta && aberta && (prazoEncerrado || oferta.totalRaised === oferta.maxTarget));

  const investirDesabilitado =
    !conectado || !pronto || !aberta || Boolean(oferta?.paused) || prazoEncerrado || valorInvalido || excedeCapacidade || saldoInsuficiente || investir.busy;

  async function handleFaucet() {
    if (!investidor) return;
    const n = Number(quantidadeFaucet.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > FAUCET_MAX_MBRL_SOLANA) return;
    await faucet.execute((c) => txFaucet(c, investidor, BigInt(Math.round(n)) * UNIT_MBRL_SOLANA));
    leitura.refetch();
  }

  async function handleInvestir() {
    if (!investidor || !oferta) return;
    await investir.execute((c) => txInvest(c, investidor, oferta, valorAporte));
    leitura.refetch();
  }

  async function handleEncerrar() {
    if (!oferta) return;
    await encerrar.execute((c) => txClose(c, oferta));
    leitura.refetch();
  }

  async function handleResgatar() {
    if (!investidor || !oferta) return;
    await resgatar.execute((c) => txRedeem(c, investidor, oferta));
    leitura.refetch();
  }

  async function handleReembolsar() {
    if (!investidor || !oferta) return;
    await reembolsar.execute((c) => txRefund(c, investidor, oferta));
    leitura.refetch();
  }

  async function handleLiberar() {
    if (!investidor || !oferta) return;
    await liberar.execute((c) => txRelease(c, investidor, oferta));
    leitura.refetch();
  }

  const taxa = oferta ? (oferta.totalRaised * BigInt(oferta.feeBps)) / BigInt(10_000) : zero;
  const valorEmissor = oferta ? oferta.totalRaised - taxa : zero;
  const cotasAResgatar = oferta && preco > zero ? posicao.invested / preco : zero;

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
        {!oferta ? (
          <p className={leitura.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
            {leitura.errorMessage ? t.invest.readError(leitura.errorMessage) : t.invest.loading}
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.stateLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {t.terms.states[oferta.state]}
                  {oferta.paused && aberta ? ` — ${ts.paused}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.totalRaised}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.totalRaised)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.minTarget}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.minTarget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.maxTarget}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.maxTarget)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.pricePerShare}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.pricePerShare)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.terms.capPerInvestor}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.capPerInvestor)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.terms.deadline}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{formatDeadline(BigInt(oferta.deadline))}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.terms.feeLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {oferta.feeBps === 0 ? ts.noFee : t.terms.feeWithFee((oferta.feeBps / 100).toFixed(2))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{ts.offeringAccount}</dt>
                <dd className="mt-0.5 break-all text-sm">
                  <a href={solanaExplorerAccountLink(oferta.address)} target="_blank" rel="noreferrer" className="font-mono text-xs text-salmon hover:text-salmon-600">
                    {oferta.address}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-on-military-muted">{t.terms.note}</p>
          </>
        )}
      </Card>

      {!conectado && <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">{ts.noWallet}</p>}

      {conectado && (
        <Card title={ts.faucet.title}>
          <p className="text-sm text-on-military-muted">{ts.faucet.description}</p>
          <dl className="mt-4 flex items-center justify-between gap-4 text-sm">
            <dt className="text-on-military-muted">{t.faucet.balanceLabel}</dt>
            <dd className="font-mono text-on-military">{fmt(leitura.mbrlBalance)}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-on-military-muted">{t.faucet.quantityLabel}</span>
              <input
                type="text"
                inputMode="decimal"
                value={quantidadeFaucet}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantidadeFaucet(e.target.value)}
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
              {buttonLabel(faucet.status, t.faucet.button)}
            </button>
          </div>
          <Return {...faucet} success={t.faucet.success} />
        </Card>
      )}

      {conectado && pronto && oferta && !aberta && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {oferta.state === "EncerradaSucesso" ? t.invest.offeringClosedSuccess : ts.offeringClosedFailure}
        </p>
      )}

      {conectado && (!pronto || aberta) && (
        <Card title={t.invest.title}>
          {!pronto ? (
            <p className={leitura.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
              {leitura.errorMessage ? t.invest.readError(leitura.errorMessage) : t.invest.loading}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-on-military-muted">{t.invest.quantityLabel}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantidadeCotas}
                    onChange={(e) => setQuantidadeCotas(e.target.value)}
                    className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
                  />
                </label>
                <div className="text-sm text-on-military-muted">
                  {t.invest.valueLabel}: <span className="font-mono text-on-military">{fmt(valorAporte)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-on-military-muted">{ts.noApprove}</p>

              {valorInvalido && quantidadeCotas !== "" && <p className="mt-2 text-sm text-value-negative">{ts.invalidQuantity}</p>}
              {!valorInvalido && excedeCapacidade && <p className="mt-2 text-sm text-value-negative">{ts.exceedsCapacity(fmt(capacidadeRestante))}</p>}
              {!valorInvalido && !excedeCapacidade && excedeTeto && (
                <p className="mt-2 text-sm text-value-negative">{ts.exceedsCap(fmt(tetoRestante < zero ? zero : tetoRestante))}</p>
              )}
              {!valorInvalido && saldoInsuficiente && <p className="mt-2 text-sm text-value-negative">{ts.insufficientBalance}</p>}
              {prazoEncerrado && <p className="mt-2 text-sm text-value-negative">{ts.deadlinePassed}</p>}
              {oferta?.paused && <p className="mt-2 text-sm text-value-negative">{ts.pausedText}</p>}

              <button
                type="button"
                disabled={investirDesabilitado}
                onClick={handleInvestir}
                className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buttonLabel(investir.status, t.invest.button)}
              </button>
              <Return {...investir} success={t.invest.status.success} />
            </>
          )}
        </Card>
      )}

      {conectado && oferta && (
        <Card title={t.position.title}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.invested}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{fmt(posicao.invested)}</dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.participationBalance}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {leitura.shareBalance.toString()} {oferta.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.position.alreadyRedeemed}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{posicao.sharesRedeemed ? "Sim" : "Não"}</dd>
            </div>
            {posicao.refunded && (
              <div>
                <dt className="text-xs text-on-military-muted">{ts.refundedLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">Sim</dd>
              </div>
            )}
          </dl>
          {posicao.sharesRedeemed && <p className="mt-3 text-xs text-on-military-muted">{ts.sharesFrozen}</p>}
        </Card>
      )}

      {conectado && oferta && aberta && (
        <Card title={t.close.title}>
          <p className="text-sm text-on-military-muted">{ts.closeDescription}</p>
          <button
            type="button"
            disabled={!(isSocio || isIssuer) || !podeEncerrarAgora || encerrar.busy}
            onClick={handleEncerrar}
            className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(encerrar.status, t.close.button)}
          </button>
          {!(isSocio || isIssuer) && <p className="mt-3 text-xs text-on-military-muted">{t.close.restricted}</p>}
          {(isSocio || isIssuer) && !podeEncerrarAgora && <p className="mt-3 text-xs text-on-military-muted">{ts.closeNotYet}</p>}
          <Return {...encerrar} success={t.close.success} />
        </Card>
      )}

      {conectado && oferta?.state === "EncerradaSucesso" && !posicao.sharesRedeemed && posicao.invested > zero && (
        <Card title={t.redeem.title}>
          <p className="text-sm text-on-military-muted">{ts.redeemDescription(cotasAResgatar.toString(), oferta.symbol)}</p>
          <button
            type="button"
            disabled={resgatar.busy}
            onClick={handleResgatar}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(resgatar.status, t.redeem.button)}
          </button>
          <Return {...resgatar} success={t.redeem.success} />
        </Card>
      )}

      {conectado && oferta?.state === "EncerradaFalha" && !posicao.refunded && posicao.invested > zero && (
        <Card title={ts.refund.title}>
          <p className="text-sm text-on-military-muted">{ts.refund.description(fmt(posicao.invested))}</p>
          <button
            type="button"
            disabled={reembolsar.busy}
            onClick={handleReembolsar}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel(reembolsar.status, ts.refund.button)}
          </button>
          <Return {...reembolsar} success={ts.refund.success} />
        </Card>
      )}

      {conectado && oferta?.state === "EncerradaSucesso" && (
        <Card title={t.release.title}>
          <p className="text-sm text-on-military-muted">{ts.releaseDescription}</p>
          {!oferta.fundsReleased && <p className="mt-2 text-sm text-on-military">{t.release.preview(fmt(valorEmissor), fmt(taxa))}</p>}
          {oferta.fundsReleased ? (
            <p className="mt-4 text-sm text-value-positive">{t.release.alreadyReleased}</p>
          ) : (
            <>
              <button
                type="button"
                disabled={!isSocio || liberar.busy}
                onClick={handleLiberar}
                className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {buttonLabel(liberar.status, t.release.button)}
              </button>
              {!isSocio && <p className="mt-3 text-xs text-on-military-muted">{t.release.restricted}</p>}
              <Return {...liberar} success={ts.releaseSuccess} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
