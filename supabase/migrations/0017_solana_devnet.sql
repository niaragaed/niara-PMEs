-- ============================================================================
-- Niara-PMEs -- 0017_solana_devnet
-- Publicacao self-service tambem na Solana Devnet (programa niara-pmes-solana,
-- niaragaed/niara-pmes-solana), alem da Sepolia.
--
-- 1. offerings.rede: em qual rede a publicacao on-chain vive ('sepolia' ou
--    'solana-devnet'). Toda linha existente e da Sepolia (default).
-- 2. Os CHECKs de formato de 0015/0016 (so hex 0x...) passam a valer POR REDE:
--    na Solana, endereco e base58 (32 bytes) e o "tx_hash" e a assinatura da
--    transacao em base58 (64 bytes).
--      contract_address       -> conta da oferta (PDA do programa)
--      token_address          -> mint SPL das cotas
--      onchain_emissor_wallet -> carteira do emissor que assinou criar_oferta
-- 3. chain_id continua obrigatorio na confirmacao da Sepolia e fica NULL na
--    Solana (nao existe chainId numerico la).
-- 4. Trigger de imutabilidade ganha `rede`: imutavel depois que ha endereco
--    gravado (mesma regra de contract_address/chain_id) e tambem durante uma
--    tentativa em andamento (tx_hash preenchido) -- o hash de uma rede nunca
--    pode passar a ser lido como se fosse da outra.
-- 5. issuers/investors.solana_wallet_address: carteira Solana vinculada a
--    conta, separada da wallet_address (EVM). Uma carteira so pode estar em
--    UMA conta (mesma regra de 0007).
--
-- Idempotente nao: rodar UMA vez, depois de 0016. Nada aqui apaga dado.
-- ============================================================================

begin;

-- 1. rede ---------------------------------------------------------------------
alter table offerings
  add column rede text not null default 'sepolia';

alter table offerings
  add constraint rede_valida check (rede in ('sepolia', 'solana-devnet'));

-- 2. formatos por rede ----------------------------------------------------------
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

-- 3. chain_id: obrigatorio so na Sepolia ----------------------------------------
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

-- 4. imutabilidade (substitui a funcao de 0015, mesmas regras + rede) ----------
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
  if old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  if new.rede is distinct from old.rede
     and (old.contract_address is not null or old.tx_hash is not null) then
    raise exception 'offerings.rede e imutavel com publicacao gravada ou em andamento' using errcode = '23514';
  end if;
  return new;
end $fn$;

-- 5. carteira Solana vinculada ----------------------------------------------------
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
