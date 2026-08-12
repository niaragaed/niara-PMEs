import Link from "next/link";
import { BadgeCheck, Building2 } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";
import { formatBRL } from "@/lib/format";
import type { ActiveOfferingSummary } from "@/lib/investments";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Card de oferta REAL (offerings.status = 'active'). Renderizado em dois
// contextos, sempre a partir de CategoryPage.tsx: (1) investidor logado, com
// isOwner=false — selo "Oferta real", leva à reserva na página de detalhe;
// (2) issuer logado vendo a PRÓPRIA oferta (isOwner=true) — selo "Sua
// oferta"; a página de detalhe (/investir/[offeringId]) já esconde o botão
// de reserva sozinha para o dono, então nenhum outro ajuste é necessário
// aqui além do texto do selo. Visualmente distinto do ShowcaseCard fictício
// de propósito: selo sólido + anel salmão em volta do card, para ninguém
// confundir os dois na mesma tela (REGRA DE HONESTIDADE).
export function RealOfferCard({ oferta, isOwner = false }: { oferta: ActiveOfferingSummary; isOwner?: boolean }) {
  const t = ptBr.negociar.ofertaReal;
  const nome = oferta.issuerTradeName ?? oferta.issuerLegalName;

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-soft ring-2 ring-salmon">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {isOwner ? t.seloProprio : t.selo}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-alt">
          {oferta.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- vem do bucket público do Supabase Storage, não passa pelo otimizador do next/image
            <img src={oferta.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">{nome}</h3>
          {oferta.sector && <p className="text-xs text-ink-muted">{oferta.sector}</p>}
        </div>
      </div>

      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <dt className="text-xs text-ink-muted">{t.metaCaptacao}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{formatBRL(oferta.baseCapCents / 100)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.valorPorCota}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {oferta.sharePriceCents !== null ? formatBRL(oferta.sharePriceCents / 100) : t.naoInformado}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.numeroCotas}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">{oferta.sharesCount ?? t.naoInformado}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">{t.prazo}</dt>
          <dd className="mt-0.5 text-sm font-medium text-ink">
            {formatDate(oferta.opensAt)} – {formatDate(oferta.closesAt)}
          </dd>
        </div>
      </dl>

      <Link
        href={`/investir/${oferta.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
      >
        {t.verOferta}
      </Link>
    </div>
  );
}
