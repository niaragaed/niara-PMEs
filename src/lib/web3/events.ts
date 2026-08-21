import "server-only";

// Leitura de eventos reais do(s) contrato(s) OfertaCaptacao em Sepolia — usado só pelo painel
// interno /socios. Roda inteiramente no servidor (viem getLogs direto via RPC), não depende de
// carteira conectada nem do wagmi (diferente dos hooks de src/lib/web3/hooks/, que são para o
// investidor logado com MetaMask). Eventos confirmados direto no .sol antes de escrever isto
// (niara-contracts-PMEs/src/captacao/OfertaCaptacao.sol) — nomes reais: Aporte, OfertaEncerrada,
// OfertaCancelada, CotasResgatadas, RecursosLiberados, Reembolso.
import { createPublicClient, http, type AbiEvent, type Log } from "viem";
import { sepolia } from "wagmi/chains";
import { getOnChainAddresses } from "./addresses";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import { mockBrlAbi } from "./abis/mockBrl";

// Bloco em que a infraestrutura atual (Fase 4 redeployada) foi implantada em Sepolia
// (2026-08-15) — usado como fromBlock para nunca escanear a chain inteira desde o genesis.
// Se a infra for redeployada de novo no futuro, atualizar este valor (ver
// niara-contracts-PMEs/CLAUDE.md, "Chave do deployer da Fase 4 perdida").
const FROM_BLOCK = BigInt(11_495_000);

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

function publicClient() {
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

// Vários provedores de RPC (inclusive o público padrão do viem para Sepolia) limitam
// eth_getLogs a um intervalo de blocos. Como FROM_BLOCK é fixo e o bloco atual só cresce com o
// tempo, [FROM_BLOCK, latest] eventualmente estoura esse limite — por isso o intervalo é sempre
// dividido em janelas de no máximo CHUNK_SIZE blocos, nunca uma chamada só com toBlock: "latest"
// direto. 🔴 1.000, não 10.000: o RPC público padrão para Sepolia sem NEXT_PUBLIC_SEPOLIA_RPC_URL
// dedicado é o do thirdweb (fallback embutido no `sepolia` de wagmi/chains), que rejeita
// (code -32005 "Log response size exceeded") qualquer janela acima de 1.000 blocos — confirmado
// batendo o erro real contra o RPC antes de escrever isto; um valor maior passaria em outros
// provedores mas quebra no fallback público que este projeto de fato usa por padrão.
const CHUNK_SIZE = BigInt(1_000);

function calcularJanelas(fromBlock: bigint, toBlock: bigint): Array<{ from: bigint; to: bigint }> {
  const janelas: Array<{ from: bigint; to: bigint }> = [];
  for (let inicio = fromBlock; inicio <= toBlock; inicio += CHUNK_SIZE) {
    const fim = inicio + CHUNK_SIZE - BigInt(1) > toBlock ? toBlock : inicio + CHUNK_SIZE - BigInt(1);
    janelas.push({ from: inicio, to: fim });
  }
  return janelas;
}

// O RPC público padrão (sem NEXT_PUBLIC_SEPOLIA_RPC_URL dedicado) tem rate limit estrito —
// confirmado batendo 429 ("public-good RPC with strict rate limits") ao disparar dezenas de
// getLogs em paralelo (1 por oferta × janela). Limita quantas chamadas ficam em voo ao mesmo
// tempo em vez de um Promise.all sem controle; sobe com o tempo (mais janelas de bloco), então
// o limite passa a importar mesmo quando hoje o número de ofertas × janelas ainda é pequeno.
const RPC_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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
 * Lê todos os eventos de todas as ofertas configuradas (NEXT_PUBLIC_OFERTAS_ONCHAIN), mais
 * recentes primeiro. Retorna lista vazia (nunca lança) se nenhuma oferta estiver configurada.
 * Uma chamada getLogs por janela de blocos (não por oferta × janela) — todas as ofertas juntas
 * via `address: Address[]` e os 6 tipos de evento juntos via `events`, já que viem/eth_getLogs
 * aceita os dois como lista no mesmo filtro. Reduz N ofertas × M janelas para só M chamadas,
 * limitadas a RPC_CONCURRENCY em voo por vez.
 */
export async function getEventosOnChain(): Promise<EventoOnChain[]> {
  const addresses = getOnChainAddresses();
  if (!addresses) return [];

  const client = publicClient();
  const blocoAtual = await client.getBlockNumber();
  const janelas = calcularJanelas(FROM_BLOCK, blocoAtual);
  const indexPorEndereco = new Map(addresses.ofertas.map((oferta, indice) => [oferta.oferta.toLowerCase(), indice]));

  const porJanela = await mapWithConcurrency(janelas, RPC_CONCURRENCY, async (janela) => {
    const logs = (await client.getLogs({
      address: addresses.ofertas.map((oferta) => oferta.oferta),
      events: ABI_EVENTS,
      fromBlock: janela.from,
      toBlock: janela.to,
    })) as LogDecodificado[];

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

export type ResumoOnChain = {
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  totalArrecadadoWei: bigint;
  carteirasUnicas: number;
  taxaBpsPorOferta: number[];
};

/**
 * Resumo agregado — total arrecadado (soma de todos os Aporte, todas as ofertas), carteiras
 * únicas que já aportaram, e a taxaBps vigente de cada oferta (lida direto do contrato, nunca
 * assumida — hoje é 0 em todas, ver niara-contracts-PMEs, mas isto lê o valor real, não
 * hardcoda).
 */
export async function getResumoOnChain(eventos: EventoOnChain[]): Promise<ResumoOnChain | null> {
  const addresses = getOnChainAddresses();
  if (!addresses) return null;

  const client = publicClient();

  const [mockBrlDecimals, mockBrlSymbol] = await Promise.all([
    client.readContract({ address: addresses.mockBrl, abi: mockBrlAbi, functionName: "decimals" }),
    client.readContract({ address: addresses.mockBrl, abi: mockBrlAbi, functionName: "symbol" }),
  ]);

  const taxaBpsPorOferta = await mapWithConcurrency(addresses.ofertas, RPC_CONCURRENCY, (oferta) =>
    client.readContract({ address: oferta.oferta, abi: ofertaCaptacaoAbi, functionName: "taxaBps" }),
  );

  const aportes = eventos.filter((evento) => evento.tipo === "Aporte");
  const totalArrecadadoWei = aportes.reduce((total, evento) => total + (evento.valorWei ?? BigInt(0)), BigInt(0));
  const carteirasUnicas = new Set(aportes.map((evento) => evento.investidor).filter(Boolean)).size;

  return {
    mockBrlDecimals,
    mockBrlSymbol,
    totalArrecadadoWei,
    carteirasUnicas,
    taxaBpsPorOferta: taxaBpsPorOferta.map(Number),
  };
}
