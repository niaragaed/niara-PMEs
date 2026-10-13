import {
  BookOpen,
  Building2,
  Car,
  Home,
  Landmark,
  Layers,
  Mail,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type NavChild = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export type NavItem = {
  /** Stable id, independent of the language (the label changes with it). */
  key: "trade" | "assets" | "profile" | "about";
  label: string;
  // Not used when `children` is present (the item becomes a dropdown
  // button, not a link) — kept required only to keep the type simple.
  href: string;
  children?: NavChild[];
};

/** The main navigation (Header and Footer), in the visitor's language. */
export function getNavItems(dict: Dictionary): NavItem[] {
  return [
    {
      key: "trade",
      label: dict.nav.trade,
      href: "#",
      children: [
        { ...dict.nav.tradeChildren.assetsAndTokens, icon: Layers },
        { ...dict.nav.tradeChildren.smesToken, icon: Building2 },
        { ...dict.nav.tradeChildren.tokenAgro, icon: Wheat },
        { ...dict.nav.tradeChildren.realEstateToken, icon: Home },
        { ...dict.nav.tradeChildren.tokenAuto, icon: Car },
        { ...dict.nav.tradeChildren.debtSecurities, icon: Landmark },
      ],
    },
    { key: "assets", label: dict.nav.assets, href: "/ativos" },
    { key: "profile", label: dict.nav.profile, href: "/perfil" },
    {
      key: "about",
      label: dict.nav.about,
      href: "#",
      children: [
        { ...dict.nav.aboutChildren.documents, icon: BookOpen },
        { ...dict.nav.aboutChildren.contact, icon: Mail },
      ],
    },
  ];
}
