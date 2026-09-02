import { getEventosOnChain, getResumoOnChain, type EventoOnChain, type ResumoOnChain } from "@/lib/web3/events";
import { ptBr } from "@/lib/i18n/pt-br";
import { RealOnChainPanels } from "./RealOnChainPanels";

async function lerDadosOnChain(): Promise<
  { ok: true; eventosOnChain: EventoOnChain[]; resumoOnChain: ResumoOnChain | null } | { ok: false }
> {
  try {
    const eventosOnChain = await getEventosOnChain();
    const resumoOnChain = await getResumoOnChain(eventosOnChain);
    return { ok: true, eventosOnChain, resumoOnChain };
  } catch (error) {
    // Sem isto, uma falha aqui virava um "{ ok: false }" mudo — nenhuma linha nos Logs da
    // Vercel (só apareceria como "Vercel Runtime Timeout Error" se estourasse os 60s de
    // maxDuration; qualquer outro erro, mais rápido, ficava invisível). Loga pro stdout/stderr
    // da função, que a Vercel captura nos Runtime Logs.
    console.error("[socios] falha ao ler dados on-chain:", error);
    return { ok: false };
  }
}

// Componente assíncrono isolado só para ficar atrás do <Suspense> de page.tsx — se a leitura
// on-chain falhar (RPC fora do ar, timeout), mostra um aviso em vez de derrubar a página inteira
// (que já teria renderizado o resto via streaming a essa altura). JSX construído fora do
// try/catch de propósito (ver regra react-hooks/error-boundaries) — o catch só protege o await.
export async function RealOnChainSection() {
  const resultado = await lerDadosOnChain();

  if (!resultado.ok) {
    return (
      <section className="mt-8">
        <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-value-negative">
          {ptBr.socios.resumoReal.erroCarregamento}
        </p>
      </section>
    );
  }

  return <RealOnChainPanels eventosOnChain={resultado.eventosOnChain} resumoOnChain={resultado.resumoOnChain} />;
}
