"use client";

// Painel de investimento real em Sepolia — extraído de OnChainInvestPage.tsx para ser
// reutilizável também dentro da página de detalhe das ofertas PMEs unificadas
// (OfertaDetailPage.tsx, ver CLAUDE.md "Tela /negociar"). Refatoração pura: nenhuma regra de
// negócio on-chain mudou, só o componente ganhou uma fronteira própria (`{ ofertaIndex }`).
//
// O chamador é responsável por remontar este componente ao trocar de oferta
// (`key={ofertaIndex}`) — isso reseta de graça todo o estado local (quantidade, status de
// invest/encerrar/resgatar, campo do faucet), sem precisar de resets manuais.
//
// `isSocio` (resolvido no servidor via resolveSocio(), repassado pelas duas páginas host —
// OnChainInvestPage.tsx e OfertaDetailPage.tsx) só bloqueia o BOTÃO "Encerrar oferta" nesta
// interface — o contrato OfertaCaptacao.encerrar() continua permissionless de verdade (qualquer
// carteira poderia chamar via Etherscan/outro dApp); é uma restrição de produto, não uma
// mudança na regra on-chain. Nunca usar isso para decidir mostrar/esconder o resto do painel.
import { useMemo, useState, type ChangeEvent } from "react";
import { useConnection } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AlertTriangle, CheckCircle2, Coins } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import {
  useMinhaPosicaoOnChain,
  useOfertaOnChainTermos,
  type EstadoOferta,
} from "@/lib/web3/hooks/useOfertaOnChain";
import {
  useEncerrarOferta,
  useInvestirOnChain,
  useLiberarParaEmissor,
  useMintMockBrl,
  useResgatarCotas,
} from "@/lib/web3/hooks/useOnChainActions";
import { formatPrazo, formatToken } from "@/lib/web3/format";
import { ptBr } from "@/lib/i18n/pt-br";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-panel-border bg-panel p-6">
      <h2 className="text-lg font-semibold text-on-military">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FaucetCard({
  saldoMockBrl,
  mockBrlDecimals,
  mockBrlSymbol,
  disabled,
  onMinted,
}: {
  saldoMockBrl: bigint;
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  disabled: boolean;
  onMinted: () => void;
}) {
  const t = ptBr.investirOnChain.faucet;
  const [quantidade, setQuantidade] = useState("100");
  const { status, errorMessage, mint } = useMintMockBrl();

  const isBusy = status === "assinando" || status === "confirmando";

  async function handleMint() {
    const parsed = Number(quantidade.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    await mint(BigInt(Math.round(parsed)) * BigInt(10) ** BigInt(mockBrlDecimals));
    onMinted();
  }

  return (
    <Card title={t.title}>
      <p className="text-sm text-on-military-muted">{t.descricao}</p>

      <dl className="mt-4 flex items-center justify-between gap-4 text-sm">
        <dt className="text-on-military-muted">{t.saldoLabel}</dt>
        <dd className="font-mono text-on-military">
          {formatToken(saldoMockBrl, mockBrlDecimals, mockBrlSymbol)}
        </dd>
      </dl>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-on-military-muted">{t.quantidadeLabel}</span>
          <input
            type="text"
            inputMode="decimal"
            value={quantidade}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantidade(event.target.value)}
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
          {status === "assinando" ? t.assinando : status === "confirmando" ? t.confirmando : t.botao}
        </button>
      </div>

      {status === "sucesso" && (
        <p role="status" className="mt-3 text-sm text-value-positive">
          {t.sucesso}
        </p>
      )}
      {status === "erro" && errorMessage && (
        <p role="alert" className="mt-3 text-sm text-value-negative">
          {errorMessage}
        </p>
      )}
    </Card>
  );
}

