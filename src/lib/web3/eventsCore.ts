// The pure core (no Supabase, no "server-only") of reading on-chain events from the OfertaCaptacao
// contract(s) on Sepolia — extracted from events.ts so it can be reused by
// scripts/backfill-onchain-cache.ts (runs outside Next via tsx, where "server-only" would throw
// unconditionally, the same gotcha already documented for scripts/seed-demo.ts). events.ts is
// still the only place that touches the Supabase cache (that one guarded by "server-only") — this
// module only knows how to talk to the chain via viem, never to the database.
import { createPublicClient, http, type AbiEvent, type Log } from "viem";
import { sepolia } from "wagmi/chains";
import type { OnChainOfferingAddresses } from "./addresses";
import { ofertaCaptacaoAbi } from "./abis/ofertaCaptacao";

/**
 * Finds the block in which `address` first received code (i.e. the deploy block), via a binary
 * search with `eth_getCode` instead of a fixed number maintained by hand. Used as a floor so the
 * whole chain is never scanned from genesis (see events.ts and scripts/backfill-onchain-cache.ts)
 * — both on the first sync and whenever a redeploy is detected (the MockBRL address changed
 * relative to the one saved in onchain_sync_state), so it never needs to be updated by hand,
 * unlike the old fixed `FROM_BLOCK` (which already caused a silent loss of history in a previous
 * redeploy — see "Redeploy fix" in events.ts). Cost: ~log2(current block) RPC calls (~25 for
 * today's Sepolia), run only in those two rare cases, never on every normal read.
 */
