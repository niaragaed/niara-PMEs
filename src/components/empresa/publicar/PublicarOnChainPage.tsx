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
import { TermoPublicacao, type DadosToken } from "./TermoPublicacao";
import { usePublicarOnChainGates } from "@/lib/web3/hooks/usePublicarOnChainGates";
import { usePublicarOfertaOnChain } from "@/lib/web3/hooks/usePublicarOfertaOnChain";
import { UNIDADE_ON_CHAIN } from "@/lib/web3/gates";
import { formatEth } from "@/lib/web3/format";
import { confirmarPublicacao, type ConfirmarPublicacaoState } from "@/app/empresa/ofertas/onchain-actions";
import { ptBr } from "@/lib/i18n/pt-br";

type Props = {
  offeringId: string;
  walletVinculada: string | null;
  empresaNome: string;
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

export function PublicarOnChainPage({
  offeringId,
  walletVinculada,
  empresaNome,
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
  const t = ptBr.empresaOfertas.publicarOnChain;
  const tg = t.gates;
  const tp = t.publicacao;

  const { connection, gateProvider, gateRede, gateSaldo, gateAutorizado, gateTitularidade } =
    usePublicarOnChainGates(walletVinculada);
  const hook = usePublicarOfertaOnChain();

  const anoAtual = new Date().getFullYear();
  const [dados, setDados] = useState<DadosToken>({
    nome: `${empresaNome} Participações`.trim(),
    simbolo: (empresaNome.replace(/[^A-Za-z]/g, "").slice(0, 6) || "TOKEN").toUpperCase(),
    serie: `${anoAtual}-A`,
  });
  const [aceito, setAceito] = useState(false);

  // Reconciliação ao (re)abrir a tela: se já havia uma tentativa pendente de uma visita
  // anterior (ex.: fechou a aba logo após assinar), confere de novo contra a chain sem exigir
  // clique. Roda uma única vez por carregamento da página.
  const [reconciliado, setReconciliado] = useState<ConfirmarPublicacaoState | null>(null);
  // Valor inicial já reflete se vamos verificar ao montar — evita chamar setVerificando(true)
  // de forma síncrona dentro do efeito abaixo (o efeito só precisa desligar ao terminar).
  const [verificando, setVerificando] = useState(syncStatus === "pendente");
  useEffect(() => {
    if (syncStatus === "pendente") {
      confirmarPublicacao(offeringId)
        .then(setReconciliado)
        .finally(() => setVerificando(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificarNovamente() {
    setVerificando(true);
    const resultado = await confirmarPublicacao(offeringId);
    setReconciliado(resultado);
    setVerificando(false);
  }

  // Prioridade de exibição: ação em andamento nesta sessão (hook) > reconciliação recém-feita >
  // estado persistido que a página já carregou (props).
  const displayStatus: string =
    hook.status !== "idle"
      ? hook.status
      : reconciliado
        ? reconciliado.status === "error"
          ? "erro"
          : reconciliado.status
        : syncStatus === "pendente"
          ? "pendente"
          : syncStatus === "confirmada"
            ? "confirmada"
            : syncStatus === "divergente"
              ? "divergente"
              : "idle";

  const displayTxHash = hook.txHash ?? txHash;
  const displayContract = hook.contractAddress ?? contractAddress ?? (reconciliado?.status === "confirmada" ? reconciliado.contractAddress : null);
  const displayToken = hook.tokenAddress ?? tokenAddress ?? (reconciliado?.status === "confirmada" ? reconciliado.tokenAddress : null);
  const displayError = hook.errorMessage ?? onchainLastError ?? (reconciliado && "motivo" in reconciliado ? reconciliado.motivo : null) ?? (reconciliado?.status === "error" ? reconciliado.message : null);

  // ── Gate 1 — MetaMask detectada ────────────────────────────────────────────────────────
  const rowProvider: GateRow = {
    id: "provider",
    label: tg.provider.label,
    status: gateProvider.status,
    detalhe: gateProvider.status === "reprovado" ? tg.provider.reprovado : null,
  };

  // ── Gate 2 — rede Sepolia ───────────────────────────────────────────────────────────────
  let redeDetalhe: string | null = null;
  if (gateRede.status === "reprovado") {
    redeDetalhe = gateRede.motivo === "nao_conectado" ? tg.rede.naoConectado : tg.rede.redeErrada(gateRede.chainIdConectado);
  }
  const rowRede: GateRow = { id: "rede", label: tg.rede.label, status: gateRede.status, detalhe: redeDetalhe };

  // ── Gate 3 — saldo de ETH suficiente ───────────────────────────────────────────────────
  let saldoDetalhe: string | null = null;
  if (gateSaldo.status === "carregando") saldoDetalhe = tg.saldo.carregando;
  else if (gateSaldo.status === "erro") saldoDetalhe = tg.saldo.erro;
  else if (gateSaldo.status === "reprovado") {
    saldoDetalhe = tg.saldo.reprovado(formatEth(gateSaldo.saldoWei), formatEth(gateSaldo.custoEstimadoWei));
  } else if (gateSaldo.status === "ok") {
    saldoDetalhe = tg.saldo.ok(formatEth(gateSaldo.saldoWei), formatEth(gateSaldo.custoEstimadoWei));
  }
  const rowSaldo: GateRow = { id: "saldo", label: tg.saldo.label, status: gateSaldo.status, detalhe: saldoDetalhe };

  // ── Gate 4 — emissoresAutorizados on-chain ─────────────────────────────────────────────
  let autorizadoStatus: GateRow["status"];
  let autorizadoDetalhe: string | null = null;
  if (!connection.address) {
    autorizadoStatus = "carregando";
    autorizadoDetalhe = tg.autorizado.naoConectado;
  } else if (gateAutorizado.errorMessage) {
    autorizadoStatus = "erro";
    autorizadoDetalhe = gateAutorizado.errorMessage;
  } else if (gateAutorizado.isLoading || gateAutorizado.autorizado === null) {
    autorizadoStatus = "carregando";
  } else if (gateAutorizado.autorizado === false) {
    autorizadoStatus = "reprovado";
    autorizadoDetalhe = tg.autorizado.reprovado;
  } else {
    autorizadoStatus = "ok";
  }
  const rowAutorizado: GateRow = { id: "autorizado", label: tg.autorizado.label, status: autorizadoStatus, detalhe: autorizadoDetalhe };

  // ── Gate 5 — carteira conectada == issuers.wallet_address ──────────────────────────────
  let titularidadeDetalhe: string | null = null;
  if (gateTitularidade.status === "reprovado") {
    if (gateTitularidade.motivo === "sem_carteira_vinculada") titularidadeDetalhe = tg.titularidade.semCarteiraVinculada;
    else if (gateTitularidade.motivo === "nao_conectado") titularidadeDetalhe = tg.titularidade.naoConectado;
    else titularidadeDetalhe = tg.titularidade.diferente(gateTitularidade.walletVinculada, gateTitularidade.carteiraConectada);
  }
  const rowTitularidade: GateRow = {
    id: "titularidade",
    label: tg.titularidade.label,
    status: gateTitularidade.status === "reprovado" && gateTitularidade.motivo === "nao_conectado" ? "carregando" : gateTitularidade.status,
    detalhe: titularidadeDetalhe,
  };

  // ── Gate 6 — termo de publicação (real a partir desta etapa) ───────────────────────────
  const dadosValidos = dados.nome.trim().length > 0 && dados.simbolo.trim().length > 0 && dados.serie.trim().length > 0;
  const gate6Ok = aceito && dadosValidos;
  const rowTermo: GateRow = { id: "termo", label: tg.termo.label, status: gate6Ok ? "ok" : "reprovado", detalhe: gate6Ok ? null : tg.termo.reprovado };

  const rows: GateRow[] = [rowProvider, rowRede, rowSaldo, rowAutorizado, rowTitularidade, rowTermo];
  const pendencias = rows.filter((r) => r.status !== "ok");
  const podeHabilitar = pendencias.length === 0 && displayStatus === "idle";

  async function handlePublicar() {
    await hook.publicar({
      offeringId,
      nome: dados.nome.trim(),
      simbolo: dados.simbolo.trim(),
      empresa: empresaNome,
      cnpjRef,
      serie: dados.serie.trim(),
      metaMinimaWei: BigInt(targetMinCents) * UNIDADE_ON_CHAIN,
      metaMaximaWei: BigInt(hardCapCents) * UNIDADE_ON_CHAIN,
      precoPorCotaWei: BigInt(sharePriceCents) * UNIDADE_ON_CHAIN,
      windowDays,
    });
  }

  const emAndamento = displayStatus === "assinando" || displayStatus === "registrando" || displayStatus === "confirmando";

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">Demonstração</span> — publicação real em
        Sepolia. Testnet sem valor real; leia o termo antes de assinar.
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/empresa/ofertas" className="text-sm text-salmon hover:text-salmon-600">
          {t.voltar}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-1 text-sm text-on-military-muted">{t.subtitulo}</p>

        {displayStatus === "confirmada" && (
          <div className="mt-6 rounded-lg border border-value-positive/40 bg-value-positive/10 p-4 text-sm text-on-military">
            <p className="font-medium">{tp.confirmadaTitulo}</p>
            <p className="mt-1 text-on-military-muted">{tp.confirmadaTexto}</p>
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
                {tp.verNoEtherscan}
              </a>
            )}
          </div>
        )}

        {displayStatus === "pendente" && (
          <div className="mt-6 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <p className="font-medium">{tp.pendenteTitulo}</p>
            <p className="mt-1 text-on-military-muted">{tp.pendenteTexto}</p>
            {displayTxHash && (
              <a href={etherscanTx(displayTxHash)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                {tp.verNoEtherscan}
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={verificarNovamente}
                disabled={verificando}
                className="flex items-center gap-2 rounded-md border border-panel-border px-3 py-1.5 text-sm text-on-military hover:text-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verificando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tp.verificarNovamente}
              </button>
            </div>
          </div>
        )}

        {(displayStatus === "revertida" || displayStatus === "erro") && displayError && (
          <div role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            {displayStatus === "revertida" && <p className="font-medium">{tp.revertidaTitulo}</p>}
            <p className="mt-1">{displayError}</p>
          </div>
        )}

        {displayStatus === "divergente" && (
          <div role="alert" className="mt-6 rounded-md border border-value-negative/30 bg-value-negative/10 p-4 text-sm text-value-negative">
            <p className="font-medium">{tp.divergenteTitulo}</p>
            <p className="mt-1">{tp.divergenteTexto}</p>
            {displayError && <p className="mt-1 text-xs">{displayError}</p>}
          </div>
        )}

        {emAndamento && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {displayStatus === "assinando" && tp.assinando}
            {displayStatus === "registrando" && tp.registrando}
            {displayStatus === "confirmando" && tp.confirmando}
          </div>
        )}

        {(displayStatus === "idle" || displayStatus === "revertida" || displayStatus === "erro") && (
          <>
            {!walletVinculada && (
              <div className="mt-6 rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
                <p className="font-medium">{t.semCarteiraVinculada.titulo}</p>
                <p className="mt-1 text-on-military-muted">{t.semCarteiraVinculada.texto}</p>
                <Link href="/perfil#carteira" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                  {t.semCarteiraVinculada.link}
                </Link>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-panel-border bg-military p-4">
              <ConnectWallet />
            </div>

            <h2 className="mt-8 text-sm font-semibold text-on-military">{tg.titulo}</h2>
            <div className="mt-3">
              <GateChecklist rows={rows} />
            </div>

            <div className="mt-8">
              <TermoPublicacao dados={dados} onDadosChange={setDados} aceito={aceito} onAceitoChange={setAceito} desabilitado={false} />
            </div>

            <div className="mt-8 flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={handlePublicar}
                disabled={!podeHabilitar}
                aria-disabled={!podeHabilitar}
                aria-label={podeHabilitar ? t.botao.label : t.botao.bloqueadoAria}
                title={podeHabilitar ? t.botao.label : t.botao.bloqueadoAria}
                className={
                  podeHabilitar
                    ? "rounded-md bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon transition-colors hover:bg-salmon-600"
                    : "cursor-not-allowed rounded-md bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon opacity-60"
                }
              >
                {t.botao.label}
              </button>

              {!podeHabilitar && (
                <div className="text-xs text-on-military-muted">
                  <p>{t.botao.pendencias}</p>
                  <ul className="mt-1 list-inside list-disc">
                    {pendencias.map((p) => (
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
