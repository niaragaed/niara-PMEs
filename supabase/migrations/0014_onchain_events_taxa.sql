-- ============================================================================
-- Niara-PMEs -- 0014_onchain_events_taxa
-- Coluna adicional em onchain_events_cache para guardar a taxa (args.taxa) do
-- evento RecursosLiberados -- antes desta migration, o cache só guardava
-- valorEmissor (via valor_wei), então não havia como somar quanto a carteira
-- de protocolo de fato recebeu de taxa (painel /socios). Aditiva, nunca
-- destrutiva: linhas já gravadas ficam com taxa_wei = null (equivalente a "não
-- lido" nesta coluna nova; hoje é sempre 0 de qualquer forma, ver CLAUDE.md do
-- niara-contracts-PMEs, "Decisões travadas" -- taxaBps era 0 em toda oferta
-- existente até esta rodada).
-- ============================================================================

begin;

alter table onchain_events_cache
  add column taxa_wei text;

commit;
