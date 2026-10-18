-- ============================================================================
-- Niara-PMEs -- 0009_offer_public
-- Publication control + offering category.
-- publish_cnpj: explicit opt-in. Default FALSE => by default the CNPJ does NOT appear
--   on the public offering; it only appears (masked) if the company checks it.
-- category: the offering's token type. All selectable in the demo environment
--   (with notices in the UI); the real regulatory framework varies by category.
-- ============================================================================

begin;

alter table issuers
  add column publish_cnpj boolean not null default false;

alter table offerings
  add column category text
    check (category is null or category in ('pmes','agro','imobiliario','auto','divida'));

commit;
