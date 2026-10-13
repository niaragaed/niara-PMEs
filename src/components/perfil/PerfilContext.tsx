"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_INVESTOR_PROFILE, type InvestorProfileResult } from "@/lib/investor-profile";

// State only in memory (React), never in localStorage/sessionStorage — it's gone
// when the page reloads, like the rest of the profile screen.
type ProfileContextValue = {
  investorProfile: InvestorProfileResult;
  setInvestorProfile: (result: InvestorProfileResult) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [investorProfile, setInvestorProfile] = useState<InvestorProfileResult>(DEFAULT_INVESTOR_PROFILE);

  const value = useMemo<ProfileContextValue>(
    () => ({ investorProfile, setInvestorProfile }),
    [investorProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
