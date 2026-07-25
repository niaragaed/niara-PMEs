"use client";

import { useState } from "react";
import { AllocationDonut } from "./AllocationDonut";
import { PortfolioEvolutionChart } from "./PortfolioEvolutionChart";
import { PortfolioSummary } from "./PortfolioSummary";
import { PositionsTable } from "./PositionsTable";
import { ptBr } from "@/lib/i18n/pt-br";

type Tab = "carteira" | "disponiveis";

export function AtivosPage() {
  const [tab, setTab] = useState<Tab>("carteira");

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.ativos.demoBanner.label}</span> —{" "}
        {ptBr.ativos.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{ptBr.ativos.title}</h1>
        <p className="mt-1 text-on-military-muted">{ptBr.ativos.subtitle}</p>

        <div
          role="tablist"
          aria-label={ptBr.ativos.title}
          className="mt-6 inline-flex flex-wrap gap-1 rounded-full bg-military-600/40 p-1"
        >
          <button
            type="button"
            role="tab"
            id="ativos-tab-carteira"
            aria-selected={tab === "carteira"}
            aria-controls="ativos-panel-carteira"
            onClick={() => setTab("carteira")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "carteira" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
            }`}
          >
            {ptBr.ativos.tabs.carteira}
          </button>
          <button
            type="button"
            role="tab"
            id="ativos-tab-disponiveis"
            aria-selected={tab === "disponiveis"}
            aria-controls="ativos-panel-disponiveis"
            onClick={() => setTab("disponiveis")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "disponiveis" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
            }`}
          >
            {ptBr.ativos.tabs.disponiveis}
          </button>
        </div>

        {tab === "carteira" ? (
          <div
            id="ativos-panel-carteira"
            role="tabpanel"
            aria-labelledby="ativos-tab-carteira"
            className="mt-8 flex flex-col gap-6"
          >
            <PortfolioSummary />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <PortfolioEvolutionChart />
              </div>
              <div className="lg:col-span-5">
                <AllocationDonut />
              </div>
            </div>
            <PositionsTable />
          </div>
        ) : (
          <div
            id="ativos-panel-disponiveis"
            role="tabpanel"
            aria-labelledby="ativos-tab-disponiveis"
            className="mt-8 rounded-lg border border-panel-border bg-panel p-6 text-sm text-on-military-muted"
          >
            {ptBr.common.emConstrucao}
          </div>
        )}
      </div>
    </main>
  );
}
