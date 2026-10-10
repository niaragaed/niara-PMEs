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
import { useCarteiraSolana } from "@/lib/solana/phantom";
import { useOfertaSolana } from "@/lib/solana/hooks/useOfertaSolana";
import { useAcaoSolana, type StatusAcaoSolana } from "@/lib/solana/hooks/useAcaoSolana";
import { txAportar, txEncerrar, txFaucet, txLiberar, txReembolsar, txResgatar } from "@/lib/solana/instrucoes";
import { DECIMAIS_MBRL_SOLANA, FAUCET_MAXIMO_MBRL_SOLANA, UNIDADE_MBRL_SOLANA, linkExplorerSolanaConta, linkExplorerSolanaTx } from "@/lib/solana/config";
import { formatPrazo, formatToken } from "@/lib/web3/format";
import { ptBr } from "@/lib/i18n/pt-br";

const MBRL = "mBRL";

/** Relógio em segundos, arredondado a 15 s (snapshot estável entre renders; 0 no servidor). */
function useAgora(): number {
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

function fmt(valor: bigint) {
  return formatToken(valor, DECIMAIS_MBRL_SOLANA, MBRL);
}

function Retorno({ status, errorMessage, assinatura, sucesso }: { status: StatusAcaoSolana; errorMessage: string | null; assinatura: string | null; sucesso: string }) {
  const t = ptBr.solana.investir;
  return (
    <>
      {status === "sucesso" && (
        <p role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-value-positive">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {sucesso}
          {assinatura && (
            <a href={linkExplorerSolanaTx(assinatura)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-salmon hover:text-salmon-600">
              {t.verNoExplorer}
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

function rotuloBotao(status: StatusAcaoSolana, padrao: string) {
  const t = ptBr.solana.investir;
  if (status === "assinando") return t.assinando;
  if (status === "confirmando") return t.confirmando;
  return padrao;
}

export function SolanaInvestPanel({
  ofertaEndereco,
  isSocio = false,
  isEmissor = false,
}: {
  ofertaEndereco: string;
  isSocio?: boolean;
  isEmissor?: boolean;
}) {
  const t = ptBr.investirOnChain;
  const ts = ptBr.solana.investir;
  const carteira = useCarteiraSolana();
  const investidor = carteira.endereco;
  const leitura = useOfertaSolana(ofertaEndereco, investidor);
  const { oferta, posicao } = leitura;

  const faucet = useAcaoSolana();
  const investir = useAcaoSolana();
  const encerrar = useAcaoSolana();
  const resgatar = useAcaoSolana();
  const reembolsar = useAcaoSolana();
  const liberar = useAcaoSolana();

  const agora = useAgora();
  const [quantidadeFaucet, setQuantidadeFaucet] = useState("100");
  const [quantidadeCotas, setQuantidadeCotas] = useState("1");

  const zero = BigInt(0);
  const quantidade = useMemo(() => (/^\d+$/.test(quantidadeCotas.trim()) ? BigInt(quantidadeCotas.trim()) : zero), [quantidadeCotas, zero]);

  if (leitura.inexistente) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
        <p>{ts.ofertaInexistente}</p>
      </div>
    );
  }

  const conectado = Boolean(investidor);
  const pronto = leitura.pronto && oferta !== null;

  const preco = oferta?.precoPorCota ?? zero;
  const valorAporte = quantidade * preco;
  const capacidadeRestante = oferta ? oferta.metaMaxima - oferta.totalArrecadado : zero;
  const tetoRestante = oferta ? oferta.tetoPorInvestidor - posicao.aportado : zero;
  const valorInvalido = valorAporte <= zero;
  const excedeCapacidade = valorAporte > capacidadeRestante;
  const excedeTeto = valorAporte > tetoRestante;
  const saldoInsuficiente = valorAporte > leitura.saldoMbrl;
  const prazoEncerrado = oferta && agora > 0 ? agora > oferta.prazo : false;

  const aberta = oferta?.estado === "Aberta";
  const podeEncerrarAgora = Boolean(oferta && aberta && (prazoEncerrado || oferta.totalArrecadado === oferta.metaMaxima));

  const investirDesabilitado =
    !conectado || !pronto || !aberta || Boolean(oferta?.pausada) || prazoEncerrado || valorInvalido || excedeCapacidade || saldoInsuficiente || investir.ocupado;

  async function handleFaucet() {
    if (!investidor) return;
    const n = Number(quantidadeFaucet.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > FAUCET_MAXIMO_MBRL_SOLANA) return;
    await faucet.executar((c) => txFaucet(c, investidor, BigInt(Math.round(n)) * UNIDADE_MBRL_SOLANA));
    leitura.refetch();
  }

  async function handleInvestir() {
    if (!investidor || !oferta) return;
    await investir.executar((c) => txAportar(c, investidor, oferta, valorAporte));
    leitura.refetch();
  }

  async function handleEncerrar() {
    if (!oferta) return;
    await encerrar.executar((c) => txEncerrar(c, oferta));
    leitura.refetch();
  }

  async function handleResgatar() {
    if (!investidor || !oferta) return;
    await resgatar.executar((c) => txResgatar(c, investidor, oferta));
    leitura.refetch();
  }

  async function handleReembolsar() {
    if (!investidor || !oferta) return;
    await reembolsar.executar((c) => txReembolsar(c, investidor, oferta));
    leitura.refetch();
  }

  async function handleLiberar() {
    if (!investidor || !oferta) return;
    await liberar.executar((c) => txLiberar(c, investidor, oferta));
    leitura.refetch();
  }

  const taxa = oferta ? (oferta.totalArrecadado * BigInt(oferta.taxaBps)) / BigInt(10_000) : zero;
  const valorEmissor = oferta ? oferta.totalArrecadado - taxa : zero;
  const cotasAResgatar = oferta && preco > zero ? posicao.aportado / preco : zero;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
        {ts.avisoReal}
      </p>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <h2 className="text-sm font-semibold text-on-military">{t.requisitos.title}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {ts.requisitos.map((item) => (
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

      <Card title={ts.termosTitulo}>
        {!oferta ? (
          <p className={leitura.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
            {leitura.errorMessage ? t.investir.erroLeitura(leitura.errorMessage) : t.investir.carregando}
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.estadoLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {t.termos.estados[oferta.estado]}
                  {oferta.pausada && aberta ? ` — ${ts.pausada}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.totalArrecadado}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.totalArrecadado)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.metaMinima}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.metaMinima)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.metaMaxima}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.metaMaxima)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.precoPorCota}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.precoPorCota)}</dd>
              </div>
              <div>
                <dt className="text-xs text-on-military-muted">{t.termos.tetoPorInvestidor}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{fmt(oferta.tetoPorInvestidor)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.termos.prazo}</dt>
                <dd className="mt-0.5 text-sm text-on-military">{formatPrazo(BigInt(oferta.prazo))}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{t.termos.taxaLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">
                  {oferta.taxaBps === 0 ? ts.semTaxa : t.termos.taxaComTaxa((oferta.taxaBps / 100).toFixed(2))}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-on-military-muted">{ts.contaOferta}</dt>
                <dd className="mt-0.5 break-all text-sm">
                  <a href={linkExplorerSolanaConta(oferta.endereco)} target="_blank" rel="noreferrer" className="font-mono text-xs text-salmon hover:text-salmon-600">
                    {oferta.endereco}
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-on-military-muted">{t.termos.nota}</p>
          </>
        )}
      </Card>

      {!conectado && <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">{ts.semCarteira}</p>}

      {conectado && (
        <Card title={ts.faucet.titulo}>
          <p className="text-sm text-on-military-muted">{ts.faucet.descricao}</p>
          <dl className="mt-4 flex items-center justify-between gap-4 text-sm">
            <dt className="text-on-military-muted">{t.faucet.saldoLabel}</dt>
            <dd className="font-mono text-on-military">{fmt(leitura.saldoMbrl)}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-on-military-muted">{t.faucet.quantidadeLabel}</span>
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
              disabled={faucet.ocupado}
              onClick={handleFaucet}
              className="flex items-center gap-2 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Coins className="h-4 w-4" aria-hidden="true" />
              {rotuloBotao(faucet.status, t.faucet.botao)}
            </button>
          </div>
          <Retorno {...faucet} sucesso={t.faucet.sucesso} />
        </Card>
      )}

      {conectado && pronto && oferta && !aberta && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {oferta.estado === "EncerradaSucesso" ? t.investir.ofertaEncerradaSucesso : ts.ofertaEncerradaFalha}
        </p>
      )}

      {conectado && (!pronto || aberta) && (
        <Card title={t.investir.title}>
          {!pronto ? (
            <p className={leitura.errorMessage ? "text-sm text-value-negative" : "text-sm text-on-military-muted"}>
              {leitura.errorMessage ? t.investir.erroLeitura(leitura.errorMessage) : t.investir.carregando}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-on-military-muted">{t.investir.quantidadeLabel}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantidadeCotas}
                    onChange={(e) => setQuantidadeCotas(e.target.value)}
                    className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
                  />
                </label>
                <div className="text-sm text-on-military-muted">
                  {t.investir.valorLabel}: <span className="font-mono text-on-military">{fmt(valorAporte)}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-on-military-muted">{ts.semApprove}</p>

              {valorInvalido && quantidadeCotas !== "" && <p className="mt-2 text-sm text-value-negative">{ts.quantidadeInvalida}</p>}
              {!valorInvalido && excedeCapacidade && <p className="mt-2 text-sm text-value-negative">{ts.excedeCapacidade(fmt(capacidadeRestante))}</p>}
              {!valorInvalido && !excedeCapacidade && excedeTeto && (
                <p className="mt-2 text-sm text-value-negative">{ts.excedeTeto(fmt(tetoRestante < zero ? zero : tetoRestante))}</p>
              )}
              {!valorInvalido && saldoInsuficiente && <p className="mt-2 text-sm text-value-negative">{ts.saldoInsuficiente}</p>}
              {prazoEncerrado && <p className="mt-2 text-sm text-value-negative">{ts.prazoEncerrado}</p>}
              {oferta?.pausada && <p className="mt-2 text-sm text-value-negative">{ts.pausadaTexto}</p>}

              <button
                type="button"
                disabled={investirDesabilitado}
                onClick={handleInvestir}
                className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rotuloBotao(investir.status, t.investir.botao)}
              </button>
              <Retorno {...investir} sucesso={t.investir.status.sucesso} />
            </>
          )}
        </Card>
      )}

      {conectado && oferta && (
        <Card title={t.posicao.title}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.aportado}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{fmt(posicao.aportado)}</dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.saldoParticipacao}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {leitura.saldoCotas.toString()} {oferta.simbolo}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.jaResgatou}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{posicao.cotasResgatadas ? "Sim" : "Não"}</dd>
            </div>
            {posicao.reembolsado && (
              <div>
                <dt className="text-xs text-on-military-muted">{ts.reembolsadoLabel}</dt>
                <dd className="mt-0.5 text-sm text-on-military">Sim</dd>
              </div>
            )}
          </dl>
          {posicao.cotasResgatadas && <p className="mt-3 text-xs text-on-military-muted">{ts.cotasCongeladas}</p>}
        </Card>
      )}

      {conectado && oferta && aberta && (
        <Card title={t.encerrar.title}>
          <p className="text-sm text-on-military-muted">{ts.encerrarDescricao}</p>
          <button
            type="button"
            disabled={!(isSocio || isEmissor) || !podeEncerrarAgora || encerrar.ocupado}
            onClick={handleEncerrar}
            className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rotuloBotao(encerrar.status, t.encerrar.botao)}
          </button>
          {!(isSocio || isEmissor) && <p className="mt-3 text-xs text-on-military-muted">{t.encerrar.restrito}</p>}
          {(isSocio || isEmissor) && !podeEncerrarAgora && <p className="mt-3 text-xs text-on-military-muted">{ts.encerrarAindaNao}</p>}
          <Retorno {...encerrar} sucesso={t.encerrar.sucesso} />
        </Card>
      )}

      {conectado && oferta?.estado === "EncerradaSucesso" && !posicao.cotasResgatadas && posicao.aportado > zero && (
        <Card title={t.resgatar.title}>
          <p className="text-sm text-on-military-muted">{ts.resgatarDescricao(cotasAResgatar.toString(), oferta.simbolo)}</p>
          <button
            type="button"
            disabled={resgatar.ocupado}
            onClick={handleResgatar}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rotuloBotao(resgatar.status, t.resgatar.botao)}
          </button>
          <Retorno {...resgatar} sucesso={t.resgatar.sucesso} />
        </Card>
      )}

      {conectado && oferta?.estado === "EncerradaFalha" && !posicao.reembolsado && posicao.aportado > zero && (
        <Card title={ts.reembolso.titulo}>
          <p className="text-sm text-on-military-muted">{ts.reembolso.descricao(fmt(posicao.aportado))}</p>
          <button
            type="button"
            disabled={reembolsar.ocupado}
            onClick={handleReembolsar}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rotuloBotao(reembolsar.status, ts.reembolso.botao)}
          </button>
          <Retorno {...reembolsar} sucesso={ts.reembolso.sucesso} />
        </Card>
      )}

      {conectado && oferta?.estado === "EncerradaSucesso" && (
        <Card title={t.liberar.title}>
          <p className="text-sm text-on-military-muted">{ts.liberarDescricao}</p>
          {!oferta.recursosLiberados && <p className="mt-2 text-sm text-on-military">{t.liberar.previa(fmt(valorEmissor), fmt(taxa))}</p>}
          {oferta.recursosLiberados ? (
            <p className="mt-4 text-sm text-value-positive">{t.liberar.jaLiberado}</p>
          ) : (
            <>
              <button
                type="button"
                disabled={!isSocio || liberar.ocupado}
                onClick={handleLiberar}
                className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rotuloBotao(liberar.status, t.liberar.botao)}
              </button>
              {!isSocio && <p className="mt-3 text-xs text-on-military-muted">{t.liberar.restrito}</p>}
              <Retorno {...liberar} sucesso={ts.liberarSucesso} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
