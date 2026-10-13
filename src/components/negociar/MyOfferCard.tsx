import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { OfferingBanner } from "./OfertaBanner";
import { pt } from "@/lib/i18n/pt-br";
import { formatBRL } from "@/lib/format";
import type { ActiveOfferingSummary } from "@/lib/investments";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Card da PRÓPRIA oferta ativa do issuer logado, na categoria correspondente
// (CategoryPage.tsx, seção "ofertasProprias" — visível só para o dono,
// nunca para outros investidores). Mesmo layout visual de PmesOnChainCard.tsx
// (banner + logo circular sobreposta, via OfertaBanner) para o dono
// reconhecer como a própria oferta ficaria ao lado das 10 PMEs reais em
// Sepolia — mas com um selo deliberadamente NEUTRO (nunca o anel salmão +
// BadgeCheck das ofertas reais/on-chain): esta é uma oferta real no banco
// (grava de verdade, aceita reserva de outros investidores em /investir),
// mas sem nenhuma relação com blockchain. O selo existe para que o dono
// nunca confunda esta pré-visualização com "Real — Sepolia" (REGRA DE
// HONESTIDADE, aqui no sentido de não deixar dois conceitos reais
// diferentes parecerem o mesmo tipo de "real").
export function MyOfferCard({ offering }: { offering: ActiveOfferingSummary }) {
  const t = pt.trade.myOfferingCard;
  const nome = offering.issuerTradeName ?? offering.issuerLegalName;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
      <OfferingBanner
        bannerUrl={offering.bannerUrl}
        logoUrl={offering.logoUrl}
        tradeName={nome}
        category={offering.category}
        size="card"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-semibold text-ink-muted">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{nome}</h3>
          {offering.sector && <p className="text-xs text-ink-muted">{offering.sector}</p>}
        </div>

        <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.fundraisingTarget}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{formatBRL(offering.baseCapCents / 100)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.valuePerShare}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {offering.sharePriceCents !== null ? formatBRL(offering.sharePriceCents / 100) : t.notProvided}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.shareCount}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{offering.sharesCount ?? t.notProvided}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.deadline}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {formatDate(offering.opensAt)} – {formatDate(offering.closesAt)}
            </dd>
          </div>
        </dl>

        <Link
          href={`/investir/${offering.id}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.viewOffering}
        </Link>
      </div>
    </div>
  );
}
