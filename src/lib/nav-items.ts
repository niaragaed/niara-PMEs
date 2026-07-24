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
    label: ptBr.nav.negociar,
    href: "#",
    children: [
      { ...ptBr.nav.negociarChildren.ativosTokens, icon: Layers },
      { ...ptBr.nav.negociarChildren.tokenPmes, icon: Building2 },
      { ...ptBr.nav.negociarChildren.tokenAgro, icon: Wheat },
      { ...ptBr.nav.negociarChildren.tokenImobiliario, icon: Home },
      { ...ptBr.nav.negociarChildren.tokenAuto, icon: Car },
      { ...ptBr.nav.negociarChildren.titulosDivida, icon: Landmark },
    ],
  },
  { label: ptBr.nav.ativos, href: "/ativos" },
  { label: ptBr.nav.perfil, href: "/perfil" },
  {
    label: ptBr.nav.sobre,
    href: "#",
    children: [
      { ...ptBr.nav.sobreChildren.documentos, icon: BookOpen },
      { ...ptBr.nav.sobreChildren.contato, icon: Mail },
    ],
  },
];
