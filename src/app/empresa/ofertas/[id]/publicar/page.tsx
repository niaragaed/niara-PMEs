import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { keccak256, toHex } from "viem";
import { PublishOnChainPage } from "@/components/empresa/publicar/PublishOnChainPage";
import { PublishSolanaPage } from "@/components/empresa/publicar/PublishSolanaPage";
import { PublicationNetworkChoice } from "@/components/empresa/publicar/PublicationNetworkChoice";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

// The same three caps locked in the database (supabase/migrations/0001_core.sql: cap_le_15m,
// additional_lot, window_le_180d) and again in OfertaOrquestrador itself — Res. 88 is checked
// twice, in two systems, by design (the chain doesn't blindly trust what Supabase sent). Mirrored
// here only for the pre-validation gate below; never the source of truth (that's the chain, which
// is what actually rejects the transaction).
const MAX_CAP_CENTS = 1_500_000_000; // R$15.000.000
const MAX_DEADLINE_DAYS = 180;

// Phase 3 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — Server Component: checks owner +
// eligibility (status), reads the linked wallet (issuers.wallet_address) and the data that will
// become the transaction's arguments, handing everything ready to the Client Component. No write
// happens here.
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

  // Explicit allowlist — the same golden rule as the rest of the project (never select('*')).
  // base_cap_cents comes in only for the Res. 88 limits gate below (the additional lot is
  // hard_cap_cents relative to base_cap_cents, not an absolute value).
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

  // Pre-validation gate (Phase 3, post-incident fix — see CLAUDE.md, "/empresa/ofertas screen"):
  // the three Res. 88 limits are known BEFORE any signature, without any on-chain read —
  // checking here keeps the issuer from spending gas on a doomed transaction (real incident: an
  // offering with an additional lot of ~500,000% against the 25% limit got signed and reverted on
  // Sepolia before this check existed). It only blocks while the offering has NO recorded attempt
  // yet (`sync_status === 'nao_onchain'`) — an offering already `pendente`/`divergente` must keep
  // reaching PublishOnChainPage.tsx so the normal reconciliation (confirmPublication) runs and
  // records the decoded revert reason, never stuck behind this static block.
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

  // The CNPJ never goes to the client as text — only its hash (bytes32), computed here on the
  // server. The exact format (with or without punctuation) doesn't matter: the only required
  // property is being deterministic and not reversible from the chain, not matching a specific
  // external canonical format.
  const cnpjRef = keccak256(toHex(issuer?.tax_id ?? ""));

  const company = (issuer?.trade_name as string | null) ?? (issuer?.legal_name as string) ?? "";

  // Network (migration 0017): with an attempt recorded or a publication stored, the network is the
  // row's and no longer changes. With none ('nao_onchain'), the issuer chooses — `?rede=solana`
  // opens Solana.
  const hasPublication = offering.sync_status !== "nao_onchain";
  const onSolana = hasPublication
    ? offering.rede === "solana-devnet"
    : chosenNetwork === "solana" || chosenNetwork === "sepolia"
      ? chosenNetwork === "solana"
      : // No ?rede=: the network chosen when the offering was created (offerings.rede).
        offering.rede === "solana-devnet";

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
