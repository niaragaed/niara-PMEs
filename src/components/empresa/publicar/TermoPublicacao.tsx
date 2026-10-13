"use client";

// Phase 3, sub-step 4 (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — data that becomes transaction
// arguments (the token's name/symbol/series, never persisted in Supabase — the chain is their
// source from here on) + the honesty terms (gate 6). A controlled component: all state lives in
// the parent (PublicarOnChainPage), this file only receives/edits values and never decides on its
// own whether the gate passes.
import type { ChangeEvent } from "react";
import { TextField } from "@/components/perfil/FormField";
import { useDictionary } from "@/lib/i18n/client";

export type DataToken = { name: string; symbol: string; series: string };

/** Copy for the form and the terms — Sepolia's by default; Solana passes its own. */
export type TermTexts = {
  form: { title: string; notice: string; name: string; symbol: string; series: string };
  termText: { title: string; intro: string; items: readonly string[]; checkbox: string };
};

type Props = {
  texts?: TermTexts;
  data: DataToken;
  onDataChange: (data: DataToken) => void;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  disabled: boolean;
};

export function PublicationTerms({ texts, data, onDataChange, accepted, onAcceptedChange, disabled }: Props) {
  const dict = useDictionary();
  const t = texts ?? dict.companyOfferings.publishOnChain;
  const tf = t.form;
  const tt = t.termText;

  function field(key: keyof DataToken) {
    return (event: ChangeEvent<HTMLInputElement>) => onDataChange({ ...data, [key]: event.target.value });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-panel-border bg-panel p-4">
        <h3 className="text-sm font-semibold text-on-military">{tf.title}</h3>
        <p className="mt-1 text-xs text-on-military-muted">{tf.notice}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField id="token-name" label={tf.name} value={data.name} onChange={field("name")} disabled={disabled} />
          <TextField id="token-symbol" label={tf.symbol} value={data.symbol} onChange={field("symbol")} disabled={disabled} />
          <TextField id="token-series" label={tf.series} value={data.series} onChange={field("series")} disabled={disabled} />
        </div>
      </section>

      <section className="rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
        <h3 className="font-semibold">{tt.title}</h3>
        <p className="mt-2 text-on-military-muted">{tt.intro}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-on-military-muted">
          {tt.items.map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ol>
        <label className="mt-4 flex items-start gap-2 text-sm text-on-military">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => onAcceptedChange(event.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-panel-border accent-salmon"
          />
          <span>{tt.checkbox}</span>
        </label>
      </section>
    </div>
  );
}
