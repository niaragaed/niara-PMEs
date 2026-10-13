"use client";

// Fase 3, sub-etapa 4 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — dados que viram argumentos da
// transação (nome/símbolo/série do token, nunca persistidos no Supabase — a chain é a fonte
// deles a partir daqui) + o termo de honestidade (gate 6). Componente controlado: todo estado
// vive no pai (PublicarOnChainPage), este arquivo só recebe/edita valores e nunca decide
// sozinho se o gate passa.
import type { ChangeEvent } from "react";
import { TextField } from "@/components/perfil/FormField";
import { ptBr } from "@/lib/i18n/pt-br";

export type DataToken = { name: string; symbol: string; series: string };

/** Textos do formulário e do termo — os da Sepolia por padrão; a Solana passa os seus. */
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
  const t = texts ?? ptBr.companyOfferings.publishOnChain;
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
          <TextField id="token-nome" label={tf.name} value={data.name} onChange={field("name")} disabled={disabled} />
          <TextField id="token-simbolo" label={tf.symbol} value={data.symbol} onChange={field("symbol")} disabled={disabled} />
          <TextField id="token-serie" label={tf.series} value={data.series} onChange={field("series")} disabled={disabled} />
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
