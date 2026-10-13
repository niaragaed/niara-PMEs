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
  findDeployBlock,
  publicClient,
  fetchOnChainEventsRange,
  mapWithConcurrency,
  type OnChainEvent,
  type OnChainEventType,
} from "./eventsCore";

export type { OnChainEvent as EventoOnChain, OnChainEventType as TipoEventoOnChain } from "./eventsCore";

const RPC_CONCURRENCY = 5;

type OnchainEventCacheRow = {
  tipo: string;
  oferta_address: string;
  oferta_index: number;
  investidor: string | null;
  valor_wei: string | null;
  cotas: string | null;
  taxa_wei: string | null;
  tx_hash: string;
  block_number: number | string;
  block_timestamp: number | string | null;
};

function rowToEvent(row: OnchainEventCacheRow): OnChainEvent {
  return {
    type: row.tipo as OnChainEventType,
    offeringAddress: row.oferta_address as `0x${string}`,
    offeringIndex: row.oferta_index,
    investor: (row.investidor as `0x${string}` | null) ?? null,
    amountWei: row.valor_wei !== null ? BigInt(row.valor_wei) : null,
    shares: row.cotas !== null ? BigInt(row.cotas) : null,
    feeWei: row.taxa_wei !== null ? BigInt(row.taxa_wei) : null,
    txHash: row.tx_hash as `0x${string}`,
    blockNumber: BigInt(row.block_number),
    timestamp: row.block_timestamp !== null ? Number(row.block_timestamp) : null,
  };
}

function eventToRow(event: OnChainEvent): OnchainEventCacheRow {
  return {
    tipo: event.type,
    oferta_address: event.offeringAddress,
    oferta_index: event.offeringIndex,
    investidor: event.investor,
    valor_wei: event.amountWei !== null ? event.amountWei.toString() : null,
    cotas: event.shares !== null ? event.shares.toString() : null,
    taxa_wei: event.feeWei !== null ? event.feeWei.toString() : null,
    tx_hash: event.txHash,
    block_number: event.blockNumber.toString(),
    block_timestamp: event.timestamp,
  };
}

type SyncState = { lastSyncedBlock: bigint; mockBrlAddress: string | null };

async function readSyncState(): Promise<SyncState | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onchain_sync_state")
    .select("last_synced_block, mock_brl_address")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ? { lastSyncedBlock: BigInt(data.last_synced_block), mockBrlAddress: data.mock_brl_address } : null;
}

// Só devolve eventos de ofertas que ainda estão configuradas em
// NEXT_PUBLIC_OFERTAS_ONCHAIN hoje — evita misturar, para sempre, eventos de uma geração de
// contratos antiga (pré-redeploy) com a atual, caso a tabela algum dia acumule as duas.
async function readCachedEvents(validAddresses: Set<string>): Promise<OnChainEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onchain_events_cache")
    .select("*")
    .order("block_number", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => validAddresses.has((row.oferta_address as string).toLowerCase()))
    .map(rowToEvent);
}

async function saveNewEvents(events: OnChainEvent[]): Promise<void> {
  if (events.length === 0) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("onchain_events_cache")
    .upsert(events.map(eventToRow), { onConflict: "tx_hash,oferta_address,tipo" });
  if (error) throw error;
}

async function updateSyncState(currentBlock: bigint, mockBrlAddress: `0x${string}`): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("onchain_sync_state")
    .upsert({ id: 1, last_synced_block: currentBlock.toString(), mock_brl_address: mockBrlAddress.toLowerCase() });
  if (error) throw error;
}

// Com CHUNK_SIZE=10 blocos e RPC_CONCURRENCY=1 + RPC_THROTTLE_MS=150 (eventsCore.ts), cada janela
// de 10 blocos leva ~300-500ms (rede + throttle). 3000 blocos ≈ 300 janelas ≈ 90-150s no pior
// caso — ainda alto demais para o maxDuration=60s da página. 1500 blocos ≈ 150 janelas ≈ 45-75s:
// ainda arriscado perto do limite. Fica em 800 blocos (~80 janelas, ~25-40s) com boa margem de
// segurança mesmo em cold start ou rede mais lenta — se um dia RPC_THROTTLE_MS ou CHUNK_SIZE
// mudarem, revisar esta conta junto.
const MAX_BLOCKS_PER_EXECUTION = BigInt(800);

