-- ============================================================================
-- Niara-PMEs -- 0003_auth_link
-- Links investors to the Supabase Auth user (auth.users). A signed-in user has
-- AT MOST one investor. COLLECTING the investor's data (CPF, tier, KYC) is
-- NOT done here -- it is a separate step. That's why user_id stays NULLABLE
-- until onboarding happens.
-- ============================================================================

begin;

alter table investors
  add column user_id uuid unique references auth.users(id) on delete set null;
-- unique => 1 investor per user. nullable => seeds/demo without a user are ok
-- (Postgres allows several NULLs in a unique column).
-- on delete set null => if the user is deleted, the investor SURVIVES (financial
-- history is never deleted); it only loses the link.

create index on investors (user_id);

-- RLS stays default-deny; access is still via service_role on the server. When the
-- front end reads investors directly with the anon key, the right policy is:
--   create policy investor_self on investors for select
--     using (user_id = auth.uid());
-- NOT enabled now, so nothing is loosened without need.

commit;
