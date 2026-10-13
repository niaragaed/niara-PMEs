import "server-only";

// Reads real events from the OfertaCaptacao contract(s) on Sepolia — used only by the internal
// /socios dashboard. Runs entirely on the server (viem getLogs straight via RPC), doesn't depend
// on a connected wallet nor on wagmi (unlike the hooks in src/lib/web3/hooks/, which are for the
// investor signed in with MetaMask). Events confirmed directly in the .sol before writing this
// (niara-contracts-PMEs/src/captacao/OfertaCaptacao.sol) — real names: Aporte, OfertaEncerrada,
// OfertaCancelada, CotasResgatadas, RecursosLiberados, Reembolso.
//
// 🔴 Incremental cache in Supabase (onchain_events_cache/onchain_sync_state,
// supabase/migrations/0012_onchain_events_cache.sql): before it, every call rescanned getLogs from
// FROM_BLOCK to the current block — a range that only grows each day, until it blew the
// serverless function's 60s timeout (Vercel) and/or the per-call block range limit of more
// restrictive RPCs (Alchemy Free: only 10 blocks per eth_getLogs, against 1,000 on the old public
// RPC — reproduced in production). Now only the NEW range since the last synced block is scanned
// on each call; the first sync (with no row in onchain_sync_state yet) is still the full scan —
// run `npm run backfill:onchain` once (outside Next, without the 60s cap) instead of letting the
// first visit to the page pay that whole bill.
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

export type { OnChainEvent, OnChainEventType } from "./eventsCore";

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

// Only returns events from offerings still configured in
// NEXT_PUBLIC_OFERTAS_ONCHAIN today — avoids mixing, forever, events from an old contract
// generation (pre-redeploy) with the current one, in case the table ever accumulates both.
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

// With CHUNK_SIZE=10 blocks and RPC_CONCURRENCY=1 + RPC_THROTTLE_MS=150 (eventsCore.ts), each
// 10-block window takes ~300-500ms (network + throttle). 3000 blocks ≈ 300 windows ≈ 90-150s in the
// worst case — still too high for the page's maxDuration=60s. 1500 blocks ≈ 150 windows ≈ 45-75s:
// still risky near the limit. It stays at 800 blocks (~80 windows, ~25-40s) with a good safety
// margin even on a cold start or a slower network — if RPC_THROTTLE_MS or CHUNK_SIZE ever change,
// revisit this math too.
const MAX_BLOCKS_PER_EXECUTION = BigInt(800);

/**
 * Reads all events of all configured offerings (NEXT_PUBLIC_OFERTAS_ONCHAIN), most recent first.
 * Returns an empty list (never throws) if no offering is configured. Only scans via RPC the NEW
 * block range since the last sync (see the file header) — the rest comes from the Supabase cache.
 * A failure to write the cache doesn't take down the response (it logs and carries on) — in the
 * worst case, the next call rescans the same range again (idempotent via UPSERT with a unique
 * key), it never loses data nor breaks the page.
 *
 * Redeploy fix: before, the first sync's floor was a fixed block (`FROM_BLOCK`) maintained by
 * hand in the code, and nothing detected whether the infra had been redeployed — the cache would
 * keep scanning from the last saved block, which belonged to the OLD contracts, silently losing
 * all the history from the start of the NEW contracts' life. Now onchain_sync_state also stores
 * the MockBRL address from when that block was synced (`mock_brl_address`, see migration 0013):
 * if it doesn't match the current address, a redeploy is assumed, and the starting block is
 * recomputed automatically via `findDeployBlock` (a binary search with `eth_getCode`, without
 * depending on any deploy artifact nor on a manually updated constant).
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

  // syncState.mockBrlAddress === null means "column just created by migration 0013, never
  // written yet" — it is NOT a redeploy, only missing historical data. Treating null as "changed"
  // would trigger a false positive on every pre-existing project right after running the migration
  // (making it rescan tens of thousands of blocks at once and blow the RPC rate limit). It's only
  // a real redeploy when there's ALREADY a previous address saved and it differs from the current
  // one.
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

  // A per-run block cap: without it, a large pending range (e.g. nobody visited /socios for many
  // hours, or the cron was down) makes a single call try to scan everything at once — and since
  // each RPC window is sequential and small (10 blocks, see eventsCore.ts), that already blew
  // Vercel's 60s timeout more than once in production. With the cap, each run advances at most the
  // per-run limit of blocks and stops there — the rest is left for the NEXT call (a visit to /socios
  // or the cron at /api/cron/sync-onchain). It never hits the timeout, whatever the backlog; it
  // just takes more calls to fully catch up, which is a much better trade-off than a timeout and a
  // silent loss of the on-chain data on screen.
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
  // The real sum of `RecursosLiberados.taxa` (mBRL actually transferred to protocoloWallet),
  // not a value projected/derived from taxaBps × raised — it only counts what has actually been
  // released on-chain via `liberarParaEmissor()`.
  feeReceivedWei: bigint;
};

/**
 * Aggregate summary — total raised (sum of every Aporte, all offerings), unique wallets that have
 * invested, each offering's current taxaBps (read straight from the contract, never assumed —
 * today it's 0 on most offerings, but this reads the real value, it doesn't hard-code it) and the
 * real fee revenue already received by the protocol (sum of `RecursosLiberados.taxa` across all
 * offerings — it only counts what `liberarParaEmissor()` has actually transferred, never a
 * projection). Doesn't call getLogs (only readContract, with no block range limit) — it doesn't
 * need the cache above; the fee sum comes from `events`, which is already the cached result of
 * `getEventsOnChain()`.
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
