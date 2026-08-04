-- ============================================================================
-- Niara-PMEs -- 0003_auth_link
-- Vincula investors ao usuario do Supabase Auth (auth.users). Um usuario logado
-- tem NO MAXIMO um investor. A COLETA de dados do investidor (CPF, tier, KYC)
-- NAO entra aqui -- e passo separado. Por isso user_id fica NULLABLE ate o
-- onboarding acontecer.
-- ============================================================================

begin;

alter table investors
  add column user_id uuid unique references auth.users(id) on delete set null;
-- unique => 1 investor por usuario. nullable => seeds/demo sem usuario sao ok
-- (Postgres permite varios NULL em coluna unique).
-- on delete set null => se o usuario for apagado, o investor SOBREVIVE (historico
-- financeiro nao se apaga); so perde o vinculo.

create index on investors (user_id);

-- RLS segue default-deny; acesso continua via service_role no servidor. Quando o
-- front for ler investors direto com a anon key, a policy certa e:
--   create policy investor_self on investors for select
--     using (user_id = auth.uid());
-- NAO habilitamos agora para nao afrouxar nada sem necessidade.

commit;
