-- ============================================================================
-- Niara-PMEs -- 0006_profile_details
-- Full profile fields (contact + address) and wallet, for investors and
-- issuers. ALL NULLABLE: the minimum sign-up (name + document) stays valid;
-- the rest is filled in/edited on /profile.
--
-- IMPORTANT: in the current environment this is DEMO/fictitious data (the UI
-- must make that explicit, besides is_demo on the row). In production this becomes
-- real PII -> LGPD responsibility (processing, consent, retention).
-- ============================================================================

begin;

-- Investors (individuals)
alter table investors
  add column birth_date        date,
  add column phone             text,
  add column wallet_address    text,   -- connected MetaMask wallet (0x...)
  add column addr_cep          text,
  add column addr_street       text,
  add column addr_number       text,
  add column addr_complement   text,
  add column addr_neighborhood text,
  add column addr_city         text,
  add column addr_state        text;   -- state code (UF)

-- Companies (legal entities)
alter table issuers
  add column trade_name        text,   -- trade name (nome fantasia)
  add column phone             text,
  add column wallet_address    text,
  add column addr_cep          text,
  add column addr_street       text,
  add column addr_number       text,
  add column addr_complement   text,
  add column addr_neighborhood text,
  add column addr_city         text,
  add column addr_state        text;

commit;
