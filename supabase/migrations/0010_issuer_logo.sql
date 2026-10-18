-- ============================================================================
-- Niara-PMEs -- 0010_issuer_logo
-- Path of the company logo in Supabase Storage. The FILE lives in the (public)
-- bucket; here we only store the path/URL. Nullable (a company may not have a logo).
-- The logo is public by nature (brand identity) -> it may appear on the offering.
-- ============================================================================

begin;

alter table issuers add column logo_path text;

commit;
