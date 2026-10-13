"use client";
import { CATEGORY_META } from "@/lib/categories";
import type { TokenCategory } from "@/lib/mock/assets";
import { useDictionary } from "@/lib/i18n/client";

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

// A standalone decorative icon, in the category's color — used next to a
// visible title/heading (e.g. the category header, the hub card).
export function CategoryChip({ category: cat, size = "md" }: { category: TokenCategory; size?: ChipSize }) {
  const meta = CATEGORY_META[cat];
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

// Chip + category name, as visible metadata of a card (e.g. the offerings
// showcase) — unlike CategoryChip, the text here is the only indication
// of the category, so it can't be decorative/aria-hidden.
export function CategoryBadge({ category, size = "sm" }: { category: TokenCategory; size?: "sm" | "md" }) {
  const dict = useDictionary();
  const meta = CATEGORY_META[category];
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
      {dict.assets.categories[category]}
    </span>
  );
}
