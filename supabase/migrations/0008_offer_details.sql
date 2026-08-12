-- ============================================================================
-- Niara-PMEs -- 0008_offer_details
-- Dados descritivos da empresa (aparecem na pagina da oferta) + valor por cota.
-- Localizacao NAO ganha coluna: reaproveita addr_city + addr_state (0006).
-- Numero de cotas NAO e coluna: deriva de base_cap_cents / share_price_cents.
-- ============================================================================

begin;

-- Dados publicos da empresa (nivel empresa: preenche 1x, vale p/ todas as ofertas)
alter table issuers
  add column sector           text,   -- setor de atuacao (ex.: "Saude")
  add column business_summary text;    -- resumo do negocio

-- Valor por cota na oferta. Nullable (ofertas antigas nao tem). Quando presente:
-- > 0 e precisa dividir o valor da oferta (base_cap) em cotas inteiras.
alter table offerings
  add column share_price_cents bigint
    check (
      share_price_cents is null
      or (share_price_cents > 0 and base_cap_cents % share_price_cents = 0)
    );

commit;
