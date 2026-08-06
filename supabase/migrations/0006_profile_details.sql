-- ============================================================================
-- Niara-PMEs -- 0006_profile_details
-- Campos completos de perfil (contato + endereco) e carteira, para investors e
-- issuers. TODOS NULLABLE: o cadastro minimo (nome + documento) continua valido;
-- o resto e preenchido/editado no /perfil.
--
-- IMPORTANTE: no ambiente atual estes sao dados de DEMONSTRACAO/ficticios (a UI
-- deve deixar isso explicito, alem do is_demo na linha). Em producao, isto vira
-- PII real -> responsabilidade de LGPD (tratamento, consentimento, retencao).
-- ============================================================================

begin;

-- Investidores (pessoa fisica)
alter table investors
  add column birth_date        date,
  add column phone             text,
  add column wallet_address    text,   -- carteira MetaMask conectada (0x...)
  add column addr_cep          text,
  add column addr_street       text,
  add column addr_number       text,
  add column addr_complement   text,
  add column addr_neighborhood text,
  add column addr_city         text,
  add column addr_state        text;   -- UF

-- Empresas (pessoa juridica)
alter table issuers
  add column trade_name        text,   -- nome fantasia
  add column phone             text,
  add column wallet_address    text,
  add column addr_cep          text,
  add column addr_street       text,
  add column addr_number       text,
  add column addr_complement   text,
  add column addr_neighborhood text,
  add column addr_city         text,
  add column addr_state        text;

commit;
