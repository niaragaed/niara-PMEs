-- ============================================================================
-- Niara-PMEs -- 0011_issuer_banner
-- Caminho do banner de capa da oferta no Supabase Storage (bucket
-- 'issuer-banners', publico, criado manualmente no painel -- nao da para
-- criar bucket via migration). Mesmo padrao de 0010_issuer_logo: o ARQUIVO
-- mora no bucket, aqui guardamos so o path. Nullable (empresa pode nao ter
-- banner ainda). Publico por natureza (aparece no card da oferta em
-- /negociar, junto com a logo).
-- ============================================================================

begin;

alter table issuers add column banner_path text;

commit;
