-- ============================================================================
-- Niara-PMEs -- 0009_offer_public
-- Controle de publicacao + categoria da oferta.
-- publish_cnpj: opt-in explicito. Default FALSE => por padrao o CNPJ NAO aparece
--   na oferta publica; so aparece (mascarado) se a empresa marcar.
-- category: tipo de token da oferta. Todas selecionaveis no ambiente de
--   demonstracao (com avisos na UI); enquadramento real varia por categoria.
-- ============================================================================

begin;

alter table issuers
  add column publish_cnpj boolean not null default false;

alter table offerings
  add column category text
    check (category is null or category in ('pmes','agro','imobiliario','auto','divida'));

commit;
