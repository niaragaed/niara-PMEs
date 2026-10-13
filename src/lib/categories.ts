import { Building2, Car, Home, Landmark, Wheat, type LucideIcon } from "lucide-react";
import type { TokenCategory } from "@/lib/mock/assets";

export type CategoryMeta = {
  icon: LucideIcon;
  chipVar: string;
  iconVar: string;
  href: string;
};

// Icon + chip/icon color per category (used on the /negociar screens,
// always on a white card — see the comment on the `--color-cat-*` tokens
// in globals.css). SME Token reuses the existing salmon-100/ink-peach;
// the others have their own tokens.
export const CATEGORY_META: Record<TokenCategory, CategoryMeta> = {
  pmes: {
    icon: Building2,
    chipVar: "var(--color-salmon-100)",
    iconVar: "var(--color-ink-peach)",
    href: "/negociar/token-pmes",
  },
  agro: {
    icon: Wheat,
    chipVar: "var(--color-military-100)",
    iconVar: "var(--color-cat-agro-icon)",
    href: "/negociar/token-agro",
  },
  imobiliario: {
    icon: Home,
    chipVar: "var(--color-cat-imobiliario-chip)",
    iconVar: "var(--color-cat-imobiliario-icon)",
    href: "/negociar/token-imobiliario",
  },
  auto: {
    icon: Car,
    chipVar: "var(--color-cat-auto-chip)",
    iconVar: "var(--color-cat-auto-icon)",
    href: "/negociar/token-auto",
  },
  divida: {
    icon: Landmark,
    chipVar: "var(--color-cat-divida-chip)",
    iconVar: "var(--color-cat-divida-icon)",
    href: "/negociar/titulos-de-divida",
  },
};