/**
 * Lê todos os eventos de todas as ofertas configuradas (NEXT_PUBLIC_OFERTAS_ONCHAIN), mais
 * recentes primeiro. Retorna lista vazia (nunca lança) se nenhuma oferta estiver configurada. Só
 * escaneia via RPC o intervalo de blocos NOVO desde a última sincronização (ver cabeçalho do
 * arquivo) — o resto vem do cache em Supabase. Uma falha ao gravar o cache não derruba a
 * resposta (loga e segue) — na pior hipótese, a próxima chamada reescaneia o mesmo intervalo de
 * novo (idempotente via UPSERT com unique key), nunca perde dado nem quebra a página.
 *
 * Correção redeploy: antes, o piso da primeira sincronização era um bloco fixo (`FROM_BLOCK`)
 * mantido à mão no código, e nada detectava se a infra fosse redeployada — o cache continuaria
 * escaneando a partir do último bloco salvo, que pertencia aos contratos ANTIGOS, perdendo em
 * silêncio todo o histórico do início da vida dos contratos NOVOS. Agora onchain_sync_state
 * também guarda o endereço do MockBRL de quando aquele bloco foi sincronizado
 * (`mock_brl_address`, ver migration 0013): se ele não bate com o endereço atual, entende-se
 * que houve um redeploy, e o bloco de partida é recalculado automaticamente via
 * `encontrarBlocoDeploy` (busca binária por `eth_getCode`, sem depender de nenhum artefato de
 * deploy nem de constante atualizada manualmente).
 */
export async function getEventsOnChain(): Promise<OnChainEvent[]> {
  const addresses = getOnChainAddresses();
  if (!addresses) return [];

  const validAddresses = new Set(addresses.offerings.map((offering) => offering.offering.toLowerCase()));
  const client = publicClient();
  const [currentBlock, syncState, cachedEvents] = await Promise.all([
    client.getBlockNumber(),
    readSyncState(),
    readCachedEvents(validAddresses),
  ]);

  // syncState.mockBrlAddress === null significa "coluna recém-criada pela migration 0013, nunca
  // gravada ainda" — NÃO é redeploy, é só ausência de dado histórico. Tratar null como "mudou"
  // dispararia um falso positivo em todo projeto pré-existente logo após rodar a migration
  // (fazendo reescanear dezenas de milhares de blocos de uma vez e estourar rate limit do RPC).
  // Só é redeploy de verdade quando JÁ existe um endereço anterior salvo e ele é diferente do
  // atual.
  const redeployDetected =
    syncState !== null && syncState.mockBrlAddress !== null && syncState.mockBrlAddress !== addresses.mockBrl.toLowerCase();

  let syncedAte: bigint;
  if (syncState === null || redeployDetected) {
    const deployBlock = await findDeployBlock(client, addresses.mockBrl);
    if (redeployDetected) {
      console.warn(
        `[socios] MockBRL address changed (was ${syncState?.mockBrlAddress}, now ${addresses.mockBrl}) — the infra seems to have been redeployed. Deploy block recomputed automatically: ${deployBlock}. Events from previous contracts stay in the database but are no longer read (filtered by the current address).`,
      );
    }
    syncedAte = deployBlock - BigInt(1);
  } else {
    syncedAte = syncState.lastSyncedBlock;
  }

  if (currentBlock <= syncedAte) {
    return cachedEvents;
  }

  // Teto de blocos por execução: sem isso, um intervalo pendente grande (ex.: ninguém visitou
  // /socios por muitas horas, ou o cron ficou fora do ar) faz uma única chamada tentar escanear
  // tudo de uma vez — e como cada janela de RPC é sequencial e pequena (10 blocos, ver
  // eventsCore.ts), isso já estourou o timeout de 60s da Vercel mais de uma vez em produção. Com
  // o teto, cada execução avança no máximo MAX_BLOCOS_POR_EXECUCAO blocos e para aí — o resto
  // fica para a PRÓXIMA chamada (visita ao /socios ou o cron em /api/cron/sync-onchain). Nunca
  // estoura o timeout, custe o backlog o que custar; só demora mais chamadas para se atualizar
  // por completo, o que é um trade-off muito melhor que timeout e perda silenciosa dos dados
  // on-chain na tela.
  const targetBlock = currentBlock - syncedAte > MAX_BLOCKS_PER_EXECUTION ? syncedAte + MAX_BLOCKS_PER_EXECUTION : currentBlock;

  const newEvents = await fetchOnChainEventsRange(client, addresses.offerings, syncedAte + BigInt(1), targetBlock);

  try {
    await Promise.all([saveNewEvents(newEvents), updateSyncState(targetBlock, addresses.mockBrl)]);
  } catch (error) {
    console.error("[socios] failed to write the on-chain cache (the current response isn't affected):", error);
  }

  const allEvents = [...cachedEvents, ...newEvents];
  allEvents.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return allEvents;
}

