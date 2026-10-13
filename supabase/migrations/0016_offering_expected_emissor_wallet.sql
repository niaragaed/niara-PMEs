-- ============================================================================
-- Niara-PMEs -- 0016_offering_expected_emissor_wallet
-- Closes a gap found AFTER 0015 and the EIP-7702 incident (see
-- CLAUDE.md, "/company/offerings screen" -> "EIP-7702"): confirmarPublicacao()
-- compared the event's `emissor` against issuers.wallet_address read LIVE
-- at confirmation time. That answers a different question from the one that needs
-- answering -- "did the signer have authority AT THE MOMENT THEY SIGNED?" --
-- and only coincided by chance with "issuers.wallet_address now" while
-- confirmarPublicacao always ran right after the signature. The
-- "Reprocess" button (added to fix EIP-7702) broke that coincidence
-- on purpose: it exists to run confirmarPublicacao at any distance
-- in time, including after issuers.wallet_address has already changed -- which
-- would make a future reconfirmation compare against the WRONG wallet,
-- silently.
--
-- Fix: expected_emissor_wallet freezes, at registrarTentativa time
-- (BEFORE waiting for confirmation, the same instant tx_hash/opens_at/
-- closes_at are already frozen today), the wallet that was issuers.wallet_address
-- AT THAT moment -- read by the server itself, never accepted from the client (the
-- client could already be lying about which wallet "should" be the
-- expected one; only a server read against the issuers row serves as an
-- anchor). confirmarPublicacao now compares only against this column,
-- never again against a select on issuers.
--
-- 🔴 BACKFILL WINDOW: the backfill UPDATE below reads issuers.wallet_address
-- LIVE (join), because no other source of truth exists for rows
-- created before this column existed. It ONLY produces the right value while
-- issuers.wallet_address is still the wallet that actually signed the
-- open attempt -- if someone switches the linked wallet between this
-- backfill and now, the frozen value would be wrong, permanently and
-- silently (the column becomes protected by a trigger right afterwards).
-- That's why the final SELECT of this script shows, side by side, the tx_hash and the
-- wallet found at backfill time -- check it BEFORE switching
-- any issuers.wallet_address after running this.
--
-- REVERSIBILITY: additive (1 column + 2 constraints + 1 new trigger/function;
-- no existing column/row/trigger from 0015 is changed). No
-- "0016_down.sql" for the same reason already documented in 0015 (supabase db push
-- only applies forward).
-- ============================================================================

begin;

alter table offerings
  add column expected_emissor_wallet text;

alter table offerings
  add constraint expected_emissor_wallet_format
    check (expected_emissor_wallet is null or expected_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$');

-- Snapshot BEFORE the backfill: every row that doesn't have the frozen value yet
-- but has already gone through registrarTentativa at least once (pendente,
-- divergente or -- because it already existed from an earlier version of this flow --
-- confirmada). Stored in a temporary table only so it can be shown
-- side by side with the result AFTER the UPDATE, in the same final SELECT --
-- same pattern already used to verify 0015's immutability trigger.
drop table if exists pg_temp.wallet_backfill_antes;
create temporary table wallet_backfill_antes as
select
  o.id,
  o.sync_status,
  o.tx_hash,
  i.wallet_address as carteira_do_emissor_agora
from offerings o
join issuers i on i.id = o.issuer_id
where o.sync_status in ('pendente', 'divergente', 'confirmada')
  and o.expected_emissor_wallet is null;

-- The backfill itself: for each row above, freezes
-- today's issuers.wallet_address as if it were the value read at the (past)
-- registrarTentativa moment. It only writes when the wallet is not null --
-- if an affected row has a null issuers.wallet_address, it is left out
-- here and the sync_status_tem_wallet_esperada constraint (further below) will
-- refuse the whole migration in that case, instead of letting an inconsistent
-- row through -- a sign that it must be investigated by hand before moving on.
update offerings o
set expected_emissor_wallet = i.wallet_address
from issuers i
where i.id = o.issuer_id
  and o.sync_status in ('pendente', 'divergente', 'confirmada')
  and o.expected_emissor_wallet is null
  and i.wallet_address is not null;

alter table offerings
  add constraint sync_status_tem_wallet_esperada
    check (sync_status not in ('pendente', 'confirmada', 'divergente') or expected_emissor_wallet is not null);

-- expected_emissor_wallet stays OUT of 0015's immutability trigger
-- (enforce_onchain_publish_immutable) for the same reason tx_hash does:
-- on the reverted -> sync_status='nao_onchain' path (confirmarPublicacao,
-- `receipt.status === "reverted"` branch), tx_hash and expected_emissor_wallet
-- must be clearable together to allow a new attempt via
-- registrarTentativa. The conditional trigger below covers exactly what
-- 0015 covers for the other 4 columns, but with the right condition for this one:
-- it locks the change when it would take (or already took) the row to
-- 'confirmada'/'divergente' -- the two states in which the value has done its
-- job as a comparison and becomes a historical fact -- and allows it when the target is
-- 'nao_onchain' (reset for a new attempt) or 'pendente' (first
-- freeze, registrarTentativa). The check is on NEW.sync_status, not
-- OLD: the legitimate reset starts from 'pendente' OR 'divergente' (a
-- reconfirmation may also find the transaction reverted) going to
-- 'nao_onchain' -- locking on OLD.sync_status='divergente' would block that
-- legitimate reset by mistake.
create function enforce_expected_wallet_locked() returns trigger language plpgsql as $fn$
begin
  if new.expected_emissor_wallet is distinct from old.expected_emissor_wallet
     and new.sync_status in ('confirmada', 'divergente') then
    raise exception 'offerings.expected_emissor_wallet nao pode mudar quando sync_status vai para confirmada ou divergente' using errcode = '23514';
  end if;
  return new;
end $fn$;

create trigger offerings_expected_wallet_locked before update on offerings
  for each row execute function enforce_expected_wallet_locked();

-- Snapshot AFTER the backfill, for the same ids captured before.
drop table if exists pg_temp.wallet_backfill_depois;
create temporary table wallet_backfill_depois as
select o.id, o.expected_emissor_wallet
from offerings o
where o.id in (select id from wallet_backfill_antes);

-- RESULT TO CHECK: one row per affected offering, with the wallet seen at
-- backfill time next to the value that was frozen -- the two must
-- be identical on every row (that is exactly what the UPDATE does), and the
-- "Empresa Teste" value must be 0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6.
-- If sync_status_tem_wallet_esperada above fires (some null issuers.wallet_address
-- on a row that needed it), the whole transaction will already have
-- ROLLED BACK before this SELECT runs -- Studio shows the constraint error
-- instead of this table.
select
  b.id as offering_id,
  b.sync_status,
  b.tx_hash,
  b.carteira_do_emissor_agora as carteira_no_momento_do_backfill,
  d.expected_emissor_wallet as valor_congelado,
  (b.carteira_do_emissor_agora is not distinct from d.expected_emissor_wallet) as bateu
from wallet_backfill_antes b
join wallet_backfill_depois d using (id)
order by b.id;

-- RLS: no change -- same justification as 0015 (access only via the admin
-- client, scoped by resolveAccount() in the code).

commit;
