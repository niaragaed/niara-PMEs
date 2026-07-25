import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { CATEGORY_META } from "@/lib/categories";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";

// Card branco de categoria no hub "Ativos e tokens" — chip com ícone na cor
// da categoria, nome, 1 linha de descrição e link para a página da categoria.
export function CategoryCard({ categoria }: { categoria: TokenCategory }) {
  const meta = CATEGORY_META[categoria];
  const t = ptBr.negociar.categorias[categoria];

  return (
    <Link
      href={meta.href}
      className="flex h-full flex-col rounded-lg bg-surface p-6 shadow-soft transition-shadow hover:shadow-soft-lg"
    >
      <CategoryChip categoria={categoria} />
      <h3 className="mt-4 text-lg font-semibold text-ink">{ptBr.ativos.categorias[categoria]}</h3>
      <p className="mt-2 flex-1 text-sm text-ink-muted">{t.descricaoCurta}</p>
      <span className="mt-4 text-sm font-medium text-military">{ptBr.negociar.hub.verCategoria}</span>
    </Link>
  );
}
