-- ============================================================================
-- Niara-PMEs -- 0004_issuer_auth_link
-- Espelho da 0003 para o lado EMPRESA: vincula issuers ao usuario do Supabase
-- Auth (auth.users). Um usuario logado tem no maximo um issuer. user_id fica
-- NULLABLE (seeds/demo sem usuario continuam validos). on delete set null =>
-- o emissor sobrevive se o usuario for apagado; so perde o vinculo.
-- ============================================================================

begin;

alter table issuers
  add column user_id uuid unique references auth.users(id) on delete set null;

create index on issuers (user_id);

-- RLS segue default-deny; acesso via service_role no servidor. Policy futura
-- (quando o front ler issuers direto com anon key): using (user_id = auth.uid()).

commit;
