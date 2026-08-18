import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfertaBanner } from "./OfertaBanner";
import { ptBr } from "@/lib/i18n/pt-br";
import type { Oferta } from "@/lib/mock/ofertas";
import {
  ONCHAIN_PMES_COTAS_AUTORIZADAS,
  ONCHAIN_PMES_META_MAXIMA_MBRL,
  ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
} from "@/lib/web3/demoConstants";

// Card unificado das 10 ofertas PME que têm uma oferta real e ativa em Sepolia por trás — cada
// uma é uma empresa fictícia de demonstração (mesmo padrão de conteúdo de ShowcaseCard), mas o
// investimento é real em blockchain (ver OfertaDetailPage.tsx + RealOnChainInvestPanel.tsx).
// Mesmo idioma visual de RealOfferCard.tsx/antiga RealOnChainCard.tsx (selo sólido + anel
// salmão) — a distinção real/fictício é ainda mais crítica aqui do que nos outros cards, porque
// "real" significa transação de blockchain de verdade, não só uma linha real no banco. A prévia
// de termos usa sempre as constantes fixas do contrato (nunca `oferta.termos`, que é derivado
// delas só para consistência de tipo) e é rotulada em mBRL — nunca "R$", já que MockBRL é moeda
// de teste sem lastro.
export function PmesOnChainCard({
  oferta,
  bannerUrl,
  logoUrl,
}: {
  oferta: Oferta;
  bannerUrl: string | null;
  logoUrl: string | null;
}) {
  const t = ptBr.negociar.pmesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfertaBanner
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
        nomeFantasia={oferta.empresa.nomeFantasia}
        categoria={oferta.categoria}
        size="card"
      />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.selo}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{oferta.empresa.nomeFantasia}</h3>
          <p className="text-xs text-ink-muted">{oferta.empresa.setor}</p>
        </div>

        <p className="text-xs font-medium italic text-ink-muted">{t.empresaFicticia}</p>

        <dl className="mt-1 grid grid-cols-3 gap-x-3 gap-y-2">
          <div>
            <dt className="text-xs text-ink-muted">{t.metaCaptacao}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_PMES_META_MAXIMA_MBRL} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.precoPorCota}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_PMES_PRECO_POR_COTA_MBRL} mBRL</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{t.cotas}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{ONCHAIN_PMES_COTAS_AUTORIZADAS}</dd>
          </div>
        </dl>

        <Link
          href={`/negociar/oferta/${oferta.slug}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.verOferta}
        </Link>
      </div>
    </div>
  );
}
