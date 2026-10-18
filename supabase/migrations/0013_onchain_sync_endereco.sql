-- ============================================================================
-- Niara-PMEs -- 0013_onchain_sync_endereco
-- Fixes a correctness bug (not only a performance one) in onchain_sync_state:
-- before, last_synced_block was a loose number, with no idea which generation of
-- contracts it belonged to. If the infrastructure were redeployed (as already
-- happened on 2026-08-15, when the deployer key was lost), the /partners dashboard
-- would keep scanning from the last saved block -- which belongs to the OLD
-- contracts -- and would never go back to pick up the events from the start of
-- the NEW contracts' life. In other words: an unannounced redeploy would silently
-- lose the whole event history before the moment someone ran the backfill
-- again.
--
-- Now onchain_sync_state also stores the address of the MockBRL in effect when
-- that block was synced. In src/lib/web3/events.ts, if the saved address doesn't
-- match the current one (NEXT_PUBLIC_MOCKBRL_ADDRESS), the code understands
-- there was a redeploy and recomputes the starting point automatically (see
-- findDeployBlock in eventsCore.ts), with no manual intervention and no constant
-- to remember to update.
-- ============================================================================

begin;

alter table onchain_sync_state add column mock_brl_address text;

commit;
