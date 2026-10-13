"use client";
import { Building2, Car, Home, Landmark, Wheat, type LucideIcon } from "lucide-react";
import { MOCK_CATALOG, type TokenCategory } from "@/lib/mock/ativos";
import { useDictionary, useLocale } from "@/lib/i18n/client";
import { localize } from "@/lib/i18n/locale";

const CATEGORY_ICON: Record<TokenCategory, LucideIcon> = {
  pmes: Building2,
  agro: Wheat,
  imobiliario: Home,
  auto: Car,
  divida: Landmark,
};

export function AssetCatalog() {
  const dict = useDictionary();
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-on-military">{dict.assets.catalog.title}</h2>
        <p className="mt-1 text-sm text-on-military-muted">{dict.assets.catalog.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_CATALOG.map((asset) => {
          const Icon = CATEGORY_ICON[asset.category];
          return (
            <div
              key={asset.id}
              className="flex h-full flex-col gap-3 rounded-lg border border-panel-border bg-panel p-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-military-600/40 text-on-military">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-on-military-muted">
                  {dict.assets.categories[asset.category]}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-on-military">{localize(asset.name, locale)}</h3>
              <p className="flex-1 text-sm text-on-military-muted">{localize(asset.description, locale)}</p>

              <button
                type="button"
                disabled
                aria-disabled="true"
                title={dict.common.comingSoon}
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-salmon/90 px-4 py-2 text-sm font-medium text-on-salmon"
              >
                {dict.assets.catalog.invest}
                <span className="text-xs font-normal">({dict.common.comingSoon})</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
