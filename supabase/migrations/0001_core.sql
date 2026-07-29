-- ============================================================================
-- Niara-PMEs -- 0001_core
-- Schema do dominio + invariantes da Res. CVM 88 TRAVADAS NO BANCO.
--
-- REGRA DE HONESTIDADE: nada simulado pode parecer real. Este schema NAO e
-- conformidade regulatoria -- operar uma plataforma Res. 88 exige autorizacao
-- da CVM da propria plataforma. As invariantes abaixo sao a camada de defesa
-- minima, nao um selo de conformidade.
--
-- DINHEIRO: tudo em BIGINT de CENTAVOS (BRL). Nunca float. R$1,00 = 100.
-- CONCORRENCIA: os tetos usam SELECT ... FOR UPDATE na linha pai antes de
--   somar. READ COMMITTED nao ve linhas nao-commitadas de outra transacao,
--   entao sem o lock dois aportes concorrentes furam o teto.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Emissores (SEP -- sociedade empresaria de pequeno porte)
-- ---------------------------------------------------------------------------
create table issuers (
  id                   uuid primary key default gen_random_uuid(),
  legal_name           text   not null,
  tax_id               text   not null,               -- CNPJ (sem validacao aqui)
  annual_revenue_cents bigint not null check (annual_revenue_cents >= 0),
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),

  -- Res. 88: emissor precisa ser SEP. Teto de receita bruta anual VIGENTE = R$40M.
  -- (Existe a variante de R$80M p/ controlada por PJ/fundo -- CONFIRMAR no texto
  --  consolidado antes de afrouxar este CHECK.)
  constraint issuer_is_sep check (annual_revenue_cents <= 4000000000)
);

-- ---------------------------------------------------------------------------
-- Ofertas
-- ---------------------------------------------------------------------------
create table offerings (
  id               uuid primary key default gen_random_uuid(),
  issuer_id        uuid not null references issuers(id),
  status           text not null default 'draft'
                     check (status in ('draft','active','funded','failed','settled','cancelled')),
  target_min_cents bigint not null check (target_min_cents > 0),  -- minimo p/ all-or-nothing
  base_cap_cents   bigint not null check (base_cap_cents  > 0),   -- oferta original
  hard_cap_cents   bigint not null check (hard_cap_cents  > 0),   -- base + lote adicional
  opens_at         timestamptz not null,
  closes_at        timestamptz not null,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),

  -- Res. 88: teto de captacao R$15M por oferta.
  constraint cap_le_15m     check (hard_cap_cents <= 1500000000),
  -- Res. 88: lote adicional <= 25% da oferta original => hard_cap <= 1.25 * base.
  constraint additional_lot check (hard_cap_cents <= base_cap_cents + (base_cap_cents / 4)),
  constraint min_le_hardcap check (target_min_cents <= hard_cap_cents),
  -- Res. 88: prazo de distribuicao <= 180 dias.
  constraint window_le_180d check (closes_at <= opens_at + interval '180 days'),
  constraint window_valid   check (closes_at > opens_at)
);

