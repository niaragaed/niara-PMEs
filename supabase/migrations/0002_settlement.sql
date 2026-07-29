-- ============================================================================
-- Niara-PMEs -- 0002_settlement
-- Fechamento all-or-nothing. So MEXE EM ESTADO no banco. Efeitos externos
-- (release de escrow, emissao de token) sao do app, via adapters, DEPOIS.
-- ============================================================================

begin;

-- Resolve a oferta: se o PAGO (paid/settled) atingiu o minimo -> 'funded';
-- senao -> 'failed' e devolve/cancela os aportes. Idempotente por status.
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
    -- reservas que nunca pagaram nao entram: cancela.
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

-- Marca a oferta como liquidada DEPOIS que o app fez release + emissao de token
-- (mock). Chamada pelo closeOffering do app apos os efeitos externos.
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
