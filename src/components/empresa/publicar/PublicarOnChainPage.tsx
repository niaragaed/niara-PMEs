"use client";

// Fase 3, sub-etapa 4 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — os 6 gates calculados de
// verdade (termo agora real, não mais stub), botão habilitado quando todos passam, assinatura
// real via usePublicarOfertaOnChain. Nunca finge sucesso: "pendente" é sempre mostrado como
// "ainda não publicada", com link pro Etherscan, até confirmarPublicacao() voltar "confirmada".
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
  verificarConsistencia,
  type ConfirmPublicationState,
  type VerificarConsistenciaState,
} from "@/app/empresa/ofertas/onchain-actions";
import { pt } from "@/lib/i18n/pt-br";

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
  const t = pt.companyOfferings.publishOnChain;
  const tg = t.gates;
  const tp = t.publication;

  const { connection, gateProvider, gateNetwork: gateRede, gateBalance: gateSaldo, gateAuthorized: gateAutorizado, gateOwnership: gateTitularidade } =
    usePublishOnChainGates(linkedWallet);
  const hook = usePublishOfferingOnChain();

  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<DataToken>({
    name: `${companyName} Participações`.trim(),
    symbol: (companyName.replace(/[^A-Za-z]/g, "").slice(0, 6) || "TOKEN").toUpperCase(),
    series: `${currentYear}-A`,
  });
  const [accepted, setAccepted] = useState(false);

  // Reconciliação ao (re)abrir a tela: se já havia uma tentativa pendente de uma visita
  // anterior (ex.: fechou a aba logo após assinar), confere de novo contra a chain sem exigir
  // clique. Roda uma única vez por carregamento da página.
  const [reconciled, setReconciled] = useState<ConfirmPublicationState | null>(null);
  // Valor inicial já reflete se vamos verificar ao montar — evita chamar setVerificando(true)
  // de forma síncrona dentro do efeito abaixo (o efeito só precisa desligar ao terminar).
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

  // Sub-etapa 5 (reconciliação contínua, ver onchain-actions.ts): roda ao (re)abrir a tela
  // sempre que já existe um contract_address para comparar — oferta confirmada (checagem de
  // rotina) ou divergente com endereço já gravado (um drift anterior, possivelmente já corrigido
  // no Supabase desde a última visita). Nunca roda para 'pendente'/'divergente' sem endereço —
  // esses não têm contrato nenhum ainda para ler, e continuam resolvidos por
  // confirmarPublicacao()/"Reprocessar" acima.
  const shouldVerifyConsistency = syncStatus === "confirmada" || (syncStatus === "divergente" && Boolean(contractAddress));
  const [consistency, setConsistency] = useState<VerificarConsistenciaState | null>(null);
  const [verifyingConsistency, setVerifyingConsistency] = useState(shouldVerifyConsistency);
  useEffect(() => {
    if (shouldVerifyConsistency) {
      verificarConsistencia(offeringId)
        .then(setConsistency)
        .finally(() => setVerifyingConsistency(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyConsistencyAgain() {
    setVerifyingConsistency(true);
    const result = await verificarConsistencia(offeringId);
    setConsistency(result);
    setVerifyingConsistency(false);
  }

  // Prioridade de exibição: ação em andamento nesta sessão (hook) > reconciliação de publicação
  // pendente (reconciliado) > verificação de consistência (consistencia) > estado persistido que
  // a página já carregou (props).
  const displayStatus: string =
    hook.status !== "idle"
      ? hook.status
      : reconciled
        ? reconciled.status === "error"
          ? "erro"
          : reconciled.status
        : consistency
          ? consistency.status === "error"
            ? "erro"
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
    (reconciled && "motivo" in reconciled ? reconciled.motivo : null) ??
    (reconciled?.status === "error" ? reconciled.message : null) ??
    (consistency && "motivo" in consistency ? consistency.motivo : null) ??
    (consistency?.status === "error" ? consistency.message : null);
  // Distingue as duas causas possíveis de 'divergente' (ver onchain-actions.ts): com endereço já
  // gravado, é drift de consistência (recuperável por verificarConsistencia, sem tocar em
  // nenhuma transação); sem endereço, é uma falha de confirmarPublicacao que nunca chegou a
  // confirmar (recuperável só por "Reprocessar").
  const divergentIsConsistencyDrift = Boolean(displayContract);

  // ── Gate 1 — MetaMask detectada ────────────────────────────────────────────────────────
  const rowProvider: GateRow = {
    id: "provider",
    label: tg.provider.label,
    status: gateProvider.status,
    detail: gateProvider.status === "reprovado" ? tg.provider.rejected : null,
  };

  // ── Gate 2 — rede Sepolia ───────────────────────────────────────────────────────────────
  let networkDetail: string | null = null;
  if (gateRede.status === "reprovado") {
    networkDetail = gateRede.reason === "nao_conectado" ? tg.network.notConnected : tg.network.wrongNetwork(gateRede.connectedChainId);
  }
  const rowNetwork: GateRow = { id: "rede", label: tg.network.label, status: gateRede.status, detail: networkDetail };

  // ── Gate 3 — saldo de ETH suficiente ───────────────────────────────────────────────────
  let balanceDetail: string | null = null;
  if (gateSaldo.status === "carregando") balanceDetail = tg.balance.loading;
  else if (gateSaldo.status === "erro") balanceDetail = tg.balance.error;
  else if (gateSaldo.status === "reprovado") {
    balanceDetail = tg.balance.rejected(formatEth(gateSaldo.balanceWei), formatEth(gateSaldo.estimatedCostWei));
  } else if (gateSaldo.status === "ok") {
    balanceDetail = tg.balance.ok(formatEth(gateSaldo.balanceWei), formatEth(gateSaldo.estimatedCostWei));
  }
  const rowBalance: GateRow = { id: "saldo", label: tg.balance.label, status: gateSaldo.status, detail: balanceDetail };

  // ── Gate 4 — emissoresAutorizados on-chain ─────────────────────────────────────────────
  let authorizedStatus: GateRow["status"];
  let authorizedDetail: string | null = null;
  if (!connection.address) {
    authorizedStatus = "carregando";
    authorizedDetail = tg.authorized.notConnected;
  } else if (gateAutorizado.errorMessage) {
    authorizedStatus = "erro";
    authorizedDetail = gateAutorizado.errorMessage;
  } else if (gateAutorizado.isLoading || gateAutorizado.authorized === null) {
    authorizedStatus = "carregando";
  } else if (gateAutorizado.authorized === false) {
    authorizedStatus = "reprovado";
    authorizedDetail = tg.authorized.rejected;
  } else {
    authorizedStatus = "ok";
  }
  const rowAuthorized: GateRow = { id: "autorizado", label: tg.authorized.label, status: authorizedStatus, detail: authorizedDetail };

  // ── Gate 5 — carteira conectada == issuers.wallet_address ──────────────────────────────
  let ownershipDetail: string | null = null;
  if (gateTitularidade.status === "reprovado") {
    if (gateTitularidade.reason === "sem_carteira_vinculada") ownershipDetail = tg.ownership.noLinkedWallet;
    else if (gateTitularidade.reason === "nao_conectado") ownershipDetail = tg.ownership.notConnected;
    else ownershipDetail = tg.ownership.different(gateTitularidade.linkedWallet, gateTitularidade.connectedWallet);
  }
  const rowOwnership: GateRow = {
    id: "titularidade",
    label: tg.ownership.label,
    status: gateTitularidade.status === "reprovado" && gateTitularidade.reason === "nao_conectado" ? "carregando" : gateTitularidade.status,
    detail: ownershipDetail,
  };

  // ── Gate 6 — termo de publicação (real a partir desta etapa) ───────────────────────────
  const validData = data.name.trim().length > 0 && data.symbol.trim().length > 0 && data.series.trim().length > 0;
  const gate6Ok = accepted && validData;
  const rowTerm: GateRow = { id: "termo", label: tg.term.label, status: gate6Ok ? "ok" : "reprovado", detail: gate6Ok ? null : tg.term.rejected };

  const rows: GateRow[] = [rowProvider, rowNetwork, rowBalance, rowAuthorized, rowOwnership, rowTerm];
  const pendingItems = rows.filter((r) => r.status !== "ok");
  const canEnable = pendingItems.length === 0 && displayStatus === "idle";

  async function handlePublish() {
    await hook.publicar({
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

  const inProgress = displayStatus === "assinando" || displayStatus === "registrando" || displayStatus === "confirmando";

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">Demonstração</span> — publicação real em
        Sepolia. Testnet sem valor real; leia o termo antes de assinar.
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

        {(displayStatus === "revertida" || displayStatus === "erro") && displayError && (
          <div role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            {displayStatus === "revertida" && <p className="font-medium">{tp.revertedTitle}</p>}
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
            {displayStatus === "assinando" && tp.signing}
            {displayStatus === "registrando" && tp.registering}
            {displayStatus === "confirmando" && tp.confirming}
          </div>
        )}

        {(displayStatus === "idle" || displayStatus === "revertida" || displayStatus === "erro") && (
          <>
            {!linkedWallet && (
              <div className="mt-6 rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
                <p className="font-medium">{t.noLinkedWallet.title}</p>
                <p className="mt-1 text-on-military-muted">{t.noLinkedWallet.text}</p>
                <Link href="/perfil#carteira" className="mt-2 inline-block text-salmon hover:text-salmon-600">
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