-- ---------------------------------------------------------------------------
-- Investidores
-- ---------------------------------------------------------------------------
create table investors (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  tax_id             text not null,
  kyc_status         text not null default 'pending'
                       check (kyc_status in ('pending','approved','rejected')),
  -- Teto anual em CENTAVOS. NULL = sem teto (investidor qualificado).
  -- Default R$20k = varejo. Tiers de renda/patrimonio sobem ou removem o teto.
  annual_limit_cents bigint default 2000000
                       check (annual_limit_cents is null or annual_limit_cents >= 0),
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Aportes  (ciclo: reserved -> paid -> settled | refunded | cancelled)
-- ---------------------------------------------------------------------------
create table investments (
  id           uuid primary key default gen_random_uuid(),
  offering_id  uuid not null references offerings(id),
  investor_id  uuid not null references investors(id),
  amount_cents bigint not null check (amount_cents > 0),
  status       text not null default 'reserved'
                 check (status in ('reserved','paid','settled','refunded','cancelled')),
  payment_ref  text,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on investments (offering_id);
create index on investments (investor_id);

-- ---------------------------------------------------------------------------
-- Eventos de pagamento (trilha de auditoria + idempotencia)
-- ---------------------------------------------------------------------------
create table payment_events (
  id              uuid primary key default gen_random_uuid(),
  investment_id   uuid not null references investments(id),
  event_type      text not null,        -- escrow_intent | payment_confirmed | release | refund | tokens_issued
  external_ref    text not null,        -- MOCK-... enquanto o adapter for mock
  idempotency_key text not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  -- Idempotencia: o mesmo evento externo nao pode ser processado 2x.
  constraint payment_events_idem unique (idempotency_key)
);

-- ===========================================================================
-- TRIGGERS / INVARIANTES
-- ===========================================================================

-- updated_at automatico
create function set_updated_at() returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end $fn$;

create trigger investments_set_updated_at before update on investments
  for each row execute function set_updated_at();

-- Oferta precisa estar ATIVA e dentro da janela p/ receber reserva.
create function enforce_offering_open() returns trigger language plpgsql as $fn$
declare
  v_status text; v_opens timestamptz; v_closes timestamptz;
begin
  select status, opens_at, closes_at into v_status, v_opens, v_closes
    from offerings where id = new.offering_id for update;
  if v_status <> 'active' then
    raise exception 'Oferta % nao esta ativa (status=%)', new.offering_id, v_status
      using errcode = 'check_violation';
  end if;
  if now() < v_opens or now() > v_closes then
    raise exception 'Oferta % fora da janela de captacao', new.offering_id
      using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

create trigger investments_offering_open before insert on investments
  for each row execute function enforce_offering_open();

-- Teto anual do investidor (concorrencia-safe via FOR UPDATE na linha do investidor).
-- HONESTIDADE: soma SO o que passou pela Niara. A regra VIGENTE da Res.88 e
-- cross-plataforma (R$20k somando TODAS as plataformas da CVM); "por plataforma"
-- e proposta (SDM 05/2025), ainda nao vigente. Isto e aproximacao declarada.
create function enforce_investor_annual_limit() returns trigger language plpgsql as $fn$
declare
  v_limit bigint; v_year int; v_sum bigint;
begin
  select annual_limit_cents into v_limit
    from investors where id = new.investor_id for update;
  if v_limit is null then
    return new;  -- qualificado: sem teto
  end if;

  v_year := extract(year from (coalesce(new.created_at, now()) at time zone 'America/Sao_Paulo'));

  select coalesce(sum(amount_cents), 0) into v_sum
    from investments
   where investor_id = new.investor_id
     and status in ('reserved','paid','settled')
     and extract(year from (created_at at time zone 'America/Sao_Paulo')) = v_year;

  if v_sum + new.amount_cents > v_limit then
    raise exception
      'Res.88: aporte excede teto anual do investidor (limite=%, ja_aportado=%, tentativa=%)',
      v_limit, v_sum, new.amount_cents using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

create trigger investments_annual_limit before insert on investments
  for each row execute function enforce_investor_annual_limit();

-- Teto por oferta / hard_cap (concorrencia-safe via FOR UPDATE na oferta).
create function enforce_offering_hard_cap() returns trigger language plpgsql as $fn$
declare
  v_cap bigint; v_sum bigint;
begin
  select hard_cap_cents into v_cap
    from offerings where id = new.offering_id for update;
  select coalesce(sum(amount_cents), 0) into v_sum
    from investments
   where offering_id = new.offering_id
     and status in ('reserved','paid','settled')
     and id <> new.id;
  if v_sum + new.amount_cents > v_cap then
    raise exception
      'Res.88/oferta: aporte estoura o hard_cap (cap=%, ja_aportado=%, tentativa=%)',
      v_cap, v_sum, new.amount_cents using errcode = 'check_violation';
  end if;
  return new;
end $fn$;

create trigger investments_hard_cap before insert on investments
  for each row execute function enforce_offering_hard_cap();

-- Transicoes de status legais + gate de KYC (reserved->paid so com KYC aprovado).
create function enforce_investment_transition() returns trigger language plpgsql as $fn$
declare v_kyc text;
begin
  if not (
       (old.status = 'reserved' and new.status in ('reserved','paid','cancelled'))
    or (old.status = 'paid'     and new.status in ('paid','settled','refunded'))
    or (old.status = new.status)
  ) then
    raise exception 'Transicao de status ilegal: % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if old.status = 'reserved' and new.status = 'paid' then
    select kyc_status into v_kyc from investors where id = new.investor_id;
    if v_kyc is distinct from 'approved' then
      raise exception 'KYC nao aprovado: aporte % nao pode ir para paid', new.id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $fn$;

create trigger investments_transition before update on investments
  for each row execute function enforce_investment_transition();

-- ===========================================================================
-- RLS: default-deny em todas as tabelas de dominio.
-- Sem policies permissivas DE PROPOSITO. O acesso e 100% server-side com a
-- service_role (que BYPASSA RLS). Se um dia o front for ler direto com a anon
-- key, adicione policies explicitas -- nunca deixe estas tabelas legiveis pela
-- anon sem policy.
-- ===========================================================================
alter table issuers        enable row level security;
alter table offerings      enable row level security;
alter table investors      enable row level security;
alter table investments    enable row level security;
alter table payment_events enable row level security;

commit;
