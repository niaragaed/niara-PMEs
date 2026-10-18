-- ============================================================================
-- Niara-PMEs -- 0015_offering_onchain_publish
-- Phase 3: self-service publication of the offering on Sepolia by the issuer itself
-- (see PLANO_FASE_3_PUBLICACAO_ONCHAIN.md). offerings.status does NOT CHANGE in this
-- migration -- on-chain publication is an ORTHOGONAL set of columns, never
-- a new value of the status CHECK (step 0 of the plan documents why:
-- 'active' already has another, incompatible meaning in the mock flow of
-- /invest).
--
-- There is NO pre-signature "designated issuer" column: ownership before
-- signing is checked LIVE against issuers.wallet_address (an existing column,
-- 0006_profile_details.sql) + emissoresAutorizados on-chain --
-- neither needs a new column here. onchain_emissor_wallet
-- below is NOT a designation: it is an audit record, written only once,
-- only by the server's confirmation routine, with the value read directly
-- from the already mined OfertaCompletaCriada event -- never a claim accepted
-- from anyone.
--
-- 'divergente' covers two DIFFERENT things: (a) an anomaly reading the
-- receipt (rare) and (b) the main expected case -- the on-chain offering is
-- IMMUTABLE once created, but the offerings row is NOT; nothing here
-- prevents a manual UPDATE of hard_cap_cents/share_price_cents/opens_at/
-- closes_at after publication. That's why opens_at/closes_at are
-- "frozen" at the exact deadline sent to the chain at publication time (see
-- the registrarTentativa Server Action, sub-step 4 of the plan) -- only then
-- does a future comparison against the immutable on-chain value make sense.
--
-- REVERSIBILITY: fully additive (8 new columns, all nullable or
-- with a default; no existing column/row is changed). Reverting =
-- undoing exactly what was done here, in reverse order (constraints ->
-- trigger/function -> index -> columns). There is no "0015_down.sql" in this
-- directory on purpose: a file here would be treated as ONE MORE
-- migration by `supabase db push` (applied forward, not backward) --
-- if a real revert is ever needed, the revert SQL lives outside
-- supabase/migrations/ (see this migration's verification, run manually
-- and always inside a transaction with a ROLLBACK at the end).
-- ============================================================================

begin;

alter table offerings
  add column contract_address       text,
  add column token_address          text,
  add column onchain_emissor_wallet text,
  add column tx_hash                text,
  add column chain_id                integer,
  add column sync_status             text not null default 'nao_onchain',
  add column onchain_confirmed_at    timestamptz,
  add column onchain_last_error      text;

-- Address/hash format -- same regex already used in the front end
-- (src/lib/web3/addresses.ts HEX_ADDRESS_PATTERN), replicated here as the
-- last line of defense (the database never accepts garbage, same philosophy as
-- the Res. 88 triggers in 0001_core.sql).
alter table offerings
  add constraint contract_address_format
    check (contract_address is null or contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint token_address_format
    check (token_address is null or token_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint onchain_emissor_wallet_format
    check (onchain_emissor_wallet is null or onchain_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint tx_hash_format
    check (tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$');

alter table offerings
  add constraint sync_status_valid
    check (sync_status in ('nao_onchain', 'pendente', 'confirmada', 'divergente'));

-- Consistency between sync_status and the columns it describes -- same
-- principle already used by the Res.88 CHECKs: the invariant lives in the database,
-- not only in the Server Action.
alter table offerings
  add constraint sync_status_pendente_tem_tx
    check (sync_status not in ('pendente', 'confirmada', 'divergente') or tx_hash is not null),
  add constraint sync_status_confirmada_tem_enderecos
    check (
      sync_status <> 'confirmada'
      or (
        contract_address is not null
        and token_address is not null
        and onchain_emissor_wallet is not null
        and chain_id is not null
      )
    );

-- Explicit name (don't let Postgres auto-generate it) -- makes the revert
-- deterministic, with no need to guess the index name later.
create index offerings_sync_status_idx on offerings (sync_status) where sync_status <> 'nao_onchain';

-- Immutability of the 4 columns that record what the chain already confirmed --
-- THIS IS NOT ONLY AN APPLICATION GUARD (WHERE sync_status='pendente' in the
-- Server Action): it is locked in the database itself, same pattern already used
-- by the investments transition triggers in 0001_core.sql. Running the
-- confirmation twice (or any other code, present or future)
-- NEVER overwrites a value already written -- it only REVERTS (SQLSTATE 23514/
-- check_violation, same error pattern as the Res.88 triggers).
-- tx_hash and sync_status are left OUT of this lock on purpose: tx_hash
-- must be clearable/replaceable on a new attempt after a revert
-- (pendente -> nao_onchain), and sync_status must be able to go to
-- 'divergente' from 'confirmada' (parameter drift).
create function enforce_onchain_publish_immutable() returns trigger language plpgsql as $fn$
begin
  if old.contract_address is not null and new.contract_address is distinct from old.contract_address then
    raise exception 'offerings.contract_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.token_address is not null and new.token_address is distinct from old.token_address then
    raise exception 'offerings.token_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.onchain_emissor_wallet is not null and new.onchain_emissor_wallet is distinct from old.onchain_emissor_wallet then
    raise exception 'offerings.onchain_emissor_wallet e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  return new;
end $fn$;

create trigger offerings_onchain_publish_immutable before update on offerings
  for each row execute function enforce_onchain_publish_immutable();

-- RLS: NO change. offerings stays default-deny, without a policy --
-- access to the new columns goes through the same admin client (service_role)
-- already used by every offering Server Action, scoped by resolveAccount() in the
-- application code. I don't enable auth.uid() here for the same reason already
-- recorded in 0003_auth_link.sql: don't loosen anything without need -- and because
-- there is no pre-signature column whose write would depend on that
-- protection (ownership is verified live against issuers.wallet_address
-- + emissoresAutorizados on-chain, not against a column of this table).

commit;
