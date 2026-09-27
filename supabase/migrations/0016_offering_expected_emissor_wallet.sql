-- ============================================================================
-- Niara-PMEs -- 0016_offering_expected_emissor_wallet
-- Fecha uma lacuna encontrada DEPOIS de 0015 e do incidente EIP-7702 (ver
-- CLAUDE.md, "Tela /empresa/ofertas" -> "EIP-7702"): confirmarPublicacao()
-- comparava o `emissor` do evento contra issuers.wallet_address lido AO VIVO
-- no momento da confirmacao. Isso e uma pergunta diferente da que precisa ser
-- respondida -- "quem assinou tinha autoridade NO MOMENTO EM QUE ASSINOU?" --
-- e so por acaso coincidia com "issuers.wallet_address agora" enquanto
-- confirmarPublicacao rodava sempre logo depois da assinatura. O botao
-- "Reprocessar" (adicionado para corrigir o EIP-7702) quebrou essa coincidencia
-- de proposito: ele existe para rodar confirmarPublicacao a qualquer distancia
-- no tempo, inclusive depois de issuers.wallet_address ja ter mudado -- o que
-- faria uma reconfirmacao futura comparar contra a carteira ERRADA de forma
-- silenciosa.
--
-- Correcao: expected_emissor_wallet congela, no momento de registrarTentativa
-- (ANTES de esperar confirmacao, mesmo instante em que tx_hash/opens_at/
-- closes_at ja sao congelados hoje), a carteira que era issuers.wallet_address
-- NAQUELE momento -- lida pelo proprio servidor, nunca aceita do cliente (o
-- cliente ja poderia estar mentindo sobre qual carteira "deveria" ser a
-- esperada; so uma leitura do servidor contra a linha de issuers serve como
-- ancora). confirmarPublicacao passa a comparar so contra esta coluna,
-- nunca mais contra um select em issuers.
--
-- 🔴 JANELA DO BACKFILL: o UPDATE de backfill abaixo le issuers.wallet_address
-- AO VIVO (join), porque nenhuma outra fonte de verdade existe para linhas
-- criadas antes desta coluna existir. Isso SO produz o valor certo enquanto
-- issuers.wallet_address ainda for a carteira que realmente assinou a
-- tentativa em aberto -- se alguem trocar a carteira vinculada entre este
-- backfill e agora, o valor congelado ficaria errado, de forma permanente e
-- silenciosa (a coluna passa a ser protegida por trigger logo em seguida).
-- Por isso o SELECT final deste script mostra, lado a lado, o tx_hash e a
-- carteira encontrada no momento do backfill -- confira ANTES de trocar
-- qualquer issuers.wallet_address depois de rodar isto.
--
-- REVERSIBILIDADE: aditiva (1 coluna + 2 constraints + 1 trigger/funcao novos;
-- nenhuma coluna/linha/trigger existente de 0015 e alterada). Sem
-- "0016_down.sql" pelo mesmo motivo ja documentado em 0015 (supabase db push
-- so aplica para frente).
-- ============================================================================

begin;

alter table offerings
  add column expected_emissor_wallet text;

alter table offerings
  add constraint expected_emissor_wallet_format
    check (expected_emissor_wallet is null or expected_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$');

-- Snapshot ANTES do backfill: toda linha que ainda nao tem o valor congelado
-- mas ja passou por registrarTentativa pelo menos uma vez (pendente,
-- divergente ou -- por ja existir de uma versao anterior deste fluxo --
-- confirmada). Guardado numa tabela temporaria só para poder ser exibido
-- lado a lado com o resultado DEPOIS do UPDATE, no mesmo SELECT final --
-- mesmo padrão já usado para verificar a trigger de imutabilidade de 0015.
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

-- Backfill propriamente dito: para cada linha acima, congela
-- issuers.wallet_address de agora como se fosse o valor lido no momento (já
-- passado) de registrarTentativa. Só grava quando a wallet não é nula --
-- se alguma linha afetada tiver issuers.wallet_address nulo, ela fica de fora
-- aqui e a constraint sync_status_tem_wallet_esperada (mais abaixo) vai
-- recusar a migration inteira nesse caso, em vez de deixar passar uma linha
-- inconsistente — sinal de que precisa ser investigado à mão antes de seguir.
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

-- expected_emissor_wallet fica FORA da trigger de imutabilidade de 0015
-- (enforce_onchain_publish_immutable) pelo mesmo motivo que tx_hash já fica:
-- no caminho reverted -> sync_status='nao_onchain' (confirmarPublicacao,
-- ramo `receipt.status === "reverted"`), tx_hash e expected_emissor_wallet
-- precisam poder ser limpos juntos para permitir uma nova tentativa via
-- registrarTentativa. A trigger condicional abaixo cobre exatamente o que
-- 0015 cobre para as outras 4 colunas, mas com a condição certa para esta:
-- trava a alteração quando ela levaria (ou já levou) a linha para
-- 'confirmada'/'divergente' -- os dois estados em que o valor já cumpriu seu
-- papel de comparação e vira fato histórico -- e permite quando o destino é
-- 'nao_onchain' (reset para nova tentativa) ou 'pendente' (primeiro
-- congelamento, registrarTentativa). A checagem é sobre NEW.sync_status, não
-- OLD: o reset legítimo parte de 'pendente' OU 'divergente' (uma
-- reconfirmação também pode achar a transação revertida) indo para
-- 'nao_onchain' -- travar por OLD.sync_status='divergente' bloquearia esse
-- reset legítimo por engano.
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

-- Snapshot DEPOIS do backfill, pelos mesmos ids capturados antes.
drop table if exists pg_temp.wallet_backfill_depois;
create temporary table wallet_backfill_depois as
select o.id, o.expected_emissor_wallet
from offerings o
where o.id in (select id from wallet_backfill_antes);

-- RESULTADO A CONFERIR: uma linha por oferta afetada, com a carteira vista no
-- momento do backfill ao lado do valor que ficou congelado -- os dois devem
-- ser idênticos em todas as linhas (é exatamente isso que o UPDATE faz), e o
-- valor da "Empresa Teste" tem que ser 0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6.
-- Se sync_status_tem_wallet_esperada acima disparar (algum issuers.wallet_address
-- nulo numa linha que precisava dele), a transação inteira já terá dado
-- ROLLBACK antes deste SELECT rodar -- Studio mostra o erro da constraint em
-- vez desta tabela.
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

-- RLS: nenhuma mudança -- mesma justificativa de 0015 (acesso só via client
-- admin, escopado por resolveAccount() no código).

commit;
