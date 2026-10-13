-- ============================================================================
-- Niara-PMEs -- 0005_confirm_investment
-- Confirms an investment (reserved -> paid) ATOMICALLY: records the payment
-- event (idempotent) and transitions the status in the SAME transaction. The KYC
-- gate is still the enforce_investment_transition trigger (0001): if KYC is not
-- approved, the UPDATE raises an exception and the WHOLE function rolls back
-- (including the inserted payment_events) -- nothing is left half-written.
-- The escrow/payment itself is a MOCK and runs in the app (it generates a "MOCK-" ref);
-- here we only persist the result.
-- ============================================================================

begin;

create function confirm_investment(
  p_investment_id uuid,
  p_external_ref  text,
  p_idempotency_key text
) returns text language plpgsql as $fn$
declare v_status text;
begin
  select status into v_status from investments where id = p_investment_id for update;
  if v_status is null then
    raise exception 'Aporte % nao existe', p_investment_id using errcode = 'check_violation';
  end if;
  if v_status = 'paid' then
    return 'already_paid';                 -- idempotent: already confirmed
  end if;
  if v_status <> 'reserved' then
    raise exception 'Aporte nao esta reservado (status=%)', v_status using errcode = 'check_violation';
  end if;

  -- idempotency by key: a retry with the same key doesn't duplicate the event
  if exists (select 1 from payment_events where idempotency_key = p_idempotency_key) then
    return 'already_processed';
  end if;

  insert into payment_events(investment_id, event_type, external_ref, idempotency_key)
    values (p_investment_id, 'payment_confirmed', p_external_ref, p_idempotency_key);

  -- reserved -> paid; the trigger gates KYC. If pending, it raises and also
  -- rolls back the insert above.
  update investments set status = 'paid', payment_ref = p_external_ref
    where id = p_investment_id;

  return 'paid';
end $fn$;

commit;
