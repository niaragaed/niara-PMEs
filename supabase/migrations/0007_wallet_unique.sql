-- ============================================================================
-- Niara-PMEs -- 0007_wallet_unique
-- A wallet can be linked to only ONE account. wallet_address is nullable
-- and Postgres UNIQUE allows several NULLs -> accounts without a wallet don't collide;
-- only two IDENTICAL filled-in addresses are blocked.
-- (unique is per table; an investor<->issuer collision with the same wallet is not
--  covered here -- acceptable at the current stage.)
-- ============================================================================

begin;

alter table investors add constraint investors_wallet_unique unique (wallet_address);
alter table issuers   add constraint issuers_wallet_unique   unique (wallet_address);

commit;
