-- ============================================================================
-- Niara-PMEs -- 0014_onchain_events_taxa
-- Extra column in onchain_events_cache to store the fee (args.taxa) of the
-- RecursosLiberados event -- before this migration, the cache only stored
-- valorEmissor (via valor_wei), so there was no way to sum how much fee the
-- protocol wallet actually received (/partners dashboard). Additive, never
-- destructive: rows already written keep taxa_wei = null (equivalent to "not
-- read" in this new column; it is always 0 anyway today, see niara-contracts-PMEs'
-- CLAUDE.md, "Locked decisions" -- taxaBps was 0 on every existing offering
-- until this round).
-- ============================================================================

begin;

alter table onchain_events_cache
  add column taxa_wei text;

commit;