export async function findDeployBlock(
  client: ReturnType<typeof publicClient>,
  address: `0x${string}`,
): Promise<bigint> {
  const hasCode = async (block: bigint) => {
    const bytecode = await client.getCode({ address, blockNumber: block });
    return Boolean(bytecode) && bytecode !== "0x";
  };

  let lo = BigInt(0);
  let hi = await client.getBlockNumber();

  if (await hasCode(lo)) return lo;
  if (!(await hasCode(hi))) {
    throw new Error(
      `findDeployBlock: address ${address} has no code at the current block (${hi}) — wrong address, or an RPC without access to historical state (archive node)?`,
    );
  }

  // Binary search for the first block in which the code already exists: lo always "no code", hi
  // always "has code", until only the boundary between the two is left.
  while (lo + BigInt(1) < hi) {
    const middle = lo + (hi - lo) / BigInt(2);
    if (await hasCode(middle)) {
      hi = middle;
    } else {
      lo = middle;
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

export type OnChainEventType = (typeof EVENT_NAMES)[number];

export type OnChainEvent = {
  type: OnChainEventType;
  offeringAddress: `0x${string}`;
  offeringIndex: number;
  investor: `0x${string}` | null;
  amountWei: bigint | null;
  shares: bigint | null;
  // Only filled in for `RecursosLiberados` (args.taxa) — the fee actually transferred to
  // protocoloWallet in that event. `null` for the other 5 event types.
  feeWei: bigint | null;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number | null;
};

export function publicClient() {
  return createPublicClient({
    chain: sepolia,
    // `batch: true` merges several JSON-RPC calls made in the same event-loop turn into a single
    // HTTP request — essential on the default public RPC (without a dedicated
    // NEXT_PUBLIC_SEPOLIA_RPC_URL), which has already returned 429 ("public-good RPC with strict
    // rate limits") even with few simultaneous calls via mapWithConcurrency; the limit there is
    // per HTTP request, not just per logical call.
    transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL, { batch: true }),
  });
}

// All 6 events, a single time — used together in a single `events` filter (not `event`) per
// getLogs call, instead of 1 RPC call per type.
const ABI_EVENTS: AbiEvent[] = EVENT_NAMES.map((eventName) => {
  const item = ofertaCaptacaoAbi.find((entry) => entry.type === "event" && entry.name === eventName);
  if (!item) throw new Error(`Event ${eventName} not found in the OfertaCaptacao ABI`);
  return item as AbiEvent;
});

type DecodedLog = Log & { eventName?: string; args?: Record<string, unknown> };

function parseLog(log: DecodedLog, offeringAddress: `0x${string}`, offeringIndex: number): OnChainEvent | null {
  const type = log.eventName as OnChainEventType | undefined;
  if (!type || !EVENT_NAMES.includes(type)) return null;

  const args = log.args ?? {};

  return {
    type,
    offeringAddress,
    offeringIndex,
    investor: (args.investidor as `0x${string}` | undefined) ?? null,
    amountWei: (args.valor as bigint | undefined) ?? (args.valorEmissor as bigint | undefined) ?? null,
    shares: (args.cotas as bigint | undefined) ?? null,
    feeWei: (args.taxa as bigint | undefined) ?? null,
    txHash: log.transactionHash as `0x${string}`,
    blockNumber: log.blockNumber as bigint,
    timestamp: null,
  };
}

// Several RPC providers limit eth_getLogs to a block range — and each provider has a different
// cap (viem's default public one for Sepolia accepted up to 1,000; Alchemy on the Free plan accepts
// only 10 — confirmed in production with "Under the Free tier plan, you can make eth_getLogs
// requests with up to a 10 block range", even after the Supabase cache reduced the total range
// scanned per call). 10 is the lowest known cap among the providers already tested in this
// project — universally safe, and cheap now that the Supabase cache (events.ts) guarantees the
// total range per call is already small (only what's new since the last sync), so more 10-block
// windows don't weigh as they would scanning from FROM_BLOCK. If the RPC is ever swapped for one
// with a higher cap, this value can go up.
const CHUNK_SIZE = BigInt(10);

export function computeWindows(fromBlock: bigint, toBlock: bigint): Array<{ from: bigint; to: bigint }> {
  const windows: Array<{ from: bigint; to: bigint }> = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - BigInt(1) > toBlock ? toBlock : start + CHUNK_SIZE - BigInt(1);
    windows.push({ from: start, to: end });
  }
  return windows;
}

// Alchemy on the Free plan limits not only the range per call (10 blocks, CHUNK_SIZE above) but
// also "compute units per second" — a BURST cap, not just a range one. RPC_CONCURRENCY=5 (the old
// value) fired 5 eth_getLogs calls at the same time, each one already heavy (10 contracts + 6 event
// types in the filter), and blew that cap even while respecting the 10 blocks per call — confirmed
// in production with "exceeded its compute units per second capacity" even after the redeploy
// false-positive bug fix (see events.ts) had already drastically reduced the total windows to
// scan. RPC_CONCURRENCY=1 (sequential) + a small interval between calls (RPC_THROTTLE_MS) solves
// this for good, at the cost of a slightly slower catch-up — acceptable, since this only runs for
// the NEW range since the last sync (typically small), never from the start of the contract's life.
const RPC_CONCURRENCY = 1;
const RPC_THROTTLE_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Reads the events of all configured offerings within [fromBlock, toBlock] (inclusive), most
 * recent first, with the timestamp already filled in. `fromBlock > toBlock` returns an empty list
 * without calling the RPC (the common case when the cache is already up to date). One getLogs call
 * per block window (not per offering × window) — all offerings together via `address: Address[]`
 * and the 6 event types together via `events`. The caller decides the range to scan (events.ts,
 * from the last block synced in the cache) — this function knows nothing about Supabase.
 */
export async function fetchOnChainEventsRange(
  client: ReturnType<typeof publicClient>,
  offerings: OnChainOfferingAddresses[],
  fromBlock: bigint,
  toBlock: bigint,
): Promise<OnChainEvent[]> {
  if (fromBlock > toBlock) return [];

  const indexByAddress = new Map(offerings.map((offering, index) => [offering.offering.toLowerCase(), index]));
  const windows = computeWindows(fromBlock, toBlock);

  const byWindow = await mapWithConcurrency(windows, RPC_CONCURRENCY, async (window) => {
    const logs = (await client.getLogs({
      address: offerings.map((offering) => offering.offering),
      events: ABI_EVENTS,
      fromBlock: window.from,
      toBlock: window.to,
    })) as DecodedLog[];

    await sleep(RPC_THROTTLE_MS);

    return logs
      .map((log) => {
        const offeringAddress = log.address as `0x${string}`;
        const offeringIndex = indexByAddress.get(offeringAddress.toLowerCase());
        if (offeringIndex === undefined) return null;
        return parseLog(log, offeringAddress, offeringIndex);
      })
      .filter((event): event is OnChainEvent => event !== null);
  });

  const events = byWindow.flat();

  // Fills in the timestamp (1 call per unique block, not per event), with the same concurrency limit.
  const uniqueBlocks = [...new Set(events.map((event) => event.blockNumber))];
  const blocks = await mapWithConcurrency(uniqueBlocks, RPC_CONCURRENCY, (number) =>
    client.getBlock({ blockNumber: number }),
  );
  const timestampByBlock = new Map(blocks.map((block) => [block.number, Number(block.timestamp)]));
  for (const event of events) {
    event.timestamp = timestampByBlock.get(event.blockNumber) ?? null;
  }

  events.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  return events;
}
