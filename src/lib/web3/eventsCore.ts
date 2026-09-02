// Núcleo puro (sem Supabase, sem "server-only") da leitura de eventos on-chain do(s) contrato(s)
// OfertaCaptacao em Sepolia — extraído de events.ts para poder ser reaproveitado por
// scripts/backfill-onchain-cache.ts (roda fora do Next via tsx, onde "server-only" lançaria
// incondicionalmente, mesmo gotcha já documentado para scripts/seed-demo.ts). events.ts continua
// sendo o único lugar que toca o cache em Supabase (esse sim guardado por "server-only") — este
// módulo só sabe conversar com a chain via viem, nunca com o banco.
import { createPublicClient, http, type AbiEvent, type Log } from "viem";
import { sepolia } from "wagmi/chains";
import type { OfertaOnChainAddresses } from "./addresses";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";

/**
 * Descobre o bloco em que `address` recebeu código pela primeira vez (ou seja, o bloco de
 * deploy), via busca binária com `eth_getCode` em vez de um número fixo mantido à mão. Usada
 * como piso para nunca escanear a chain inteira desde o genesis (ver events.ts e
 * scripts/backfill-onchain-cache.ts) — tanto na primeira sincronização quanto sempre que um
 * redeploy é detectado (endereço de MockBRL mudou em relação ao salvo em onchain_sync_state),
 * então nunca precisa ser atualizada manualmente, ao contrário do antigo `FROM_BLOCK` fixo (que
 * já causou perda silenciosa de histórico num redeploy anterior — ver
 * "Correção redeploy" em events.ts). Custo: ~log2(bloco atual) chamadas RPC (~25 para a Sepolia
 * de hoje), rodada só nesses dois casos raros, nunca a cada leitura normal.
 */
export async function encontrarBlocoDeploy(
  client: ReturnType<typeof publicClient>,
  address: `0x${string}`,
): Promise<bigint> {
  const temCodigo = async (bloco: bigint) => {
    const bytecode = await client.getCode({ address, blockNumber: bloco });
    return Boolean(bytecode) && bytecode !== "0x";
  };

  let lo = BigInt(0);
  let hi = await client.getBlockNumber();

  if (await temCodigo(lo)) return lo;
  if (!(await temCodigo(hi))) {
    throw new Error(
      `encontrarBlocoDeploy: endereço ${address} não tem código no bloco atual (${hi}) — endereço errado ou RPC sem acesso a estado histórico (archive node)?`,
    );
  }

  // Busca binária pelo primeiro bloco em que o código já existe: lo sempre "sem código", hi
  // sempre "com código", até sobrar só a fronteira entre os dois.
  while (lo + BigInt(1) < hi) {
    const meio = lo + (hi - lo) / BigInt(2);
    if (await temCodigo(meio)) {
      hi = meio;
    } else {
      lo = meio;
    }
  }

  return hi;
}

const EVENT_NAMES = [
  "Aporte",
  "OfertaEncerrada",
  "OfertaCancelada",
  "CotasResgatadas",
  "RecursosLiberados",
  "Reembolso",
] as const;

export type TipoEventoOnChain = (typeof EVENT_NAMES)[number];

export type EventoOnChain = {
  tipo: TipoEventoOnChain;
  ofertaAddress: `0x${string}`;
  ofertaIndex: number;
  investidor: `0x${string}` | null;
  valorWei: bigint | null;
  cotas: bigint | null;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number | null;
};

export function publicClient() {
  return createPublicClient({
    chain: sepolia,
    // `batch: true` funde várias chamadas JSON-RPC feitas na mesma volta do event loop numa
    // única requisição HTTP — essencial no RPC público padrão (sem NEXT_PUBLIC_SEPOLIA_RPC_URL
    // dedicado), que já devolveu 429 ("public-good RPC with strict rate limits") mesmo com
    // poucas chamadas simultâneas via mapWithConcurrency; o limite ali é por requisição HTTP,
    // não só por chamada lógica.
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, { batch: true }),
  });
}

// Todos os 6 eventos, uma única vez — usados juntos num só filtro `events` (não `event`) por
// chamada getLogs, em vez de 1 chamada RPC por tipo.
const ABI_EVENTS: AbiEvent[] = EVENT_NAMES.map((nome) => {
  const item = ofertaCaptacaoAbi.find((entry) => entry.type === "event" && entry.name === nome);
  if (!item) throw new Error(`Evento ${nome} não encontrado no ABI de OfertaCaptacao`);
  return item as AbiEvent;
});

type LogDecodificado = Log & { eventName?: string; args?: Record<string, unknown> };

function parseLog(log: LogDecodificado, ofertaAddress: `0x${string}`, ofertaIndex: number): EventoOnChain | null {
  const tipo = log.eventName as TipoEventoOnChain | undefined;
  if (!tipo || !EVENT_NAMES.includes(tipo)) return null;

  const args = log.args ?? {};

  return {
    tipo,
    ofertaAddress,
    ofertaIndex,
    investidor: (args.investidor as `0x${string}` | undefined) ?? null,
    valorWei: (args.valor as bigint | undefined) ?? (args.valorEmissor as bigint | undefined) ?? null,
    cotas: (args.cotas as bigint | undefined) ?? null,
    txHash: log.transactionHash as `0x${string}`,
    blockNumber: log.blockNumber as bigint,
    timestamp: null,
  };
}

