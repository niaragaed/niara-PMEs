-- ============================================================================
-- Niara-PMEs -- 0011_issuer_banner
-- Path of the offering's cover banner in Supabase Storage (bucket
-- 'issuer-banners', public, created manually in the dashboard -- a bucket can't
-- be created through a migration). Same pattern as 0010_issuer_logo: the FILE
-- lives in the bucket, here we only store the path. Nullable (a company may not
-- have a banner yet). Public by nature (it appears on the offering card in
-- /trade, together with the logo).
-- ============================================================================

begin;

alter table issuers add column banner_path text;

commit;
