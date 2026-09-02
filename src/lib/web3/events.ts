import "server-only";

// Leitura de eventos reais do(s) contrato(s) OfertaCaptacao em Sepolia — usado só pelo painel
// interno /socios. Roda inteiramente no servidor (viem getLogs direto via RPC), não depende de
// carteira conectada nem do wagmi (diferente dos hooks de src/lib/web3/hooks/, que são para o
// investidor logado com MetaMask). Eventos confirmados direto no .sol antes de escrever isto
// (niara-contracts-PMEs/src/captacao/OfertaCaptacao.sol) — nomes reais: Aporte, OfertaEncerrada,
// OfertaCancelada, CotasResgatadas, RecursosLiberados, Reembolso.
//
// 🔴 Cache incremental em Supabase (onchain_events_cache/onchain_sync_state,
// supabase/migrations/0012_onchain_events_cache.sql): antes disso, toda chamada reescaneava
// getLogs desde FROM_BLOCK até o bloco atual — um intervalo que só cresce a cada dia, até
// estourar o timeout de 60s da função serverless (Vercel) e/ou o limite de faixa de blocos por
// chamada de RPCs mais restritivos (Alchemy Free: só 10 blocos por eth_getLogs, contra 1.000 do
// RPC público antigo — reproduzido em produção). Agora só o intervalo NOVO desde o último bloco
// sincronizado é escaneado a cada chamada; a primeira sincronização (sem nenhuma linha em
// onchain_sync_state ainda) continua sendo o escaneamento completo — rodar
// `npm run backfill:onchain` uma vez (fora do Next, sem o teto de 60s) em vez de deixar a
// primeira visita à página pagar essa conta inteira.
import { createAdminClient } from "@/lib/supabase/admin";
import { getOnChainAddresses } from "./addresses";
import { mockBrlAbi } from "./abis/mockBrl";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";
import {
  FROM_BLOCK,
  publicClient,
  fetchEventosOnChainRange,
  mapWithConcurrency,
  type EventoOnChain,
  type TipoEventoOnChain,
} from "./eventsCore";

export type { EventoOnChain, TipoEventoOnChain } from "./eventsCore";

const RPC_CONCURRENCY = 5;

type OnchainEventCacheRow = {
  tipo: string;
  oferta_address: string;
  oferta_index: number;
  investidor: string | null;
  valor_wei: string | null;
  cotas: string | null;
  tx_hash: string;
  block_number: number | string;
  block_timestamp: number | string | null;
};

function rowParaEvento(row: OnchainEventCacheRow): EventoOnChain {
  return {
    tipo: row.tipo as TipoEventoOnChain,
    ofertaAddress: row.oferta_address as `0x${string}`,
    ofertaIndex: row.oferta_index,
    investidor: (row.investidor as `0x${string}` | null) ?? null,
    valorWei: row.valor_wei !== null ? BigInt(row.valor_wei) : null,
    cotas: row.cotas !== null ? BigInt(row.cotas) : null,
    txHash: row.tx_hash as `0x${string}`,
    blockNumber: BigInt(row.block_number),
    timestamp: row.block_timestamp !== null ? Number(row.block_timestamp) : null,
  };
}

function eventoParaRow(evento: EventoOnChain): OnchainEventCacheRow {
  return {
    tipo: evento.tipo,
    oferta_address: evento.ofertaAddress,
    oferta_index: evento.ofertaIndex,
    investidor: evento.investidor,
    valor_wei: evento.valorWei !== null ? evento.valorWei.toString() : null,
    cotas: evento.cotas !== null ? evento.cotas.toString() : null,
    tx_hash: evento.txHash,
    block_number: evento.blockNumber.toString(),
    block_timestamp: evento.timestamp,
  };
}

async function lerSyncState(): Promise<bigint | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("onchain_sync_state").select("last_synced_block").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data ? BigInt(data.last_synced_block) : null;
}

async function lerEventosCache(): Promise<EventoOnChain[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onchain_events_cache")
    .select("*")
    .order("block_number", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowParaEvento);
}

async function salvarNovosEventos(eventos: EventoOnChain[]): Promise<void> {
  if (eventos.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("onchain_events_cache")
    .upsert(eventos.map(eventoParaRow), { onConflict: "tx_hash,oferta_address,tipo" });
  if (error) throw error;
}

async function atualizarSyncState(blocoAtual: bigint): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("onchain_sync_state")
    .upsert({ id: 1, last_synced_block: blocoAtual.toString() });
  if (error) throw error;
}

/**
 * Lê todos os eventos de todas as ofertas configuradas (NEXT_PUBLIC_OFERTAS_ONCHAIN), mais
 * recentes primeiro. Retorna lista vazia (nunca lança) se nenhuma oferta estiver configurada. Só
 * escaneia via RPC o intervalo de blocos NOVO desde a última sincronização (ver cabeçalho do
 * arquivo) — o resto vem do cache em Supabase. Uma falha ao gravar o cache não derruba a
 * resposta (loga e segue) — na pior hipótese, a próxima chamada reescaneia o mesmo intervalo de
 * novo (idempotente via UPSERT com unique key), nunca perde dado nem quebra a página.
 */
export async function getEventosOnChain(): Promise<EventoOnChain[]> {
  const addresses = getOnChainAddresses();
  if (!addresses) return [];

  const client = publicClient();
  const [blocoAtual, eventosCache, syncedAteRaw] = await Promise.all([
    client.getBlockNumber(),
    lerEventosCache(),
    lerSyncState(),
  ]);
  const syncedAte = syncedAteRaw ?? FROM_BLOCK - BigInt(1);

  if (blocoAtual <= syncedAte) {
    return eventosCache;
  }

  const novosEventos = await fetchEventosOnChainRange(client, addresses.ofertas, syncedAte + BigInt(1), blocoAtual);

  try {
    await Promise.all([salvarNovosEventos(novosEventos), atualizarSyncState(blocoAtual)]);
  } catch (error) {
    console.error("[socios] falha ao gravar cache on-chain (resposta atual não é afetada):", error);
  }

  const todosEventos = [...eventosCache, ...novosEventos];
  todosEventos.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return todosEventos;
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
 * hardcoda). Não faz getLogs (só readContract, sem limite de faixa de blocos) — não precisa do
 * cache acima.
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
