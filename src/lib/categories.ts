import { Building2, Car, Home, Landmark, Wheat, type LucideIcon } from "lucide-react";
import type { TokenCategory } from "@/lib/mock/ativos";

export type CategoryMeta = {
  icon: LucideIcon;
  chipVar: string;
  iconVar: string;
  href: string;
};

// Ícone + cor de chip/ícone por categoria (usado nas telas /negociar,
// sempre sobre card branco — ver comentário dos tokens `--color-cat-*`
// em globals.css). Token PMEs reaproveita salmon-100/ink-peach já
// existentes; as demais têm tokens próprios.
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
