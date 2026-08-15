import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";

// Card estático (sem dados on-chain ao vivo — isso fica dentro de /investir/onchain, que já lê
// os hooks reais) apontando para a ÚNICA oferta real em Sepolia da demo. Mesmo padrão visual de
// RealOfferCard.tsx (selo sólido + anel salmão) para nunca se confundir com os ShowcaseCard
// fictícios ao lado — aqui a distinção é ainda mais crítica, porque "real" aqui significa
// transação de blockchain de verdade, não só "linha real no banco".
export function RealOnChainCard() {
  const t = ptBr.negociar.ofertaOnChain;

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-soft ring-2 ring-salmon">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {t.selo}
      </span>

      <h3 className="text-sm font-semibold text-ink">{t.titulo}</h3>
      <p className="text-sm text-ink-muted">{t.descricao}</p>

      <Link
        href="/investir/onchain"
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
      >
        {t.verOferta}
      </Link>
    </div>
  );
}
