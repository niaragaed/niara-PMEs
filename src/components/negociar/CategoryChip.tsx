import { CATEGORY_META } from "@/lib/categories";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";

type ChipSize = "sm" | "md" | "lg";

const BADGE_DIMS: Record<ChipSize, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
};

const ICON_DIMS: Record<ChipSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

// Ícone decorativo isolado, na cor da categoria — usado ao lado de um
// título/heading visível (ex.: cabeçalho da categoria, card do hub).
export function CategoryChip({ categoria, size = "md" }: { categoria: TokenCategory; size?: ChipSize }) {
  const meta = CATEGORY_META[categoria];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${BADGE_DIMS[size]}`}
      style={{ backgroundColor: meta.chipVar }}
      aria-hidden="true"
    >
      <Icon className={ICON_DIMS[size]} style={{ color: meta.iconVar }} />
    </span>
  );
}

// Chip + nome da categoria, como metadado visível de um card (ex.: vitrine
// de ofertas) — diferente de CategoryChip, o texto aqui é a única indicação
// da categoria, então não pode ser decorativo/aria-hidden.
export function CategoryBadge({ categoria, size = "sm" }: { categoria: TokenCategory; size?: "sm" | "md" }) {
  const meta = CATEGORY_META[categoria];
  const Icon = meta.icon;
  const badgeDims = size === "md" ? "h-8 w-8" : "h-6 w-6";
  const iconDims = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md ${badgeDims}`}
        style={{ backgroundColor: meta.chipVar }}
        aria-hidden="true"
      >
        <Icon className={iconDims} style={{ color: meta.iconVar }} />
      </span>
      {ptBr.ativos.categorias[categoria]}
    </span>
  );
}
