"use client";

// Publicação self-service da oferta na Solana Devnet — par do PublicarOnChainPage.tsx (Sepolia),
// mesmo desenho: 6 gates reais (Phantom detectada, conectada, saldo de SOL, emissor autorizado no
// programa, titularidade, termo), botão só habilitado com todos ok, e nunca "publicada" antes da
// confirmação do servidor (confirmarPublicacaoSolana) contra a própria rede.
//
// Não existe gate de "rede certa": a Phantom só assina e o site envia sempre pela devnet (ver
// src/lib/solana/phantom.ts).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { ConnectPhantom } from "@/components/solana/ConnectPhantom";
import { GateChecklist, type GateRow } from "./GateChecklist";
import { TermoPublicacao, type DadosToken } from "./TermoPublicacao";
import { useCarteiraSolana } from "@/lib/solana/phantom";
import { conexaoSolana, lerEmissorSolana } from "@/lib/solana/program";
import { usePublicarOfertaSolana } from "@/lib/solana/hooks/usePublicarOfertaSolana";
import {
  MAX_EMPRESA_SOLANA,
  MAX_NOME_SOLANA,
  MAX_SERIE_SOLANA,
  MAX_SIMBOLO_SOLANA,
  UNIDADE_ON_CHAIN_SOLANA,
  linkExplorerSolanaConta,
  linkExplorerSolanaTx,
} from "@/lib/solana/config";
import {
  confirmarPublicacaoSolana,
  verificarConsistenciaSolana,
} from "@/app/empresa/ofertas/solana-actions";
import type { ConfirmarPublicacaoState, VerificarConsistenciaState } from "@/app/empresa/ofertas/onchain-actions";
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

const bytes = (texto: string) => new TextEncoder().encode(texto).length;

/** Corta no limite de BYTES (UTF-8) do programa sem quebrar um caractere no meio. */
function cortarBytes(texto: string, maximo: number): string {
  let saida = "";
  for (const ch of texto) {
    if (bytes(saida + ch) > maximo) break;
    saida += ch;
  }
  return saida.trim();
}

// Tamanhos de conta criados por criar_oferta: Oferta (8 + INIT_SPACE = 410), mint SPL (82) e
// conta de token SPL do escrow (165). Margem de 30%, como o gate de gás da Sepolia.
const TAMANHOS_CONTAS = [410, 82, 165];
const TAXA_LAMPORTS = 10_000;
const LAMPORTS_POR_SOL = 1_000_000_000;

function sol(lamports: number) {
  return (lamports / LAMPORTS_POR_SOL).toLocaleString("pt-BR", { maximumFractionDigits: 6 });
}

function truncar(endereco: string) {
  return `${endereco.slice(0, 4)}…${endereco.slice(-4)}`;
}

