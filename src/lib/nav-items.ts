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
import { ptBr } from "@/lib/i18n/pt-br";

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
    label: ptBr.nav.trade,
    href: "#",
    children: [
      { ...ptBr.nav.tradeChildren.assetsAndTokens, icon: Layers },
      { ...ptBr.nav.tradeChildren.smesToken, icon: Building2 },
      { ...ptBr.nav.tradeChildren.tokenAgro, icon: Wheat },
      { ...ptBr.nav.tradeChildren.realEstateToken, icon: Home },
      { ...ptBr.nav.tradeChildren.tokenAuto, icon: Car },
      { ...ptBr.nav.tradeChildren.debtSecurities, icon: Landmark },
    ],
  },
  { label: ptBr.nav.assets, href: "/ativos" },
  { label: ptBr.nav.profile, href: "/perfil" },
  {
    label: ptBr.nav.about,
    href: "#",
    children: [
      { ...ptBr.nav.aboutChildren.documents, icon: BookOpen },
      { ...ptBr.nav.aboutChildren.contact, icon: Mail },
    ],
  },
];
