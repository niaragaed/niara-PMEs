-- ============================================================================
-- Niara-PMEs -- 0012_onchain_events_cache
-- Incremental cache of the on-chain events (Sepolia) read by the /partners dashboard
-- (see src/lib/web3/events.ts). Before this migration, every read rescanned
-- getLogs from a fixed block (2026-08-15) up to the current block -- a range
-- that only grows every day, until it exceeds both the serverless function
-- timeout (Vercel) and the per-call block range limit of eth_getLogs on stricter
-- RPCs (e.g. Alchemy Free only allows 10 blocks per call).
-- With this cache, each read only fetches the NEW blocks since the last
-- sync -- usually a small window -- instead of rescanning everything
-- every time. RLS default-deny, same pattern as the domain tables in
-- 0001_core.sql: access only via the admin client (service role) on the server.
-- ============================================================================

begin;

create table onchain_events_cache (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  oferta_address text not null,
  oferta_index integer not null,
  investidor text,
  -- text, not numeric/bigint: wei values (18 decimals) exceed 2*10^20 in this
  -- demo, above Postgres's bigint ceiling (~9.2*10^18) and the safe integer range
  -- of JSON/PostgREST (2^53) -- stored as a decimal string, converted with
  -- BigInt(...) when read, never Number(...).
  valor_wei text,
  cotas text,
  tx_hash text not null,
  block_number bigint not null,
  block_timestamp bigint,
  created_at timestamptz not null default now(),
  unique (tx_hash, oferta_address, tipo)
);

create index onchain_events_cache_block_number_idx on onchain_events_cache (block_number desc);

alter table onchain_events_cache enable row level security;

-- Single row (id always 1) with the last block already synced -- without it, a
-- window with no events would leave no trace and the next read would rescan the
-- same range again, from scratch.
create table onchain_sync_state (
  id smallint primary key default 1,
  last_synced_block bigint not null,
  constraint onchain_sync_state_singleton check (id = 1)
);

alter table onchain_sync_state enable row level security;

commit;