export type OnChainSummary = {
  mockBrlDecimals: number;
  mockBrlSymbol: string;
  totalRaisedWei: bigint;
  uniqueWallets: number;
  feeBpsByOffering: number[];
  // Soma real de `RecursosLiberados.taxa` (mBRL efetivamente transferidos ao protocoloWallet),
  // não um valor projetado/derivado de taxaBps × arrecadado — só conta o que já foi de fato
  // liberado on-chain via `liberarParaEmissor()`.
  feeReceivedWei: bigint;
};

/**
 * Resumo agregado — total arrecadado (soma de todos os Aporte, todas as ofertas), carteiras
 * únicas que já aportaram, a taxaBps vigente de cada oferta (lida direto do contrato, nunca
 * assumida — hoje é 0 na maioria das ofertas, mas isto lê o valor real, não hardcoda) e a
 * receita real de taxa já recebida pelo protocolo (soma de `RecursosLiberados.taxa` entre todas
 * as ofertas — só conta o que `liberarParaEmissor()` já transferiu de fato, nunca uma
 * projeção). Não faz getLogs (só readContract, sem limite de faixa de blocos) — não precisa do
 * cache acima; a soma da taxa vem de `eventos`, que já é o resultado cacheado de
 * `getEventosOnChain()`.
 */
export async function getSummaryOnChain(events: OnChainEvent[]): Promise<OnChainSummary | null> {
  const addresses = getOnChainAddresses();
  if (!addresses) return null;

  const client = publicClient();

  const [mockBrlDecimals, mockBrlSymbol] = await Promise.all([
    client.readContract({ address: addresses.mockBrl, abi: mockBrlAbi, functionName: "decimals" }),
    client.readContract({ address: addresses.mockBrl, abi: mockBrlAbi, functionName: "symbol" }),
  ]);

  const feeBpsByOffering = await mapWithConcurrency(addresses.offerings, RPC_CONCURRENCY, (offering) =>
    client.readContract({ address: offering.offering, abi: ofertaCaptacaoAbi, functionName: "taxaBps" }),
  );

  const investments = events.filter((event) => event.type === "Aporte");
  const totalRaisedWei = investments.reduce((total, event) => total + (event.amountWei ?? BigInt(0)), BigInt(0));
  const uniqueWallets = new Set(investments.map((event) => event.investor).filter(Boolean)).size;

  const fundsReleased = events.filter((event) => event.type === "RecursosLiberados");
  const receivedFeeWei = fundsReleased.reduce((total, event) => total + (event.feeWei ?? BigInt(0)), BigInt(0));

  return {
    mockBrlDecimals,
    mockBrlSymbol,
    totalRaisedWei,
    uniqueWallets,
    feeBpsByOffering: feeBpsByOffering.map(Number),
    feeReceivedWei: receivedFeeWei,
  };
}
