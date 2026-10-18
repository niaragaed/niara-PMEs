-- ============================================================================
-- Niara-PMEs -- 0017_solana_devnet
-- Self-service publication also on Solana Devnet (niara-pmes-solana program,
-- niaragaed/niara-pmes-solana), besides Sepolia.
--
-- 1. offerings.rede: which network the on-chain publication lives on ('sepolia' or
--    'solana-devnet'). Every existing row is Sepolia (default).
-- 2. The format CHECKs from 0015/0016 (hex 0x... only) now apply PER NETWORK:
--    on Solana, an address is base58 (32 bytes) and the "tx_hash" is the
--    transaction signature in base58 (64 bytes).
--      contract_address       -> the offering account (program PDA)
--      token_address          -> SPL mint of the shares
--      onchain_emissor_wallet -> the issuer wallet that signed criar_oferta
-- 3. chain_id stays required on Sepolia confirmation and is NULL on
--    Solana (there is no numeric chainId there).
-- 4. The immutability trigger gains `rede`: immutable once there is an address
--    written (same rule as contract_address/chain_id) and also during an
--    attempt in progress (tx_hash filled in) -- one network's hash can never
--    start being read as if it belonged to the other.
-- 5. issuers/investors.solana_wallet_address: Solana wallet linked to the
--    account, separate from wallet_address (EVM). A wallet can only be on
--    ONE account (same rule as 0007).
--
-- Not idempotent: run ONCE, after 0016. Nothing here deletes data.
-- ============================================================================

begin;

-- 1. rede ---------------------------------------------------------------------
alter table offerings
  add column rede text not null default 'sepolia';

alter table offerings
  add constraint rede_valida check (rede in ('sepolia', 'solana-devnet'));

-- 2. formats per network ----------------------------------------------------------
alter table offerings
  drop constraint contract_address_format,
  drop constraint token_address_format,
  drop constraint onchain_emissor_wallet_format,
  drop constraint tx_hash_format,
  drop constraint expected_emissor_wallet_format;

alter table offerings
  add constraint contract_address_format check (
    contract_address is null
    or (rede = 'sepolia' and contract_address ~ '^0x[0-9a-fA-F]{40}$')
    or (rede = 'solana-devnet' and contract_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
  ),
  add constraint token_address_format check (
    token_address is null
    or (rede = 'sepolia' and token_address ~ '^0x[0-9a-fA-F]{40}$')
    or (rede = 'solana-devnet' and token_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
  ),
  add constraint onchain_emissor_wallet_format check (
    onchain_emissor_wallet is null
    or (rede = 'sepolia' and onchain_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$')
    or (rede = 'solana-devnet' and onchain_emissor_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
  ),
  add constraint expected_emissor_wallet_format check (
    expected_emissor_wallet is null
    or (rede = 'sepolia' and expected_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$')
    or (rede = 'solana-devnet' and expected_emissor_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$')
  ),
  add constraint tx_hash_format check (
    tx_hash is null
    or (rede = 'sepolia' and tx_hash ~ '^0x[0-9a-fA-F]{64}$')
    or (rede = 'solana-devnet' and tx_hash ~ '^[1-9A-HJ-NP-Za-km-z]{64,90}$')
  );

-- 3. chain_id: required only on Sepolia ----------------------------------------
alter table offerings
  drop constraint sync_status_confirmada_tem_enderecos;

alter table offerings
  add constraint sync_status_confirmada_tem_enderecos check (
    sync_status <> 'confirmada'
    or (
      contract_address is not null
      and token_address is not null
      and onchain_emissor_wallet is not null
      and (rede <> 'sepolia' or chain_id is not null)
    )
  ),
  add constraint chain_id_so_na_sepolia check (rede = 'sepolia' or chain_id is null);

-- 4. immutability (replaces 0015's function, same rules + rede) ----------
create or replace function enforce_onchain_publish_immutable() returns trigger language plpgsql as $fn$
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
  -- chain_id now locks only once an address is written (before: as soon as it was filled in). A
  -- reverted attempt on Sepolia left chain_id filled in and prevented publishing later
  -- on Solana (where chain_id is NULL). Reverts now clear chain_id together with tx_hash.
  if old.contract_address is not null and old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  if new.rede is distinct from old.rede
     and (old.contract_address is not null or old.tx_hash is not null) then
    raise exception 'offerings.rede e imutavel com publicacao gravada ou em andamento' using errcode = '23514';
  end if;
  return new;
end $fn$;

-- Old rows reverted on Sepolia kept chain_id filled in without an address: clear it,
-- so they can try again on any network (the trigger above already allows it).
update offerings set chain_id = null
where sync_status = 'nao_onchain' and contract_address is null and chain_id is not null;

-- An on-chain transaction/account can confirm only ONE offering (per network): prevents two
-- Supabase rows from pointing to the same escrow.
create unique index offerings_rede_contract_address_unique
  on offerings (rede, contract_address) where contract_address is not null;
create unique index offerings_rede_tx_hash_unique
  on offerings (rede, tx_hash) where tx_hash is not null;

-- Solana: last block height at which the signed transaction can still land on the network
-- (lastValidBlockHeight of the blockhash used). Only used to decide, with certainty, that an
-- attempt that hasn't appeared will never appear.
alter table offerings add column solana_ultimo_bloco_valido bigint;

-- 5. linked Solana wallet ----------------------------------------------------
alter table issuers   add column solana_wallet_address text;
alter table investors add column solana_wallet_address text;

alter table issuers
  add constraint issuers_solana_wallet_format
    check (solana_wallet_address is null or solana_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  add constraint issuers_solana_wallet_unique unique (solana_wallet_address);

alter table investors
  add constraint investors_solana_wallet_format
    check (solana_wallet_address is null or solana_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'),
  add constraint investors_solana_wallet_unique unique (solana_wallet_address);

commit;
