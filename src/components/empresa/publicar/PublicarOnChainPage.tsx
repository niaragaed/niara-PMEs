"use client";

// Sub-etapa 3 da Fase 3 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — os 6 gates calculados de
// verdade, botão final sempre desabilitado nesta etapa (sem termo implementado ainda, ver gate
// 6 abaixo). Nenhuma assinatura, nenhuma escrita nas colunas da migration 0015 acontece aqui.
import Link from "next/link";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { GateChecklist, type GateRow } from "./GateChecklist";
import { usePublicarOnChainGates } from "@/lib/web3/hooks/usePublicarOnChainGates";
import { formatToken } from "@/lib/web3/format";
import { ptBr } from "@/lib/i18n/pt-br";

type Props = {
  offeringId: string;
  walletVinculada: string | null;
};

export function PublicarOnChainPage({ walletVinculada }: Props) {
  const t = ptBr.empresaOfertas.publicarOnChain;
  const tg = t.gates;

  const { connection, gateProvider, gateRede, gateSaldo, gateAutorizado, gateTitularidade } =
    usePublicarOnChainGates(walletVinculada);

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
    saldoDetalhe = tg.saldo.reprovado(
      formatToken(gateSaldo.saldoWei, 18, "ETH"),
      formatToken(gateSaldo.custoEstimadoWei, 18, "ETH"),
    );
  } else if (gateSaldo.status === "ok") {
    saldoDetalhe = tg.saldo.ok(formatToken(gateSaldo.saldoWei, 18, "ETH"), formatToken(gateSaldo.custoEstimadoWei, 18, "ETH"));
  }
  const rowSaldo: GateRow = { id: "saldo", label: tg.saldo.label, status: gateSaldo.status, detalhe: saldoDetalhe };

  // ── Gate 4 — emissoresAutorizados on-chain (reaproveita useEmissorAutorizado, que já
  // distingue "chain disse não" de "não consegui perguntar") ────────────────────────────────
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
  // Sem carteira vinculada é uma pré-condição de dado, não a chain/carteira dizendo não —
  // mas ainda assim precisa de ação do usuário, então mostramos como "carregando" (pendente)
  // só quando a causa é puramente "ainda não conectou"; "sem carteira vinculada no banco" é
  // uma reprovação de verdade (a conta precisa ser corrigida em /perfil antes de prosseguir).
  const rowTitularidade: GateRow = {
    id: "titularidade",
    label: tg.titularidade.label,
    status: gateTitularidade.status === "reprovado" && gateTitularidade.motivo === "nao_conectado" ? "carregando" : gateTitularidade.status,
    detalhe: titularidadeDetalhe,
  };

  // ── Gate 6 — termo de publicação (ainda não implementado nesta etapa, ver plano) ────────
  const rowTermo: GateRow = { id: "termo", label: tg.termo.label, status: "reprovado", detalhe: tg.termo.reprovado };

  const rows: GateRow[] = [rowProvider, rowRede, rowSaldo, rowAutorizado, rowTitularidade, rowTermo];
  const pendencias = rows.filter((r) => r.status !== "ok");
  const podeHabilitar = pendencias.length === 0;

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">Demonstração</span> — checklist de
        publicação em Sepolia. Nenhuma transação é assinada nesta etapa.
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <Link href="/empresa/ofertas" className="text-sm text-salmon hover:text-salmon-600">
          {t.voltar}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-on-military">{t.titulo}</h1>
        <p className="mt-1 text-sm text-on-military-muted">{t.subtitulo}</p>

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

        <div className="mt-8 flex flex-col items-start gap-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label={podeHabilitar ? t.botao.label : t.botao.bloqueadoAria}
            title={podeHabilitar ? t.botao.label : t.botao.bloqueadoAria}
            className="cursor-not-allowed rounded-md bg-salmon px-6 py-3 text-sm font-semibold text-on-salmon opacity-60"
          >
            {t.botao.label}
          </button>

          <div className="text-xs text-on-military-muted">
            <p>{t.botao.pendencias}</p>
            <ul className="mt-1 list-inside list-disc">
              {pendencias.map((p) => (
                <li key={p.id}>{p.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
