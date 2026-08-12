-- ============================================================================
-- Niara-PMEs -- 0010_issuer_logo
-- Caminho da logo da empresa no Supabase Storage. O ARQUIVO mora no bucket
-- (publico); aqui guardamos so o path/URL. Nullable (empresa pode nao ter logo).
-- A logo e publica por natureza (identidade de marca) -> pode aparecer na oferta.
-- ============================================================================

begin;

alter table issuers add column logo_path text;

commit;
