import Link from "next/link";
import { CategoryBadge } from "./CategoryChip";
import type { Offering } from "@/lib/mock/ofertas";
import { getDictionary } from "@/lib/i18n/server";

// Card de "vitrine (demonstração)" — reutilizado no hub e no template de
// categoria. Card branco sobre o fundo military cheio das telas /negociar.
export async function ShowcaseCard({ offering: oferta }: { offering: Offering }) {
  const dict = await getDictionary();
  return (
    <div className="flex h-full flex-col gap-3 rounded-lg bg-surface p-5 shadow-soft">
      <CategoryBadge category={oferta.category} />
      <h3 className="text-sm font-semibold text-ink">{oferta.name}</h3>
      <p className="flex-1 text-xs font-medium text-ink-muted">{dict.trade.showcase.exampleTag}</p>
      <Link
        href={`/negociar/oferta/${oferta.slug}`}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon transition-colors hover:bg-salmon-600"
      >
        {dict.trade.showcase.viewDetails}
      </Link>
    </div>
  );
}
