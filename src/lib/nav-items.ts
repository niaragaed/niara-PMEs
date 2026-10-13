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
import { pt } from "@/lib/i18n/pt-br";

export type NavChild = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export type NavItem = {
  label: string;
  // Não usado quando `children` está presente (o item vira um botão de
  // dropdown, não um link) — mantido obrigatório só para simplificar o tipo.
  href: string;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: pt.nav.trade,
    href: "#",
    children: [
      { ...pt.nav.tradeChildren.assetsAndTokens, icon: Layers },
      { ...pt.nav.tradeChildren.smesToken, icon: Building2 },
      { ...pt.nav.tradeChildren.tokenAgro, icon: Wheat },
      { ...pt.nav.tradeChildren.realEstateToken, icon: Home },
      { ...pt.nav.tradeChildren.tokenAuto, icon: Car },
      { ...pt.nav.tradeChildren.debtSecurities, icon: Landmark },
    ],
  },
  { label: pt.nav.assets, href: "/ativos" },
  { label: pt.nav.profile, href: "/perfil" },
  {
    label: pt.nav.about,
    href: "#",
    children: [
      { ...pt.nav.aboutChildren.documents, icon: BookOpen },
      { ...pt.nav.aboutChildren.contact, icon: Mail },
    ],
  },
];