// Vários provedores de RPC limitam eth_getLogs a um intervalo de blocos — e cada provedor tem um
// teto diferente (o público padrão do viem para Sepolia aceitava até 1.000; a Alchemy no plano
// Free aceita só 10 — confirmado em produção com "Under the Free tier plan, you can make
// eth_getLogs requests with up to a 10 block range", mesmo depois do cache em Supabase reduzir o
// intervalo total escaneado por chamada). 10 é o menor teto conhecido entre os provedores já
// testados neste projeto — universalmente seguro, e barato agora que o cache em Supabase
// (events.ts) garante que o intervalo total por chamada já é pequeno (só o que for novo desde a
// última sincronização), então mais janelas de 10 blocos não pesa como pesaria escaneando desde
// FROM_BLOCK. Se um dia trocar de RPC por um com teto maior, pode subir este valor.
const CHUNK_SIZE = BigInt(10);

export function calcularJanelas(fromBlock: bigint, toBlock: bigint): Array<{ from: bigint; to: bigint }> {
  const janelas: Array<{ from: bigint; to: bigint }> = [];
  for (let inicio = fromBlock; inicio <= toBlock; inicio += CHUNK_SIZE) {
    const fim = inicio + CHUNK_SIZE - BigInt(1) > toBlock ? toBlock : inicio + CHUNK_SIZE - BigInt(1);
    janelas.push({ from: inicio, to: fim });
  }
  return janelas;
}

// Alchemy no plano Free limita não só o range por chamada (10 blocos, CHUNK_SIZE acima) mas
// também "compute units por segundo" — um teto de RAJADA, não só de range. RPC_CONCURRENCY=5
// (valor antigo) disparava 5 chamadas eth_getLogs ao mesmo tempo, cada uma já pesada (10
// contratos + 6 tipos de evento no filtro), e estourava esse teto mesmo respeitando os 10 blocos
// por chamada — confirmado em produção com "exceeded its compute units per second capacity"
// mesmo depois da correção do bug de falso-positivo de redeploy (ver events.ts) já ter reduzido
// drasticamente o total de janelas a escanear. RPC_CONCURRENCY=1 (sequencial) + um pequeno
// intervalo entre chamadas (RPC_THROTTLE_MS) resolve isso definitivamente, ao custo de um
// catch-up um pouco mais lento — aceitável, já que isso só roda para o intervalo NOVO desde a
// última sincronização (tipicamente pequeno), nunca desde o início da vida do contrato.
const RPC_CONCURRENCY = 1;
const RPC_THROTTLE_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let proximo = 0;

  async function worker() {
    while (proximo < items.length) {
      const indice = proximo++;
      resultados[indice] = await fn(items[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return resultados;
}

/**
 * Lê os eventos de todas as ofertas configuradas dentro de [fromBlock, toBlock] (inclusive),
 * mais recentes primeiro, já com timestamp preenchido. `fromBlock > toBlock` retorna lista vazia
 * sem chamar o RPC (caso comum quando o cache já está em dia). Uma chamada getLogs por janela de
 * blocos (não por oferta × janela) — todas as ofertas juntas via `address: Address[]` e os 6
 * tipos de evento juntos via `events`. Quem decide o range a escanear é o chamador (events.ts,
 * a partir do último bloco sincronizado em cache) — esta função não sabe nada de Supabase.
 */
export async function fetchEventosOnChainRange(
  client: ReturnType<typeof publicClient>,
  ofertas: OfertaOnChainAddresses[],
  fromBlock: bigint,
  toBlock: bigint,
): Promise<EventoOnChain[]> {
  if (fromBlock > toBlock) return [];

  const indexPorEndereco = new Map(ofertas.map((oferta, indice) => [oferta.oferta.toLowerCase(), indice]));
  const janelas = calcularJanelas(fromBlock, toBlock);

  const porJanela = await mapWithConcurrency(janelas, RPC_CONCURRENCY, async (janela) => {
    const logs = (await client.getLogs({
      address: ofertas.map((oferta) => oferta.oferta),
      events: ABI_EVENTS,
      fromBlock: janela.from,
      toBlock: janela.to,
    })) as LogDecodificado[];

    await sleep(RPC_THROTTLE_MS);

    return logs
      .map((log) => {
        const ofertaAddress = log.address as `0x${string}`;
        const ofertaIndex = indexPorEndereco.get(ofertaAddress.toLowerCase());
        if (ofertaIndex === undefined) return null;
        return parseLog(log, ofertaAddress, ofertaIndex);
      })
      .filter((evento): evento is EventoOnChain => evento !== null);
  });

  const eventos = porJanela.flat();

  // Preenche timestamp (1 chamada por bloco único, não por evento), mesma limitação de concorrência.
  const blocosUnicos = [...new Set(eventos.map((evento) => evento.blockNumber))];
  const blocos = await mapWithConcurrency(blocosUnicos, RPC_CONCURRENCY, (numero) =>
    client.getBlock({ blockNumber: numero }),
  );
  const timestampPorBloco = new Map(blocos.map((bloco) => [bloco.number, Number(bloco.timestamp)]));
  for (const evento of eventos) {
    evento.timestamp = timestampPorBloco.get(evento.blockNumber) ?? null;
  }

  eventos.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return eventos;
}
