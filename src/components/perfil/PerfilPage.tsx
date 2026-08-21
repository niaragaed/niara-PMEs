"use client";

import { ShieldAlert, TrendingUp } from "lucide-react";
import { PerfilProvider, usePerfil } from "./PerfilContext";
import { PerfilNav } from "./PerfilNav";
import { PersonalDataSection } from "./PersonalDataSection";
import { MyOffersSection } from "./MyOffersSection";
import { InvestorProfileSection } from "./InvestorProfileSection";
import { WalletSection } from "./WalletSection";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { ptBr } from "@/lib/i18n/pt-br";
import type { LoadedProfile, OfferingSummary } from "@/app/perfil/actions";

type PerfilPageProps = {
  profile: LoadedProfile;
  offerings: OfferingSummary[];
  aviso?: "apenas-empresa" | "apenas-investidor";
  abrirTesteInvestidor?: boolean;
};

export function PerfilPage({ profile, offerings, aviso, abrirTesteInvestidor }: PerfilPageProps) {
  return (
    <PerfilProvider>
      <main className="isolate flex flex-1 flex-col bg-military">
        <SectionGlow />
        <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
          <span className="font-semibold text-salmon">{ptBr.perfil.demoBanner.label}</span> —{" "}
          {ptBr.perfil.demoBanner.text}
        </div>

        <div className="border-b border-panel-border bg-panel/60 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-xs text-on-military-muted sm:text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0 text-salmon" aria-hidden="true" />
            <span>
              <span className="font-semibold text-on-military">{ptBr.perfil.kyc.naoVerificado}</span>{" "}
              {ptBr.perfil.kyc.aviso}
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-military">{ptBr.perfil.title}</h1>
            <p className="mt-1 text-on-military-muted">{ptBr.perfil.subtitle}</p>
          </div>

          {aviso === "apenas-empresa" && (
            <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
              {ptBr.conta.avisoApenasEmpresa}
            </p>
          )}
          {aviso === "apenas-investidor" && (
            <p className="mt-4 rounded-md border border-salmon/40 bg-salmon/10 px-4 py-3 text-sm text-on-military">
              {ptBr.conta.avisoApenasInvestidor}
            </p>
          )}

          <ProfileBadges />

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <PerfilNav showMinhasOfertas={profile.role === "issuer"} />
            <div className="flex min-w-0 flex-1 flex-col gap-10">
              <PersonalDataSection profile={profile} />
              {profile.role === "issuer" && <MyOffersSection offerings={offerings} />}
              <InvestorProfileSection abrirAutomaticamente={abrirTesteInvestidor} />
              <WalletSection walletAddress={profile.walletAddress} />
            </div>
          </div>
        </div>
      </main>
    </PerfilProvider>
  );
}

function ProfileBadges() {
  const { investorProfile } = usePerfil();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-salmon/40 bg-salmon/10 px-2.5 py-1 text-xs font-medium text-on-military">
        <ShieldAlert className="h-3.5 w-3.5 text-salmon" aria-hidden="true" />
        {ptBr.perfil.kyc.naoVerificado}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-panel-border bg-military-600/40 px-2.5 py-1 text-xs font-medium text-on-military">
        <TrendingUp className="h-3.5 w-3.5 text-salmon" aria-hidden="true" />
        {ptBr.perfil.badges.perfilPrefix}: {ptBr.perfil.investidor.categorias[investorProfile.category]}
      </span>
    </div>
  );
}
