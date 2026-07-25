"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_INVESTOR_PROFILE, type InvestorProfileResult } from "@/lib/investor-profile";

// Estado só em memória (React), nunca em localStorage/sessionStorage — some
// ao recarregar a página, como o resto da tela de perfil.
type PerfilContextValue = {
  investorProfile: InvestorProfileResult;
  setInvestorProfile: (result: InvestorProfileResult) => void;
};

const PerfilContext = createContext<PerfilContextValue | null>(null);

export function usePerfil(): PerfilContextValue {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil precisa estar dentro de <PerfilProvider>");
  return ctx;
}

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [investorProfile, setInvestorProfile] = useState<InvestorProfileResult>(DEFAULT_INVESTOR_PROFILE);

  const value = useMemo<PerfilContextValue>(
    () => ({ investorProfile, setInvestorProfile }),
    [investorProfile],
  );

  return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}
