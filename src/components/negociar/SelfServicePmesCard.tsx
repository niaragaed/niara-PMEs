import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfertaBanner } from "./OfertaBanner";
import { ptBr } from "@/lib/i18n/pt-br";

// Card de vitrine para uma oferta PME self-service (publicada pelo próprio emissor via
// OfertaOrquestrador, ver CLAUDE.md "Tela /empresa/ofertas" → Fase 3) já confirmada on-chain —
// irmã de PmesOnChainCard.tsx (as 10 legadas, empresa fictícia), mas deliberadamente um
// componente separado em vez de generalizar o mesmo card com condicionais: os dados de empresa
// aqui são REAIS (preenchidos pelo próprio emissor), nunca os campos fictícios do mock `Oferta`
// (financeiro, indicadores fundamentalistas etc. — ver SelfServiceOfertaDetailPage.tsx).
//
// Meta/preço/cotas SÃO mostrados aqui (diferente de uma versão anterior deste card, que omitia os
// três por cautela) — são reais e seguros de mostrar sem leitura on-chain por card:
// hardCapCents/sharePriceCents vêm de offerings.hard_cap_cents/share_price_cents, a mesma coluna
// que confirmarPublicacao()/verificarConsistencia() (onchain-actions.ts) já conferem contra o
// metaMaxima/precoPorCota minerados on-chain — para qualquer oferta com sync_status='confirmada',
// este valor já bateu com a chain na hora da confirmação (e seguirá sendo checado a cada
// reconciliação, ver "Reconciliação contínua" no CLAUDE.md). 1 unidade de MockBRL = 1 "real
// equivalente" (comentário de UNIDADE_ON_CHAIN, src/lib/web3/gates.ts) — daí cents/100 → mBRL,
// mesma conversão já usada nas mensagens de diff de verificarConsistencia().
function formatMbrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function SelfServicePmesCard({
  id,
  nome,
  setor,
  bannerUrl,
  logoUrl,
  hardCapCents,
  sharePriceCents,
  sharesCount,
}: {
  id: string;
  nome: string;
  setor: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  hardCapCents: number;
  sharePriceCents: number | null;
  sharesCount: number | null;
}) {
  const t = ptBr.negociar.pmesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfertaBanner bannerUrl={bannerUrl} logoUrl={logoUrl} nomeFantasia={nome} categoria="pmes" size="card" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.selo}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{nome}</h3>
          {setor && <p className="text-xs text-ink-muted">{setor}</p>}
        </div>

        <p className="text-xs font-medium italic text-ink-muted">{t.dadosDoEmissor}</p>

        <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.metaCaptacao}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{formatMbrl(hardCapCents)} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.precoPorCota}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {sharePriceCents === null ? "—" : `${formatMbrl(sharePriceCents)} mBRL`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.cotas}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {sharesCount === null ? "—" : sharesCount.toLocaleString("pt-BR")}
            </dd>
          </div>
        </dl>

        <Link
          href={`/negociar/oferta/${id}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.verOferta}
        </Link>
      </div>
    </div>
  );
}
