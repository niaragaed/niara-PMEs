// Fills the incremental on-chain event cache (onchain_events_cache/onchain_sync_state,
// see supabase/migrations/0012_onchain_events_cache.sql and src/lib/web3/events.ts) in one go,
// scanning from the deploy block — the "expensive" read that used to happen on the first visit to
// /socios after any redeploy, and that alone already blew the Vercel serverless function's 60s
// timeout. Running this script locally (without that cap) keeps that cost from landing on a real
// HTTP request. Subsequent getEventsOnChain() calls only scan what's new since the last block
// saved here.
//
// Doesn't reuse src/lib/web3/events.ts nor src/lib/supabase/admin.ts directly — both import
// "server-only", which under plain Node (outside Next's bundler, as here via tsx) throws
// unconditionally (the same gotcha already documented in scripts/seed-demo.ts). Instead, it uses
// src/lib/web3/eventsCore.ts (the pure core, without "server-only", extracted precisely to be
// reused by this script) and builds the Supabase admin client by hand, as seed-demo.ts already does.
//
// Usage: npm run backfill:onchain (reads .env.local; needs NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MOCKBRL_ADDRESS and NEXT_PUBLIC_OFERTAS_ONCHAIN
// pointing at the right project/contracts — the same ones already used by the app).

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import {
  findDeployBlock,
  publicClient,
  fetchOnChainEventsRange,
  type OnChainEvent,
} from "@/lib/web3/eventsCore";

function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function eventToRow(evento: OnChainEvent) {
  return {
    tipo: evento.type,
    oferta_address: evento.offeringAddress,
    oferta_index: evento.offeringIndex,
    investidor: evento.investor,
    valor_wei: evento.amountWei !== null ? evento.amountWei.toString() : null,
    cotas: evento.shares !== null ? evento.shares.toString() : null,
    taxa_wei: evento.feeWei !== null ? evento.feeWei.toString() : null,
    tx_hash: evento.txHash,
    block_number: evento.blockNumber.toString(),
    block_timestamp: evento.timestamp,
  };
}

async function main() {
  const addresses = getOnChainAddresses();
  if (!addresses) {
    console.error("NEXT_PUBLIC_MOCKBRL_ADDRESS / NEXT_PUBLIC_OFERTAS_ONCHAIN missing or invalid — nothing to do.");
    process.exit(1);
  }

  const admin = createAdminClient();
  const client = publicClient();

  const { data: syncState, error: syncError } = await admin
    .from("onchain_sync_state")
    .select("last_synced_block, mock_brl_address")
    .eq("id", 1)
    .maybeSingle();
  if (syncError) throw syncError;

  const redeployDetected = syncState !== null && syncState.mock_brl_address !== addresses.mockBrl.toLowerCase();

  let fromBlock: bigint;
  if (!syncState || redeployDetected) {
    fromBlock = await findDeployBlock(client, addresses.mockBrl);
    if (redeployDetected) {
      console.log(
        `MockBRL address changed (was ${syncState?.mock_brl_address}, now ${addresses.mockBrl}) — recomputing the deploy block: ${fromBlock}.`,
      );
    }
  } else {
    fromBlock = BigInt(syncState.last_synced_block) + BigInt(1);
  }

  const toBlock = await client.getBlockNumber();

  if (fromBlock > toBlock) {
    console.log(`Already synced up to block ${toBlock} — nothing to do.`);
    return;
  }

  console.log(`Scanning ${addresses.offerings.length} offering(s) from ${fromBlock} to ${toBlock} (${toBlock - fromBlock + BigInt(1)} blocks)...`);
  console.log("It may take a few minutes the first time — no rush, this script has no 60s limit.");

  const events = await fetchOnChainEventsRange(client, addresses.offerings, fromBlock, toBlock);
  console.log(`${events.length} evento(s) encontrado(s).`);

  if (events.length > 0) {
    const { error: insertError } = await admin
      .from("onchain_events_cache")
      .upsert(events.map(eventToRow), { onConflict: "tx_hash,oferta_address,tipo" });
    if (insertError) throw insertError;
  }

  const { error: upsertSyncError } = await admin
    .from("onchain_sync_state")
    .upsert({ id: 1, last_synced_block: toBlock.toString(), mock_brl_address: addresses.mockBrl.toLowerCase() });
  if (upsertSyncError) throw upsertSyncError;

  console.log(`Cache updated up to block ${toBlock}. Done.`);
}

main().catch((error) => {
  console.error("Falha no backfill:", error);
  process.exit(1);
});
