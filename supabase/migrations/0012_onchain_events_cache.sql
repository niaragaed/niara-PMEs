-- ============================================================================
-- Niara-PMEs -- 0012_onchain_events_cache
-- Cache incremental dos eventos on-chain (Sepolia) lidos pelo painel /socios
-- (ver src/lib/web3/events.ts). Antes desta migration, toda leitura reescaneava
-- getLogs desde um bloco fixo (15/08/2026) ate o bloco atual -- um intervalo
-- que so cresce a cada dia, ate estourar tanto o timeout da funcao serverless
-- (Vercel) quanto o limite de faixa de blocos por chamada de eth_getLogs de
-- RPCs mais restritivos (ex.: Alchemy Free permite so 10 blocos por chamada).
-- Com este cache, cada leitura so busca os blocos NOVOS desde a ultima
-- sincronizacao -- normalmente uma janela pequena -- em vez de reescanear tudo
-- toda vez. RLS default-deny, mesmo padrao das tabelas de dominio em
-- 0001_core.sql: acesso so via client admin (service role) no servidor.
-- ============================================================================

begin;

create table onchain_events_cache (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  oferta_address text not null,
  oferta_index integer not null,
  investidor text,
  -- text, nao numeric/bigint: valores em wei (18 casas decimais) passam de
  -- 2*10^20 nesta demo, acima do teto do bigint do Postgres (~9.2*10^18) e
  -- do range seguro de inteiro do JSON/PostgREST (2^53) -- guardado como
  -- string decimal, convertido com BigInt(...) na leitura, nunca Number(...).
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

-- Linha unica (id sempre 1) com o ultimo bloco ja sincronizado -- sem isso,
-- uma janela sem nenhum evento nao deixaria rastro nenhum e a proxima leitura
-- rescanearia o mesmo intervalo de novo, do zero.
create table onchain_sync_state (
  id smallint primary key default 1,
  last_synced_block bigint not null,
  constraint onchain_sync_state_singleton check (id = 1)
);

alter table onchain_sync_state enable row level security;

commit;
