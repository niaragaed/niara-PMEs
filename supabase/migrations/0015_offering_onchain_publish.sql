-- ============================================================================
-- Niara-PMEs -- 0015_offering_onchain_publish
-- Fase 3: publicacao self-service da oferta em Sepolia, pelo proprio emissor
-- (ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md). offerings.status NAO MUDA nesta
-- migration -- publicacao on-chain e um conjunto de colunas ORTOGONAL, nunca
-- um novo valor do CHECK de status (a Etapa 0 do plano documenta por que:
-- 'active' ja tem outro significado, incompativel, no fluxo mock de
-- /investir).
--
-- NAO existe coluna "emissor designado" pre-assinatura: a titularidade antes
-- de assinar e checada AO VIVO contra issuers.wallet_address (coluna ja
-- existente, 0006_profile_details.sql) + emissoresAutorizados on-chain --
-- nenhuma das duas precisa de coluna nova aqui. onchain_emissor_wallet
-- abaixo NAO e uma designacao: e um registro de auditoria, gravado uma unica
-- vez, so pela rotina de confirmacao do servidor, com o valor lido direto
-- do evento OfertaCompletaCriada ja minerado -- nunca uma alegacao aceita de
-- ninguem.
--
-- 'divergente' cobre duas coisas DIFERENTES: (a) uma anomalia na leitura do
-- recibo (raro) e (b) o caso principal esperado -- a oferta on-chain e
-- IMUTAVEL depois de criada, mas a linha de offerings NAO E, nada aqui
-- impede um UPDATE manual em hard_cap_cents/share_price_cents/opens_at/
-- closes_at depois da publicacao. Por isso opens_at/closes_at sao
-- "congelados" no exato prazo enviado a chain no momento da publicacao (ver
-- Server Action registrarTentativa, sub-etapa 4 do plano) -- so assim uma
-- comparacao futura contra o valor imutavel on-chain faz sentido.
--
-- REVERSIBILIDADE: aditiva por completo (8 colunas novas, todas nullable ou
-- com default; nenhuma coluna/linha existente e alterada). Reversao =
-- desfazer exatamente o que foi feito aqui, na ordem inversa (constraints ->
-- trigger/funcao -> indice -> colunas). Nao ha "0015_down.sql" neste
-- diretorio de proposito: um arquivo aqui seria tratado como MAIS uma
-- migration por `supabase db push` (aplicada para frente, nao para tras) --
-- se um dia for preciso reverter de verdade, o SQL de reversao mora fora de
-- supabase/migrations/ (ver verificacao desta migration, rodada manualmente
-- e sempre dentro de uma transacao com ROLLBACK ao final).
-- ============================================================================

begin;

alter table offerings
  add column contract_address       text,
  add column token_address          text,
  add column onchain_emissor_wallet text,
  add column tx_hash                text,
  add column chain_id                integer,
  add column sync_status             text not null default 'nao_onchain',
  add column onchain_confirmed_at    timestamptz,
  add column onchain_last_error      text;

-- Formato de endereco/hash -- mesma regex ja usada no frontend
-- (src/lib/web3/addresses.ts HEX_ADDRESS_PATTERN), replicada aqui como
-- ultima linha de defesa (o banco nunca aceita lixo, mesma filosofia dos
-- triggers da Res. 88 em 0001_core.sql).
alter table offerings
  add constraint contract_address_format
    check (contract_address is null or contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint token_address_format
    check (token_address is null or token_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint onchain_emissor_wallet_format
    check (onchain_emissor_wallet is null or onchain_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint tx_hash_format
    check (tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$');

alter table offerings
  add constraint sync_status_valid
    check (sync_status in ('nao_onchain', 'pendente', 'confirmada', 'divergente'));

-- Consistencia entre sync_status e as colunas que ele descreve -- mesmo
-- principio ja usado pelos CHECKs da Res.88: a invariante mora no banco, nao
-- so na Server Action.
alter table offerings
  add constraint sync_status_pendente_tem_tx
    check (sync_status not in ('pendente', 'confirmada', 'divergente') or tx_hash is not null),
  add constraint sync_status_confirmada_tem_enderecos
    check (
      sync_status <> 'confirmada'
      or (
        contract_address is not null
        and token_address is not null
        and onchain_emissor_wallet is not null
        and chain_id is not null
      )
    );

-- Nome explicito (nao deixar o Postgres auto-gerar) -- torna a reversao
-- determinista, sem precisar adivinhar o nome do indice depois.
create index offerings_sync_status_idx on offerings (sync_status) where sync_status <> 'nao_onchain';

-- Imutabilidade das 4 colunas que registram o que a chain ja confirmou --
-- ISSO NAO E SO UMA GUARDA DE APLICACAO (WHERE sync_status='pendente' na
-- Server Action): e travado no proprio banco, mesmo padrao ja usado pelos
-- triggers de transicao de investments em 0001_core.sql. Rodar a
-- confirmacao duas vezes (ou qualquer outro codigo, presente ou futuro)
-- NUNCA sobrescreve um valor ja gravado -- so REVERTE (SQLSTATE 23514/
-- check_violation, mesmo padrao de erro das triggers da Res.88).
-- tx_hash e sync_status ficam DE FORA desta trava de proposito: tx_hash
-- precisa poder ser limpo/trocado numa nova tentativa apos um revert
-- (pendente -> nao_onchain), e sync_status precisa poder ir para
-- 'divergente' a partir de 'confirmada' (drift de parametros).
create function enforce_onchain_publish_immutable() returns trigger language plpgsql as $fn$
begin
  if old.contract_address is not null and new.contract_address is distinct from old.contract_address then
    raise exception 'offerings.contract_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.token_address is not null and new.token_address is distinct from old.token_address then
    raise exception 'offerings.token_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.onchain_emissor_wallet is not null and new.onchain_emissor_wallet is distinct from old.onchain_emissor_wallet then
    raise exception 'offerings.onchain_emissor_wallet e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  return new;
end $fn$;

create trigger offerings_onchain_publish_immutable before update on offerings
  for each row execute function enforce_onchain_publish_immutable();

-- RLS: NENHUMA mudanca. offerings continua default-deny, sem policy --
-- acesso as colunas novas passa pelo mesmo client admin (service_role) ja
-- usado em toda Server Action de oferta, escopado por resolveAccount() no
-- codigo da aplicacao. Nao habilito auth.uid() aqui pela mesma razao ja
-- registrada em 0003_auth_link.sql: nao afrouxar sem necessidade -- e porque
-- nao ha nenhuma coluna pre-assinatura cuja escrita dependeria dessa
-- protecao (a titularidade e verificada ao vivo contra issuers.wallet_address
-- + emissoresAutorizados on-chain, nao contra uma coluna desta tabela).

commit;
