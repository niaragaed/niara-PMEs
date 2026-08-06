-- ============================================================================
-- Niara-PMEs -- 0005_confirm_investment
-- Confirma um aporte (reserved -> paid) de forma ATOMICA: registra o evento de
-- pagamento (idempotente) e transiciona o status na MESMA transacao. O gate de
-- KYC continua sendo do trigger enforce_investment_transition (0001): se o KYC
-- nao estiver aprovado, o UPDATE levanta excecao e TODA a funcao faz rollback
-- (inclusive o payment_events inserido) -- nada fica gravado pela metade.
-- O escrow/pagamento em si e MOCK e roda no app (gera ref "MOCK-"); aqui so
-- persistimos o resultado.
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
    return 'already_paid';                 -- idempotente: ja confirmado
  end if;
  if v_status <> 'reserved' then
    raise exception 'Aporte nao esta reservado (status=%)', v_status using errcode = 'check_violation';
  end if;

  -- idempotencia por chave: retry com a mesma chave nao duplica evento
  if exists (select 1 from payment_events where idempotency_key = p_idempotency_key) then
    return 'already_processed';
  end if;

  insert into payment_events(investment_id, event_type, external_ref, idempotency_key)
    values (p_investment_id, 'payment_confirmed', p_external_ref, p_idempotency_key);

  -- reserved -> paid ; o trigger gateia o KYC. Se pendente, levanta e faz
  -- rollback do insert acima tambem.
  update investments set status = 'paid', payment_ref = p_external_ref
    where id = p_investment_id;

  return 'paid';
end $fn$;

commit;
