"use client";

import { useState } from "react";
import { AllocationDonut } from "./AllocationDonut";
import { AssetCatalog } from "./AssetCatalog";
import { PortfolioEvolutionChart } from "./PortfolioEvolutionChart";
import { PortfolioSummary } from "./PortfolioSummary";
import { PositionsTable } from "./PositionsTable";
import { RealPositionCard } from "./RealPositionCard";
import { SectionGlow } from "@/components/ui/SectionGlow";
import { useDictionary } from "@/lib/i18n/client";

type Tab = "portfolio" | "available";

export function AssetsPage() {
  const dict = useDictionary();
  const [tab, setTab] = useState<Tab>("portfolio");

  return (
    <main className="isolate flex flex-1 flex-col bg-military">
      <SectionGlow />
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{dict.assets.demoBanner.label}</span> —{" "}
        {dict.assets.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-on-military">{dict.assets.title}</h1>
        <p className="mt-1 text-on-military-muted">{dict.assets.subtitle}</p>

        <div
          role="tablist"
          aria-label={dict.assets.title}
          className="mt-6 inline-flex flex-wrap gap-1 rounded-full bg-military-600/40 p-1"
        >
          <button
            type="button"
            role="tab"
            id="assets-tab-portfolio"
            aria-selected={tab === "portfolio"}
            aria-controls="assets-panel-portfolio"
            onClick={() => setTab("portfolio")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "portfolio" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
            }`}
          >
            {dict.assets.tabs.wallet}
          </button>
          <button
            type="button"
            role="tab"
            id="assets-tab-available"
            aria-selected={tab === "available"}
            aria-controls="assets-panel-available"
            onClick={() => setTab("available")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "available" ? "bg-salmon text-on-salmon" : "text-on-military-muted hover:text-on-military"
            }`}
          >
            {dict.assets.tabs.available}
          </button>
        </div>

        {tab === "portfolio" ? (
          <div
            id="assets-panel-portfolio"
            role="tabpanel"
            aria-labelledby="assets-tab-portfolio"
            className="mt-8 flex flex-col gap-6"
          >
            <RealPositionCard />
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
            id="assets-panel-available"
            role="tabpanel"
            aria-labelledby="assets-tab-available"
            className="mt-8"
          >
            <AssetCatalog />
          </div>
        )}
      </div>
    </main>
  );
}