export function PublicarSolanaPage({
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
  const ts = ptBr.solana.publicar;
  const tg = ts.gates;
  const tp = t.publicacao;
  const tsp = ts.publicacao;

  const carteira = useCarteiraSolana();
  const connection = useMemo(() => conexaoSolana(), []);
  const hook = usePublicarOfertaSolana();

  const empresa = cortarBytes(empresaNome || "Empresa", MAX_EMPRESA_SOLANA);
  const anoAtual = new Date().getFullYear();
  const [dados, setDados] = useState<DadosToken>({
    nome: cortarBytes(`${empresaNome} Participações`, MAX_NOME_SOLANA),
    simbolo: (empresaNome.replace(/[^A-Za-z]/g, "").slice(0, 6) || "TOKEN").toUpperCase(),
    serie: `${anoAtual}-A`,
  });
  const [aceito, setAceito] = useState(false);

  // ── leituras on-chain dos gates ─────────────────────────────────────────────────────────────
  const endereco = carteira.endereco;
  const saldo = useQuery({
    queryKey: ["solana-publicar-saldo", endereco],
    enabled: Boolean(endereco),
    queryFn: async () => {
      const [lamports, ...alugueis] = await Promise.all([
        connection.getBalance(new PublicKey(endereco as string), "confirmed"),
        ...TAMANHOS_CONTAS.map((n) => connection.getMinimumBalanceForRentExemption(n)),
      ]);
      const custo = Math.ceil((alugueis.reduce((a, b) => a + b, 0) + TAXA_LAMPORTS) * 1.3);
      return { lamports, custo };
    },
    refetchInterval: 20_000,
  });
  const emissor = useQuery({
    queryKey: ["solana-publicar-emissor", endereco],
    enabled: Boolean(endereco),
    queryFn: () => lerEmissorSolana(connection, endereco as string),
    refetchInterval: 20_000,
  });

  // ── reconciliação ao (re)abrir a tela — mesma lógica da Sepolia ─────────────────────────────
  const [reconciliado, setReconciliado] = useState<ConfirmarPublicacaoState | null>(null);
  const [verificando, setVerificando] = useState(syncStatus === "pendente");
  useEffect(() => {
    if (syncStatus === "pendente") {
      confirmarPublicacaoSolana(offeringId)
        .then(setReconciliado)
        .finally(() => setVerificando(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function verificarNovamente() {
    setVerificando(true);
    setReconciliado(await confirmarPublicacaoSolana(offeringId));
    setVerificando(false);
  }

  const deveVerificarConsistencia = syncStatus === "confirmada" || (syncStatus === "divergente" && Boolean(contractAddress));
  const [consistencia, setConsistencia] = useState<VerificarConsistenciaState | null>(null);
  const [verificandoConsistencia, setVerificandoConsistencia] = useState(deveVerificarConsistencia);
  useEffect(() => {
    if (deveVerificarConsistencia) {
      verificarConsistenciaSolana(offeringId)
        .then(setConsistencia)
        .finally(() => setVerificandoConsistencia(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function verificarConsistenciaNovamente() {
    setVerificandoConsistencia(true);
    setConsistencia(await verificarConsistenciaSolana(offeringId));
    setVerificandoConsistencia(false);
  }

  const displayStatus: string =
    hook.status !== "idle"
      ? hook.status
      : reconciliado
        ? reconciliado.status === "error"
          ? "erro"
          : reconciliado.status
        : consistencia
          ? consistencia.status === "error"
            ? "erro"
            : consistencia.status
          : ["pendente", "confirmada", "divergente"].includes(syncStatus)
            ? syncStatus
            : "idle";

  const displayTx = hook.txHash ?? txHash;
  const displayContract = hook.contractAddress ?? contractAddress ?? (reconciliado?.status === "confirmada" ? reconciliado.contractAddress : null);
  const displayToken = hook.tokenAddress ?? tokenAddress ?? (reconciliado?.status === "confirmada" ? reconciliado.tokenAddress : null);
  const displayError =
    hook.errorMessage ??
    (reconciliado && "motivo" in reconciliado ? reconciliado.motivo : null) ??
    (reconciliado?.status === "error" ? reconciliado.message : null) ??
    (consistencia && "motivo" in consistencia ? consistencia.motivo : null) ??
    (consistencia?.status === "error" ? consistencia.message : null) ??
    onchainLastError;
  const divergenteEhDriftDeConsistencia = Boolean(displayContract);

  // ── gates ───────────────────────────────────────────────────────────────────────────────────
  const rowProvider: GateRow = {
    id: "provider",
    label: tg.provider.label,
    status: !carteira.iniciado ? "carregando" : carteira.disponivel ? "ok" : "reprovado",
    detalhe: carteira.iniciado && !carteira.disponivel ? tg.provider.reprovado : null,
  };
  const rowConexao: GateRow = {
    id: "conexao",
    label: tg.conexao.label,
    status: endereco ? "ok" : "reprovado",
    detalhe: endereco ? null : tg.conexao.reprovado,
  };

  let rowSaldo: GateRow;
  if (!endereco) rowSaldo = { id: "saldo", label: tg.saldo.label, status: "carregando", detalhe: null };
  else if (saldo.isError) rowSaldo = { id: "saldo", label: tg.saldo.label, status: "erro", detalhe: tg.saldo.erro };
  else if (!saldo.data) rowSaldo = { id: "saldo", label: tg.saldo.label, status: "carregando", detalhe: tg.saldo.carregando };
  else if (saldo.data.lamports < saldo.data.custo)
    rowSaldo = { id: "saldo", label: tg.saldo.label, status: "reprovado", detalhe: tg.saldo.reprovado(sol(saldo.data.lamports), sol(saldo.data.custo)) };
  else rowSaldo = { id: "saldo", label: tg.saldo.label, status: "ok", detalhe: tg.saldo.ok(sol(saldo.data.lamports), sol(saldo.data.custo)) };

  let rowAutorizado: GateRow;
  if (!endereco) rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "carregando", detalhe: tg.autorizado.naoConectado };
  else if (emissor.isError) rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "erro", detalhe: tg.autorizado.erro };
  else if (!emissor.isSuccess) rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "carregando", detalhe: null };
  else if (!emissor.data?.autorizado) rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "reprovado", detalhe: tg.autorizado.reprovado };
  else if (emissor.data.ofertaAberta) rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "reprovado", detalhe: tg.autorizado.ofertaAberta };
  else rowAutorizado = { id: "autorizado", label: tg.autorizado.label, status: "ok", detalhe: null };

  let rowTitularidade: GateRow;
  if (!walletVinculada) rowTitularidade = { id: "titularidade", label: tg.titularidade.label, status: "reprovado", detalhe: tg.titularidade.semCarteiraVinculada };
  else if (!endereco) rowTitularidade = { id: "titularidade", label: tg.titularidade.label, status: "carregando", detalhe: tg.titularidade.naoConectado };
  else if (endereco !== walletVinculada)
    rowTitularidade = { id: "titularidade", label: tg.titularidade.label, status: "reprovado", detalhe: tg.titularidade.diferente(truncar(walletVinculada), truncar(endereco)) };
  else rowTitularidade = { id: "titularidade", label: tg.titularidade.label, status: "ok", detalhe: null };

  const nome = dados.nome.trim();
  const simbolo = dados.simbolo.trim();
  const serie = dados.serie.trim();
  const dadosValidos =
    nome.length > 0 &&
    simbolo.length > 0 &&
    serie.length > 0 &&
    bytes(nome) <= MAX_NOME_SOLANA &&
    bytes(simbolo) <= MAX_SIMBOLO_SOLANA &&
    bytes(serie) <= MAX_SERIE_SOLANA;
  const termoOk = aceito && dadosValidos;
  const rowTermo: GateRow = {
    id: "termo",
    label: tg.termo.label,
    status: termoOk ? "ok" : "reprovado",
    detalhe: termoOk ? null : `${tg.termo.reprovado} ${tg.termo.limites}`,
  };

  const rows = [rowProvider, rowConexao, rowSaldo, rowAutorizado, rowTitularidade, rowTermo];
  const pendencias = rows.filter((r) => r.status !== "ok");
  const podeHabilitar = pendencias.length === 0 && (displayStatus === "idle" || displayStatus === "erro" || displayStatus === "revertida");

  async function handlePublicar() {
    await hook.publicar({
      offeringId,
      nome,
      simbolo,
      empresa,
      cnpjRefHex: cnpjRef,
      serie,
      metaMinima: BigInt(targetMinCents) * UNIDADE_ON_CHAIN_SOLANA,
      metaMaxima: BigInt(hardCapCents) * UNIDADE_ON_CHAIN_SOLANA,
      precoPorCota: BigInt(sharePriceCents) * UNIDADE_ON_CHAIN_SOLANA,
      windowDays,
    });
  }

  const emAndamento = displayStatus === "assinando" || displayStatus === "registrando" || displayStatus === "confirmando";
  const linkClasse = "font-mono text-xs text-salmon hover:text-salmon-600";

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.common.demonstracao}</span> — {ts.banner}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/empresa/ofertas" className="text-sm text-salmon hover:text-salmon-600">
          {t.voltar}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-military">
          {t.titulo} <span className="text-base font-normal text-on-military-muted">· {ptBr.solana.redeNome}</span>
        </h1>
        <p className="mt-1 text-sm text-on-military-muted">{ts.subtitulo}</p>

        {displayStatus === "confirmada" && (
          <div className="mt-6 rounded-lg border border-value-positive/40 bg-value-positive/10 p-4 text-sm text-on-military">
            <p className="font-medium">{tsp.confirmadaTitulo}</p>
            <p className="mt-1 text-on-military-muted">{tsp.confirmadaTexto}</p>
            <dl className="mt-3 space-y-1">
              {displayContract && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tsp.contractLabel}</dt>
                  <dd className="break-all">
                    <a href={linkExplorerSolanaConta(displayContract)} target="_blank" rel="noreferrer" className={linkClasse}>
                      {displayContract}
                    </a>
                  </dd>
                </div>
              )}
              {displayToken && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <dt className="text-on-military-muted">{tsp.tokenLabel}</dt>
                  <dd className="break-all">
                    <a href={linkExplorerSolanaConta(displayToken)} target="_blank" rel="noreferrer" className={linkClasse}>
                      {displayToken}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-3 flex flex-wrap gap-4">
              {displayTx && (
                <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="text-salmon hover:text-salmon-600">
                  {tsp.verNoExplorer}
                </a>
              )}
              <Link href={`/negociar/oferta/${offeringId}`} className="text-salmon hover:text-salmon-600">
                {tsp.verOferta}
              </Link>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={verificarConsistenciaNovamente}
                disabled={verificandoConsistencia}
                className="flex items-center gap-2 rounded-md border border-panel-border px-3 py-1.5 text-sm text-on-military hover:text-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verificandoConsistencia && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tp.verificarConsistencia}
              </button>
              <p className="mt-1 text-xs text-on-military-muted">{tsp.verificarConsistenciaNota}</p>
            </div>
          </div>
        )}

        {displayStatus === "pendente" && (
          <div className="mt-6 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <p className="font-medium">{tp.pendenteTitulo}</p>
            <p className="mt-1 text-on-military-muted">{tsp.pendenteTexto}</p>
            {displayTx && (
              <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                {tsp.verNoExplorer}
              </a>
            )}
            {hook.errorMessage && <p className="mt-2 text-xs text-on-military-muted">{hook.errorMessage}</p>}
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
            <p className="mt-1">{divergenteEhDriftDeConsistencia ? tp.divergenteConsistenciaTexto : tp.divergenteTexto}</p>
            {displayError && <p className="mt-1 text-xs">{displayError}</p>}
            {displayTx && (
              <a href={linkExplorerSolanaTx(displayTx)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-value-negative underline">
                {tsp.verNoExplorer}
              </a>
            )}
            <div className="mt-3">
              <button
                type="button"
                onClick={divergenteEhDriftDeConsistencia ? verificarConsistenciaNovamente : verificarNovamente}
                disabled={divergenteEhDriftDeConsistencia ? verificandoConsistencia : verificando}
                className="flex items-center gap-2 rounded-md border border-value-negative/40 px-3 py-1.5 text-sm text-value-negative hover:bg-value-negative/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(divergenteEhDriftDeConsistencia ? verificandoConsistencia : verificando) && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {divergenteEhDriftDeConsistencia ? tp.verificarConsistencia : tp.reprocessar}
              </button>
              <p className="mt-1 text-xs text-on-military-muted">
                {divergenteEhDriftDeConsistencia ? tsp.verificarConsistenciaNota : tp.reprocessarNota}
              </p>
            </div>
          </div>
        )}

        {emAndamento && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-panel-border bg-panel p-4 text-sm text-on-military">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {displayStatus === "assinando" && tsp.assinando}
            {displayStatus === "registrando" && tsp.registrando}
            {displayStatus === "confirmando" && tsp.confirmando}
          </div>
        )}

        {(displayStatus === "idle" || displayStatus === "revertida" || displayStatus === "erro") && (
          <>
            {!walletVinculada && (
              <div className="mt-6 rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
                <p className="font-medium">{ts.semCarteiraVinculada.titulo}</p>
                <p className="mt-1 text-on-military-muted">{ts.semCarteiraVinculada.texto}</p>
                <Link href="/perfil#carteira-solana" className="mt-2 inline-block text-salmon hover:text-salmon-600">
                  {ts.semCarteiraVinculada.link}
                </Link>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-panel-border bg-military p-4">
              <ConnectPhantom />
            </div>

            <h2 className="mt-8 text-sm font-semibold text-on-military">{t.gates.titulo}</h2>
            <div className="mt-3">
              <GateChecklist rows={rows} />
            </div>

            <div className="mt-8">
              <TermoPublicacao textos={ts} dados={dados} onDadosChange={setDados} aceito={aceito} onAceitoChange={setAceito} desabilitado={false} />
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
                {t.botao.label} · {ptBr.solana.redeNome}
              </button>
              {!podeHabilitar && pendencias.length > 0 && (
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