export function RealOnChainInvestPanel({
  ofertaIndex,
  isSocio = false,
}: {
  ofertaIndex: number;
  isSocio?: boolean;
}) {
  const t = ptBr.investirOnChain;
  const connection = useConnection();
  const isOnSepolia = connection.chainId === sepolia.id;
  const podeOperar = connection.isConnected && isOnSepolia;

  const termos = useOfertaOnChainTermos(ofertaIndex);
  const posicao = useMinhaPosicaoOnChain(ofertaIndex);

  const [quantidadeCotas, setQuantidadeCotas] = useState("1");
  const invest = useInvestirOnChain(ofertaIndex);
  const encerrar = useEncerrarOferta(ofertaIndex);
  const resgatar = useResgatarCotas(ofertaIndex);
  const liberar = useLiberarParaEmissor(ofertaIndex);

  const quantidadeBigInt = useMemo(() => {
    const parsed = quantidadeCotas.trim();
    if (!/^\d+$/.test(parsed)) return BigInt(0);
    try {
      return BigInt(parsed);
    } catch {
      return BigInt(0);
    }
  }, [quantidadeCotas]);

  const valorAporte = quantidadeBigInt * termos.precoPorCota;
  const capacidadeRestante = termos.metaMaxima - termos.totalArrecadado;
  const tetoRestanteInvestidor = termos.tetoPorInvestidor - posicao.aportado;

  const excedeCapacidade = valorAporte > capacidadeRestante;
  const excedeTeto = valorAporte > tetoRestanteInvestidor;
  const saldoInsuficiente = valorAporte > posicao.saldoMockBrl;
  const valorInvalido = valorAporte <= BigInt(0);

  const investirDesabilitado =
    !podeOperar ||
    termos.estado !== "Aberta" ||
    valorInvalido ||
    excedeCapacidade ||
    excedeTeto ||
    saldoInsuficiente ||
    (invest.status !== "idle" && invest.status !== "sucesso" && invest.status !== "erro");

  async function handleInvestir() {
    await invest.investir(valorAporte, posicao.allowanceMockBrl);
    termos.refetch();
    posicao.refetch();
  }

  async function handleEncerrar() {
    await encerrar.encerrar();
    termos.refetch();
  }

  async function handleResgatar() {
    await resgatar.resgatar();
    termos.refetch();
    posicao.refetch();
  }

  async function handleLiberar() {
    await liberar.liberar();
    termos.refetch();
  }

  const BPS_DENOMINADOR = BigInt(10_000);
  const taxaWei = (termos.totalArrecadado * termos.taxaBps) / BPS_DENOMINADOR;
  const valorEmissorWei = termos.totalArrecadado - taxaWei;

  if (!termos.configurado) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-salmon/40 bg-panel p-5 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-salmon" aria-hidden="true" />
        <p>{t.contratoNaoConfigurado}</p>
      </div>
    );
  }

  const estadoLabel: Record<EstadoOferta, string> = t.termos.estados;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
        {t.avisoReal}
      </p>

      <div className="rounded-lg border border-panel-border bg-panel p-5">
        <h2 className="text-sm font-semibold text-on-military">{t.requisitos.title}</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {t.requisitos.itens.map((item) => (
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

      <Card title={t.termos.title}>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.estadoLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {termos.estado ? estadoLabel[termos.estado] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.totalArrecadado}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(termos.totalArrecadado, termos.mockBrlDecimals, termos.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.metaMinima}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(termos.metaMinima, termos.mockBrlDecimals, termos.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.metaMaxima}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(termos.metaMaxima, termos.mockBrlDecimals, termos.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.precoPorCota}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(termos.precoPorCota, termos.mockBrlDecimals, termos.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.termos.tetoPorInvestidor}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {formatToken(termos.tetoPorInvestidor, termos.mockBrlDecimals, termos.mockBrlSymbol)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-on-military-muted">{t.termos.prazo}</dt>
            <dd className="mt-0.5 text-sm text-on-military">{formatPrazo(termos.prazo)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-on-military-muted">{t.termos.taxaLabel}</dt>
            <dd className="mt-0.5 text-sm text-on-military">
              {termos.taxaBps === BigInt(0)
                ? t.termos.taxaSemTaxa
                : t.termos.taxaComTaxa((Number(termos.taxaBps) / 100).toFixed(2))}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-on-military-muted">{t.termos.nota}</p>
      </Card>

      {!connection.isConnected && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {t.semCarteira}
        </p>
      )}

      {podeOperar && (
        <FaucetCard
          saldoMockBrl={posicao.saldoMockBrl}
          mockBrlDecimals={termos.mockBrlDecimals}
          mockBrlSymbol={termos.mockBrlSymbol}
          disabled={!podeOperar}
          onMinted={() => posicao.refetch()}
        />
      )}

      {podeOperar && termos.estado !== null && termos.estado !== "Aberta" && (
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
          {termos.estado === "EncerradaSucesso" ? t.investir.ofertaEncerradaSucesso : t.investir.ofertaEncerradaFalha}
        </p>
      )}

      {podeOperar && termos.estado === "Aberta" && (
        <Card title={t.investir.title}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-on-military-muted">{t.investir.quantidadeLabel}</span>
              <input
                type="text"
                inputMode="numeric"
                value={quantidadeCotas}
                onChange={(event) => setQuantidadeCotas(event.target.value)}
                className="w-32 rounded-md border border-panel-border bg-military px-3 py-2 text-on-military focus:outline-none focus:ring-2 focus:ring-salmon"
              />
            </label>
            <div className="text-sm text-on-military-muted">
              {t.investir.valorLabel}:{" "}
              <span className="font-mono text-on-military">
                {formatToken(valorAporte, termos.mockBrlDecimals, termos.mockBrlSymbol)}
              </span>
            </div>
          </div>

          <p className="mt-2 text-xs text-on-military-muted">{t.investir.allowanceNota}</p>

          {valorInvalido && quantidadeCotas !== "" && (
            <p className="mt-2 text-sm text-value-negative">Informe uma quantidade de cotas válida.</p>
          )}
          {!valorInvalido && excedeCapacidade && (
            <p className="mt-2 text-sm text-value-negative">
              Esse valor ultrapassa a capacidade restante da oferta (
              {formatToken(capacidadeRestante, termos.mockBrlDecimals, termos.mockBrlSymbol)}).
            </p>
          )}
          {!valorInvalido && !excedeCapacidade && excedeTeto && (
            <p className="mt-2 text-sm text-value-negative">
              Esse valor ultrapassa o teto por investidor (
              {formatToken(tetoRestanteInvestidor, termos.mockBrlDecimals, termos.mockBrlSymbol)} restantes).
            </p>
          )}
          {!valorInvalido && saldoInsuficiente && (
            <p className="mt-2 text-sm text-value-negative">Saldo de MockBRL insuficiente — use o faucet acima.</p>
          )}

          <button
            type="button"
            disabled={investirDesabilitado}
            onClick={handleInvestir}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {invest.status === "idle" || invest.status === "sucesso" || invest.status === "erro"
              ? t.investir.botao
              : t.investir.status[invest.status]}
          </button>

          {invest.status === "sucesso" && (
            <p role="status" className="mt-3 flex items-center gap-2 text-sm text-value-positive">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t.investir.status.sucesso}
            </p>
          )}
          {invest.status === "erro" && invest.errorMessage && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {invest.errorMessage}
            </p>
          )}
        </Card>
      )}

      {podeOperar && (
        <Card title={t.posicao.title}>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.aportado}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {formatToken(posicao.aportado, termos.mockBrlDecimals, termos.mockBrlSymbol)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.saldoParticipacao}</dt>
              <dd className="mt-0.5 text-sm text-on-military">
                {formatToken(
                  posicao.saldoParticipacaoToken,
                  termos.participacaoTokenDecimals,
                  termos.participacaoTokenSymbol,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-on-military-muted">{t.posicao.jaResgatou}</dt>
              <dd className="mt-0.5 text-sm text-on-military">{posicao.jaResgatouCotas ? "Sim" : "Não"}</dd>
            </div>
          </dl>
        </Card>
      )}

      {podeOperar && termos.estado === "Aberta" && (
        <Card title={t.encerrar.title}>
          <p className="text-sm text-on-military-muted">{t.encerrar.descricao}</p>
          <button
            type="button"
            disabled={!isSocio || encerrar.status === "assinando" || encerrar.status === "confirmando"}
            onClick={handleEncerrar}
            className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
          >
            {encerrar.status === "assinando"
              ? t.encerrar.assinando
              : encerrar.status === "confirmando"
                ? t.encerrar.confirmando
                : t.encerrar.botao}
          </button>
          {!isSocio && <p className="mt-3 text-xs text-on-military-muted">{t.encerrar.restrito}</p>}
          {encerrar.status === "sucesso" && (
            <p role="status" className="mt-3 text-sm text-value-positive">
              {t.encerrar.sucesso}
            </p>
          )}
          {encerrar.status === "erro" && encerrar.errorMessage && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {encerrar.errorMessage}
            </p>
          )}
        </Card>
      )}

      {podeOperar &&
        termos.estado === "EncerradaSucesso" &&
        !posicao.jaResgatouCotas &&
        posicao.aportado > BigInt(0) && (
        <Card title={t.resgatar.title}>
          <p className="text-sm text-on-military-muted">{t.resgatar.descricao}</p>
          <button
            type="button"
            disabled={resgatar.status === "assinando" || resgatar.status === "confirmando"}
            onClick={handleResgatar}
            className="mt-4 rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon hover:bg-salmon-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resgatar.status === "assinando"
              ? t.resgatar.assinando
              : resgatar.status === "confirmando"
                ? t.resgatar.confirmando
                : t.resgatar.botao}
          </button>
          {resgatar.status === "sucesso" && (
            <p role="status" className="mt-3 text-sm text-value-positive">
              {t.resgatar.sucesso}
            </p>
          )}
          {resgatar.status === "erro" && resgatar.errorMessage && (
            <p role="alert" className="mt-3 text-sm text-value-negative">
              {resgatar.errorMessage}
            </p>
          )}
        </Card>
      )}

      {podeOperar && termos.estado === "EncerradaSucesso" && (
        <Card title={t.liberar.title}>
          <p className="text-sm text-on-military-muted">{t.liberar.descricao}</p>
          {!termos.recursosLiberados && (
            <p className="mt-2 text-sm text-on-military">
              {t.liberar.previa(
                formatToken(valorEmissorWei, termos.mockBrlDecimals, termos.mockBrlSymbol),
                formatToken(taxaWei, termos.mockBrlDecimals, termos.mockBrlSymbol),
              )}
            </p>
          )}
          {termos.recursosLiberados ? (
            <p className="mt-4 text-sm text-value-positive">{t.liberar.jaLiberado}</p>
          ) : (
            <>
              <button
                type="button"
                disabled={!isSocio || liberar.status === "assinando" || liberar.status === "confirmando"}
                onClick={handleLiberar}
                className="mt-4 rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-on-military hover:border-salmon disabled:cursor-not-allowed disabled:opacity-60"
              >
                {liberar.status === "assinando"
                  ? t.liberar.assinando
                  : liberar.status === "confirmando"
                    ? t.liberar.confirmando
                    : t.liberar.botao}
              </button>
              {!isSocio && <p className="mt-3 text-xs text-on-military-muted">{t.liberar.restrito}</p>}
              {liberar.status === "sucesso" && (
                <p role="status" className="mt-3 text-sm text-value-positive">
                  {t.liberar.sucesso}
                </p>
              )}
              {liberar.status === "erro" && liberar.errorMessage && (
                <p role="alert" className="mt-3 text-sm text-value-negative">
                  {liberar.errorMessage}
                </p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
