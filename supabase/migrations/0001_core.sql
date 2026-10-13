-- ============================================================================
-- Niara-PMEs -- 0001_core
-- Domain schema + Res. CVM 88 invariants LOCKED IN THE DATABASE.
--
-- HONESTY RULE: nothing simulated may look real. This schema is NOT
-- regulatory compliance -- operating a Res. 88 platform requires the
-- platform's own CVM authorization. The invariants below are the minimum
-- line of defense, not a compliance seal.
--
-- MONEY: everything in BIGINT CENTS (BRL). Never float. R$1.00 = 100.
-- CONCURRENCY: the caps use SELECT ... FOR UPDATE on the parent row before
--   summing. READ COMMITTED doesn't see another transaction's uncommitted
--   rows, so without the lock two concurrent investments break the cap.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Issuers (SEP -- small business company)
-- ---------------------------------------------------------------------------
create table issuers (
  id                   uuid primary key default gen_random_uuid(),
  legal_name           text   not null,
  tax_id               text   not null,               -- CNPJ (not validated here)
  annual_revenue_cents bigint not null check (annual_revenue_cents >= 0),
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),

  -- Res. 88: the issuer must be an SEP. CURRENT gross annual revenue cap = R$40M.
  -- (There is an R$80M variant for companies controlled by a legal entity/fund --
  --  CONFIRM in the consolidated text before loosening this CHECK.)
  constraint issuer_is_sep check (annual_revenue_cents <= 4000000000)
);

-- ---------------------------------------------------------------------------
-- Offerings
-- ---------------------------------------------------------------------------
create table offerings (
  id               uuid primary key default gen_random_uuid(),
  issuer_id        uuid not null references issuers(id),
  status           text not null default 'draft'
                     check (status in ('draft','active','funded','failed','settled','cancelled')),
  target_min_cents bigint not null check (target_min_cents > 0),  -- minimum for all-or-nothing
  base_cap_cents   bigint not null check (base_cap_cents  > 0),   -- original offering
  hard_cap_cents   bigint not null check (hard_cap_cents  > 0),   -- base + additional lot
  opens_at         timestamptz not null,
  closes_at        timestamptz not null,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),

  -- Res. 88: fundraising cap of R$15M per offering.
  constraint cap_le_15m     check (hard_cap_cents <= 1500000000),
  -- Res. 88: additional lot <= 25% of the original offering => hard_cap <= 1.25 * base.
  constraint additional_lot check (hard_cap_cents <= base_cap_cents + (base_cap_cents / 4)),
  constraint min_le_hardcap check (target_min_cents <= hard_cap_cents),
  -- Res. 88: distribution period <= 180 days.
  constraint window_le_180d check (closes_at <= opens_at + interval '180 days'),
  constraint window_valid   check (closes_at > opens_at)
);

-- ---------------------------------------------------------------------------
-- Investors
-- ---------------------------------------------------------------------------
create table investors (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  tax_id             text not null,
  kyc_status         text not null default 'pending'
                       check (kyc_status in ('pending','approved','rejected')),
  -- Annual cap in CENTS. NULL = no cap (qualified investor).
  -- Default R$20k = retail. Income/net-worth tiers raise or remove the cap.
  annual_limit_cents bigint default 2000000
                       check (annual_limit_cents is null or annual_limit_cents >= 0),
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Investments  (cycle: reserved -> paid -> settled | refunded | cancelled)
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
-- Payment events (audit trail + idempotency)
-- ---------------------------------------------------------------------------
create table payment_events (
  id              uuid primary key default gen_random_uuid(),
  investment_id   uuid not null references investments(id),
  event_type      text not null,        -- escrow_intent | payment_confirmed | release | refund | tokens_issued
  external_ref    text not null,        -- MOCK-... while the adapter is the mock
  idempotency_key text not null,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  -- Idempotency: the same external event can't be processed twice.
  constraint payment_events_idem unique (idempotency_key)
);

-- ===========================================================================
-- TRIGGERS / INVARIANTS
-- ===========================================================================

-- automatic updated_at
create function set_updated_at() returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end $fn$;

create trigger investments_set_updated_at before update on investments
  for each row execute function set_updated_at();

-- The offering must be ACTIVE and within its window to accept a reservation.
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

-- Investor annual cap (concurrency-safe via FOR UPDATE on the investor row).
-- HONESTY: sums ONLY what went through Niara. The CURRENT Res.88 rule is
-- cross-platform (R$20k summing ALL CVM platforms); "per platform" is a
-- proposal (SDM 05/2025), not yet in force. This is a declared approximation.
create function enforce_investor_annual_limit() returns trigger language plpgsql as $fn$
declare
  v_limit bigint; v_year int; v_sum bigint;
begin
  select annual_limit_cents into v_limit
    from investors where id = new.investor_id for update;
  if v_limit is null then
    return new;  -- qualified: no cap
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

-- Per-offering cap / hard_cap (concurrency-safe via FOR UPDATE on the offering).
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

-- Legal status transitions + KYC gate (reserved->paid only with approved KYC).
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
-- RLS: default-deny on every domain table.
-- No permissive policies ON PURPOSE. Access is 100% server-side with the
-- service_role (which BYPASSES RLS). If the front end ever reads directly with
-- the anon key, add explicit policies -- never leave these tables readable by
-- anon without a policy.
-- ===========================================================================
alter table issuers        enable row level security;
alter table offerings      enable row level security;
alter table investors      enable row level security;
alter table investments    enable row level security;
alter table payment_events enable row level security;

commit;
