import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { keccak256, toHex } from "viem";
import { PublicarOnChainPage } from "@/components/empresa/publicar/PublicarOnChainPage";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { ptBr } from "@/lib/i18n/pt-br";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";

// Mesmos três tetos travados no banco (supabase/migrations/0001_core.sql: cap_le_15m,
// additional_lot, window_le_180d) e de novo no próprio OfertaOrquestrador — a Res. 88 é checada
// duas vezes, em dois sistemas, por desenho (a chain não confia cegamente no que o Supabase
// mandou). Espelhados aqui só para o gate de pré-validação abaixo; nunca a fonte de verdade (essa
// é a chain, que quem realmente vai rejeitar a transação).
const TETO_MAXIMO_CENTS = 1_500_000_000; // R$15.000.000
const PRAZO_MAXIMO_DIAS = 180;

// Fase 3 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — Server Component: valida dono +
// elegibilidade (status), lê a carteira vinculada (issuers.wallet_address) e os dados que vão
// virar argumentos da transação, entregando tudo pronto para o Client Component. Nenhuma
// escrita acontece aqui.
export const metadata: Metadata = {
  title: `${ptBr.empresaOfertas.publicarOnChain.meta.title} · Niara PMEs`,
  description: ptBr.empresaOfertas.publicarOnChain.meta.description,
  robots: { index: false, follow: false },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    redirect("/conta?aviso=apenas-empresa");
  }

  const admin = createAdminClient();

  // Lista branca explícita — mesma regra de ouro do resto do projeto (nunca select('*')).
  // base_cap_cents entra aqui só para o gate de limites da Res. 88 abaixo (lote adicional é
  // hard_cap_cents em relação a base_cap_cents, não um valor absoluto).
  const { data: offering } = await admin
    .from("offerings")
    .select(
      "id, status, base_cap_cents, target_min_cents, hard_cap_cents, share_price_cents, opens_at, closes_at, sync_status, tx_hash, contract_address, token_address, onchain_last_error",
    )
    .eq("id", id)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (!offering) {
    notFound();
  }

  const { data: issuer } = await admin
    .from("issuers")
    .select("wallet_address, tax_id, trade_name, legal_name")
    .eq("id", accountId)
    .maybeSingle();

  const walletVinculada = (issuer?.wallet_address as string | null) ?? null;

  if (offering.status !== "draft") {
    const t = ptBr.empresaOfertas.publicarOnChain;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.naoElegivel.titulo}</h1>
        <p className="max-w-md text-on-military-muted">{t.naoElegivel.texto}</p>
      </main>
    );
  }

  if (offering.share_price_cents === null) {
    const t = ptBr.empresaOfertas.publicarOnChain;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.naoElegivel.titulo}</h1>
        <p className="max-w-md text-on-military-muted">{t.naoElegivel.semValorPorCota}</p>
      </main>
    );
  }

  const windowDays = Math.round(
    (new Date(offering.closes_at as string).getTime() - new Date(offering.opens_at as string).getTime()) / MS_PER_DAY,
  );

  // Gate de pré-validação (Fase 3, correção pós-incidente — ver CLAUDE.md, "Tela /empresa/ofertas"):
  // os três limites da Res. 88 são conhecidos ANTES de qualquer assinatura, sem precisar de
  // nenhuma leitura on-chain — checar aqui evita o emissor gastar gás numa transação condenada
  // (incidente real: uma oferta com lote adicional de ~500.000% contra o limite de 25% chegou a
  // ser assinada e revertida em Sepolia antes desta checagem existir). Só bloqueia enquanto a
  // oferta ainda não tem NENHUMA tentativa registrada (`sync_status === 'nao_onchain'`) — uma
  // oferta já `pendente`/`divergente` precisa continuar chegando em PublicarOnChainPage.tsx para a
  // reconciliação normal (confirmarPublicacao) rodar e gravar o motivo decodificado do revert,
  // nunca ficar presa atrás deste bloqueio estático.
  const baseCapCents = offering.base_cap_cents as number;
  const hardCapCents = offering.hard_cap_cents as number;
  const loteMaximoPermitidoCents = baseCapCents + Math.floor(baseCapCents / 4);

  if (offering.sync_status === "nao_onchain") {
    const t = ptBr.empresaOfertas.publicarOnChain;
    const motivos: string[] = [];
    if (hardCapCents > TETO_MAXIMO_CENTS) {
      motivos.push(t.naoElegivel.limitesRes88.teto(formatBRL(hardCapCents / 100)));
    }
    if (hardCapCents > loteMaximoPermitidoCents) {
      motivos.push(
        t.naoElegivel.limitesRes88.loteAdicional(
          formatBRL(baseCapCents / 100),
          formatBRL(hardCapCents / 100),
          formatBRL(loteMaximoPermitidoCents / 100),
        ),
      );
    }
    if (windowDays > PRAZO_MAXIMO_DIAS) {
      motivos.push(t.naoElegivel.limitesRes88.prazo(windowDays));
    }

    if (motivos.length > 0) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.naoElegivel.titulo}</h1>
          <p className="max-w-md text-on-military-muted">{t.naoElegivel.limitesRes88.intro}</p>
          <ul className="max-w-md list-inside list-disc text-left text-sm text-value-negative">
            {motivos.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
        </main>
      );
    }
  }

  // CNPJ nunca vai ao cliente em texto — só o hash (bytes32), calculado aqui no servidor. O
  // valor exato do formato (com ou sem pontuação) não importa: a única propriedade exigida é
  // ser determinístico e não reversível a partir da chain, não bater com um formato canônico
  // externo específico.
  const cnpjRef = keccak256(toHex(issuer?.tax_id ?? ""));

  const empresa = (issuer?.trade_name as string | null) ?? (issuer?.legal_name as string) ?? "";

  return (
    <PublicarOnChainPage
      offeringId={offering.id as string}
      walletVinculada={walletVinculada}
      empresaNome={empresa}
      cnpjRef={cnpjRef}
      windowDays={windowDays > 0 ? windowDays : 1}
      targetMinCents={offering.target_min_cents as number}
      hardCapCents={offering.hard_cap_cents as number}
      sharePriceCents={offering.share_price_cents as number}
      syncStatus={offering.sync_status as string}
      txHash={(offering.tx_hash as string | null) ?? null}
      contractAddress={(offering.contract_address as string | null) ?? null}
      tokenAddress={(offering.token_address as string | null) ?? null}
      onchainLastError={(offering.onchain_last_error as string | null) ?? null}
    />
  );
}
