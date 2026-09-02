-- ============================================================================
-- Niara-PMEs -- 0013_onchain_sync_endereco
-- Corrige um bug de correcao (nao so de performance) em onchain_sync_state:
-- antes, last_synced_block era um numero solto, sem saber a qual geracao de
-- contratos ele pertencia. Se a infra fosse redeployada (como ja aconteceu em
-- 2026-08-15, por perda da chave do deployer), o painel /socios continuaria
-- escaneando a partir do ultimo bloco salvo -- que pertence aos contratos
-- ANTIGOS -- e nunca voltaria atras para pegar os eventos do inicio da vida
-- dos contratos NOVOS. Ou seja: um redeploy nao avisado silenciosamente
-- perderia todo o historico de eventos anteriores ao momento em que alguem
-- rodasse o backfill de novo.
--
-- Agora onchain_sync_state tambem guarda o endereco do MockBRL vigente quando
-- aquele bloco foi sincronizado. Em src/lib/web3/events.ts, se o endereco
-- salvo nao bate com o endereco atual (NEXT_PUBLIC_MOCKBRL_ADDRESS), o codigo
-- entende que houve um redeploy e recalcula o ponto de partida automaticamente
-- (ver encontrarBlocoDeploy em eventsCore.ts), sem precisar de intervencao
-- manual nem de lembrar de atualizar uma constante.
-- ============================================================================

begin;

alter table onchain_sync_state add column mock_brl_address text;

commit;
