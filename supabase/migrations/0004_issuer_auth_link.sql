-- ============================================================================
-- Niara-PMEs -- 0004_issuer_auth_link
-- Mirror of 0003 for the COMPANY side: links issuers to the Supabase Auth user
-- (auth.users). A signed-in user has at most one issuer. user_id stays
-- NULLABLE (seeds/demo without a user stay valid). on delete set null =>
-- the issuer survives if the user is deleted; it only loses the link.
-- ============================================================================

begin;

alter table issuers
  add column user_id uuid unique references auth.users(id) on delete set null;

create index on issuers (user_id);

-- RLS stays default-deny; access via service_role on the server. Future policy
-- (when the front end reads issuers directly with the anon key): using (user_id = auth.uid()).

commit;
