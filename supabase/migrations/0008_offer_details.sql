-- ============================================================================
-- Niara-PMEs -- 0008_offer_details
-- Descriptive company data (shown on the offering page) + value per share.
-- Location does NOT get a column: it reuses addr_city + addr_state (0006).
-- Share count is NOT a column: it derives from base_cap_cents / share_price_cents.
-- ============================================================================

begin;

-- Public company data (company level: filled in once, valid for every offering)
alter table issuers
  add column sector           text,   -- business sector (e.g. "Health")
  add column business_summary text;    -- business summary

-- Value per share of the offering. Nullable (old offerings don't have it). When present:
-- > 0 and it must split the offering amount (base_cap) into whole shares.
alter table offerings
  add column share_price_cents bigint
    check (
      share_price_cents is null
      or (share_price_cents > 0 and base_cap_cents % share_price_cents = 0)
    );

commit;
