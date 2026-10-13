import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { keccak256, toHex } from "viem";
import { PublishOnChainPage } from "@/components/empresa/publicar/PublicarOnChainPage";
import { PublishSolanaPage } from "@/components/empresa/publicar/PublicarSolanaPage";
import { PublicationNetworkChoice } from "@/components/empresa/publicar/EscolhaRedePublicacao";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

// Mesmos três tetos travados no banco (supabase/migrations/0001_core.sql: cap_le_15m,
// additional_lot, window_le_180d) e de novo no próprio OfertaOrquestrador — a Res. 88 é checada
// duas vezes, em dois sistemas, por desenho (a chain não confia cegamente no que o Supabase
// mandou). Espelhados aqui só para o gate de pré-validação abaixo; nunca a fonte de verdade (essa
// é a chain, que quem realmente vai rejeitar a transação).
const MAX_CAP_CENTS = 1_500_000_000; // R$15.000.000
const MAX_DEADLINE_DAYS = 180;

// Fase 3 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — Server Component: valida dono +
// elegibilidade (status), lê a carteira vinculada (issuers.wallet_address) e os dados que vão
// virar argumentos da transação, entregando tudo pronto para o Client Component. Nenhuma
// escrita acontece aqui.
export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
  title: `${dict.companyOfferings.publishOnChain.meta.title} · Niara PMEs`,
  description: dict.companyOfferings.publishOnChain.meta.description,
  robots: { index: false, follow: false },
};
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rede?: string }>;
}) {
  const dict = await getDictionary();
  const { id } = await params;
  const { rede: chosenNetwork } = await searchParams;

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
      "id, status, rede, base_cap_cents, target_min_cents, hard_cap_cents, share_price_cents, opens_at, closes_at, sync_status, tx_hash, contract_address, token_address, onchain_last_error",
    )
    .eq("id", id)
    .eq("issuer_id", accountId)
    .maybeSingle();

  if (!offering) {
    notFound();
  }

  const { data: issuer } = await admin
    .from("issuers")
    .select("wallet_address, solana_wallet_address, tax_id, trade_name, legal_name")
    .eq("id", accountId)
    .maybeSingle();

  const linkedWallet = (issuer?.wallet_address as string | null) ?? null;

  if (offering.status !== "draft") {
    const t = dict.companyOfferings.publishOnChain;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.notEligible.title}</h1>
        <p className="max-w-md text-on-military-muted">{t.notEligible.text}</p>
      </main>
    );
  }

  if (offering.share_price_cents === null) {
    const t = dict.companyOfferings.publishOnChain;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.notEligible.title}</h1>
        <p className="max-w-md text-on-military-muted">{t.notEligible.noValuePerShare}</p>
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
  const maxAllowedLotCents = baseCapCents + Math.floor(baseCapCents / 4);

  if (offering.sync_status === "nao_onchain") {
    const t = dict.companyOfferings.publishOnChain;
    const reasons: string[] = [];
    if (hardCapCents > MAX_CAP_CENTS) {
      reasons.push(t.notEligible.res88Limits.cap(formatBRL(hardCapCents / 100)));
    }
    if (hardCapCents > maxAllowedLotCents) {
      reasons.push(
        t.notEligible.res88Limits.additionalLot(
          formatBRL(baseCapCents / 100),
          formatBRL(hardCapCents / 100),
          formatBRL(maxAllowedLotCents / 100),
        ),
      );
    }
    if (windowDays > MAX_DEADLINE_DAYS) {
      reasons.push(t.notEligible.res88Limits.deadline(windowDays));
    }

    if (reasons.length > 0) {
      return (
        <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-military px-6 py-32 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-on-military">{t.notEligible.title}</h1>
          <p className="max-w-md text-on-military-muted">{t.notEligible.res88Limits.intro}</p>
          <ul className="max-w-md list-inside list-disc text-left text-sm text-value-negative">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
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

  const company = (issuer?.trade_name as string | null) ?? (issuer?.legal_name as string) ?? "";

  // Rede (migration 0017): com tentativa registrada ou publicação gravada, a rede é a da linha e não
  // muda mais. Sem nenhuma ('nao_onchain'), o emissor escolhe — `?rede=solana` abre a Solana.
  const hasPublication = offering.sync_status !== "nao_onchain";
  const onSolana = hasPublication ? offering.rede === "solana-devnet" : chosenNetwork === "solana";

  const commonProps = {
    offeringId: offering.id as string,
    companyName: company,
    cnpjRef,
    windowDays: windowDays > 0 ? windowDays : 1,
    targetMinCents: offering.target_min_cents as number,
    hardCapCents: offering.hard_cap_cents as number,
    sharePriceCents: offering.share_price_cents as number,
    syncStatus: offering.sync_status as string,
    txHash: (offering.tx_hash as string | null) ?? null,
    contractAddress: (offering.contract_address as string | null) ?? null,
    tokenAddress: (offering.token_address as string | null) ?? null,
    onchainLastError: (offering.onchain_last_error as string | null) ?? null,
  };

  if (onSolana) {
    return (
      <>
        {!hasPublication && <PublicationNetworkChoice offeringId={offering.id as string} current="solana" />}
        <PublishSolanaPage {...commonProps} linkedWallet={(issuer?.solana_wallet_address as string | null) ?? null} />
      </>
    );
  }

  return (
    <>
      {!hasPublication && <PublicationNetworkChoice offeringId={offering.id as string} current="sepolia" />}
      <PublishOnChainPage
      offeringId={offering.id as string}
      linkedWallet={linkedWallet}
      companyName={company}
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
    </>
  );
}
