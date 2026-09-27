"use client";

// Fase 3, sub-etapa 4 (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md) — dados que viram argumentos da
// transação (nome/símbolo/série do token, nunca persistidos no Supabase — a chain é a fonte
// deles a partir daqui) + o termo de honestidade (gate 6). Componente controlado: todo estado
// vive no pai (PublicarOnChainPage), este arquivo só recebe/edita valores e nunca decide
// sozinho se o gate passa.
import type { ChangeEvent } from "react";
import { TextField } from "@/components/perfil/FormField";
import { ptBr } from "@/lib/i18n/pt-br";

export type DadosToken = { nome: string; simbolo: string; serie: string };

type Props = {
  dados: DadosToken;
  onDadosChange: (dados: DadosToken) => void;
  aceito: boolean;
  onAceitoChange: (aceito: boolean) => void;
  desabilitado: boolean;
};

export function TermoPublicacao({ dados, onDadosChange, aceito, onAceitoChange, desabilitado }: Props) {
  const t = ptBr.empresaOfertas.publicarOnChain;
  const tf = t.formulario;
  const tt = t.termoTexto;

  function campo(chave: keyof DadosToken) {
    return (event: ChangeEvent<HTMLInputElement>) => onDadosChange({ ...dados, [chave]: event.target.value });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-panel-border bg-panel p-4">
        <h3 className="text-sm font-semibold text-on-military">{tf.titulo}</h3>
        <p className="mt-1 text-xs text-on-military-muted">{tf.aviso}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField id="token-nome" label={tf.nome} value={dados.nome} onChange={campo("nome")} disabled={desabilitado} />
          <TextField id="token-simbolo" label={tf.simbolo} value={dados.simbolo} onChange={campo("simbolo")} disabled={desabilitado} />
          <TextField id="token-serie" label={tf.serie} value={dados.serie} onChange={campo("serie")} disabled={desabilitado} />
        </div>
      </section>

      <section className="rounded-lg border border-salmon/40 bg-salmon/10 p-4 text-sm text-on-military">
        <h3 className="font-semibold">{tt.titulo}</h3>
        <p className="mt-2 text-on-military-muted">{tt.intro}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-on-military-muted">
          {tt.itens.map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ol>
        <label className="mt-4 flex items-start gap-2 text-sm text-on-military">
          <input
            type="checkbox"
            checked={aceito}
            onChange={(event) => onAceitoChange(event.target.checked)}
            disabled={desabilitado}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-panel-border accent-salmon"
          />
          <span>{tt.checkbox}</span>
        </label>
      </section>
    </div>
  );
}
