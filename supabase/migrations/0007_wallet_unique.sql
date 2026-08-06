-- ============================================================================
-- Niara-PMEs -- 0007_wallet_unique
-- Uma carteira so pode estar vinculada a UMA conta. wallet_address e nullable
-- e o UNIQUE do Postgres permite varios NULL -> contas sem carteira nao colidem;
-- so dois enderecos IGUAIS preenchidos e que sao barrados.
-- (unique e por tabela; colisao investor<->issuer com a mesma carteira nao e
--  coberta aqui -- aceitavel no estagio atual.)
-- ============================================================================

begin;

alter table investors add constraint investors_wallet_unique unique (wallet_address);
alter table issuers   add constraint issuers_wallet_unique   unique (wallet_address);

commit;
