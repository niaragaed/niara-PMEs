import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { CATEGORY_META } from "@/lib/categories";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getDictionary } from "@/lib/i18n/server";

// Card branco de categoria no hub "Ativos e tokens" — chip com ícone na cor
// da categoria, nome, 1 linha de descrição e link para a página da categoria.
export async function CategoryCard({ category }: { category: TokenCategory }) {
  const dict = await getDictionary();
  const meta = CATEGORY_META[category];
  const t = dict.trade.categories[category];

  return (
    <Link
      href={meta.href}
      className="flex h-full flex-col rounded-lg bg-surface p-6 shadow-soft transition-shadow hover:shadow-soft-lg"
    >
      <CategoryChip category={category} />
      <h3 className="mt-4 text-lg font-semibold text-ink">{dict.assets.categories[category]}</h3>
      <p className="mt-2 flex-1 text-sm text-ink-muted">{t.shortDescription}</p>
      <span className="mt-4 text-sm font-medium text-military">{dict.trade.hub.viewCategory}</span>
    </Link>
  );
}
