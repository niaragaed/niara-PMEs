-- ============================================================================
-- Niara-PMEs -- 0002_settlement
-- All-or-nothing closing. It ONLY CHANGES STATE in the database. External
-- effects (escrow release, token issuance) belong to the app, via adapters, AFTERWARDS.
-- ============================================================================

begin;

-- Resolves the offering: if the PAID amount (paid/settled) reached the minimum -> 'funded';
-- otherwise -> 'failed' and refunds/cancels the investments. Idempotent by status.
create function settle_offering(p_offering_id uuid)
returns text language plpgsql as $fn$
declare
  v_status text; v_min bigint; v_paid bigint;
begin
  select status, target_min_cents into v_status, v_min
    from offerings where id = p_offering_id for update;
  if v_status is null then
    raise exception 'Oferta % nao existe', p_offering_id using errcode = 'check_violation';
  end if;
  if v_status <> 'active' then
    raise exception 'Oferta % nao esta ativa (status=%); settle abortado',
      p_offering_id, v_status using errcode = 'check_violation';
  end if;

  select coalesce(sum(amount_cents), 0) into v_paid
    from investments
   where offering_id = p_offering_id and status in ('paid','settled');

  if v_paid >= v_min then
    update offerings set status = 'funded' where id = p_offering_id;
    -- reservations that were never paid don't count: cancel them.
    update investments set status = 'cancelled'
      where offering_id = p_offering_id and status = 'reserved';
    return 'funded';
  else
    update offerings set status = 'failed' where id = p_offering_id;
    update investments set status = 'refunded'
      where offering_id = p_offering_id and status = 'paid';
    update investments set status = 'cancelled'
      where offering_id = p_offering_id and status = 'reserved';
    return 'failed';
  end if;
end $fn$;

-- Marks the offering as settled AFTER the app did the release + token issuance
-- (mock). Called by the app's closeOffering after the external effects.
create function mark_offering_settled(p_offering_id uuid)
returns void language plpgsql as $fn$
declare v_status text;
begin
  select status into v_status from offerings where id = p_offering_id for update;
  if v_status <> 'funded' then
    raise exception 'Oferta % precisa estar funded p/ liquidar (status=%)',
      p_offering_id, v_status using errcode = 'check_violation';
  end if;
  update investments set status = 'settled'
    where offering_id = p_offering_id and status = 'paid';
  update offerings set status = 'settled' where id = p_offering_id;
end $fn$;

commit;
