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
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  });
}

function abiEvent(nome: TipoEventoOnChain): AbiEvent {
  const item = ofertaCaptacaoAbi.find((entry) => entry.type === "event" && entry.name === nome);
  if (!item) throw new Error(`Evento ${nome} não encontrado no ABI de OfertaCaptacao`);
  return item as AbiEvent;
}

function parseLog(log: Log, tipo: TipoEventoOnChain, ofertaAddress: `0x${string}`, ofertaIndex: number): EventoOnChain {
  // `args` só existe em runtime depois do parseAbiItem interno do viem (getLogs com `event`
  // decodifica automaticamente) — checagem defensiva mantém o TS satisfeito sem `any`.
  const args = (log as Log & { args?: Record<string, unknown> }).args ?? {};

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

/**
 * Lê todos os eventos de todas as ofertas configuradas (NEXT_PUBLIC_OFERTAS_ONCHAIN), mais
 * recentes primeiro. Retorna lista vazia (nunca lança) se nenhuma oferta estiver configurada.
 */
export async function getEventosOnChain(): Promise<EventoOnChain[]> {
  const addresses = getOnChainAddresses();
  if (!addresses) return [];

  const client = publicClient();
  const eventos: EventoOnChain[] = [];

  for (let ofertaIndex = 0; ofertaIndex < addresses.ofertas.length; ofertaIndex++) {
    const ofertaAddress = addresses.ofertas[ofertaIndex].oferta;

    for (const tipo of EVENT_NAMES) {
      const logs = await client.getLogs({
        address: ofertaAddress,
        event: abiEvent(tipo),
        fromBlock: FROM_BLOCK,
        toBlock: "latest",
      });

      for (const log of logs) {
        eventos.push(parseLog(log, tipo, ofertaAddress, ofertaIndex));
      }
    }
  }

  // Preenche timestamp (1 chamada por bloco único, não por evento).
  const blocosUnicos = [...new Set(eventos.map((evento) => evento.blockNumber))];
  const blocos = await Promise.all(blocosUnicos.map((numero) => client.getBlock({ blockNumber: numero })));
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

  const taxaBpsPorOferta = await Promise.all(
    addresses.ofertas.map((oferta) =>
      client.readContract({ address: oferta.oferta, abi: ofertaCaptacaoAbi, functionName: "taxaBps" }),
    ),
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
