// Fictitious demo data for the /negociar screens (hub, categories,
// offering detail and order ticket). No company, CNPJ, financial value or
// offering term here is real — everything is illustrative, chosen only to be
// internally consistent (e.g. fundraisingTarget ≈ valuePerToken × quantity).
// No promise of return is made: there's no yield/projection field. Display text is written in
// both languages next to the data (LocalizedText); company names are proper names and stay as they are.

import type { TokenCategory } from "@/lib/mock/assets";
import type { LocalizedText } from "@/lib/i18n/locale";
import { ONCHAIN_SMES_SLUGS_IN_ORDER } from "@/lib/mock/onChainOfferings";
import {
  ONCHAIN_SMES_AUTHORIZED_SHARES,
  ONCHAIN_SMES_MAX_TARGET_MBRL,
  ONCHAIN_SMES_DEADLINE_DAYS,
  ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
} from "@/lib/web3/demoConstants";

export type TokenType = "equity" | "receivable" | "debt";

export type MonthlyFinancials = {
  /** 0 = January … 11 = December; the chart turns it into a short month name in the visitor's language. */
  month: number;
  revenue: number;
  cash: number;
};

// Fundamental indicators (demo — see `DEMO_INDICATORS`
// below). Structured in groups, mirroring `dict.trade.offering.indicators.
// groups` — every item key here must have the matching key in
// `items` in the i18n dictionary (the name + the "?" popover explanation live there).
export type FundamentalIndicatorValues = {
  valuation: {
    pe: number;
    pb: number;
    ps: number;
    evEbitda: number;
    evEbit: number;
    pEbitda: number;
    pEbit: number;
    pAssets: number;
    pNetCurrentAssets: number;
    pWorkingCapital: number;
    eps: number;
    bvps: number;
  };
  efficiency: {
    grossMargin: number;
    ebitdaMargin: number;
    ebitMargin: number;
    netMargin: number;
    assetTurnover: number;
  };
  profitability: {
    roe: number;
    roa: number;
    roic: number;
  };
  dividends: {
    dividendYield: number;
    payout: number;
  };
  debt: {
    currentRatio: number;
    netDebtEbitda: number;
    netDebtEbit: number;
    netDebtEquity: number;
    grossDebtEquity: number;
    equityAssets: number;
    liabilitiesAssets: number;
  };
  growth: {
    revenueCagr5y: number;
  };
};

export type Offering = {
  slug: string;
  name: LocalizedText;
  category: TokenCategory;
  company: {
    legalName: string;
    tradeName: string;
    cnpj: string;
    sector: LocalizedText;
    location: string;
    summary: LocalizedText;
  };
  financial: {
    annualRevenue: number;
    availableCash: number;
    debt: number;
    monthlySeries: MonthlyFinancials[];
  };
  indicators: FundamentalIndicatorValues;
  terms: {
    tokenType: TokenType;
    fundraisingTarget: number;
    valuePerToken: number;
    quantityTokens: number;
    deadlineMonths: number;
  };
  simulatedPrice: number;
};

// The same set of fictitious indicators for every offering at this stage
// (there's no real fundamental analysis of any company) — the
// `indicators` field is per offering in the type above to allow customizing
// values per offering in the future without changing the model.
const DEMO_INDICATORS: FundamentalIndicatorValues = {
  valuation: {
    pe: 15.87,
    pb: 0.68,
    ps: 2.5,
    evEbitda: 10.35,
    evEbit: 22.28,
    pEbitda: 6.26,
    pEbit: 13.48,
    pAssets: 0.25,
    pNetCurrentAssets: -0.31,
    pWorkingCapital: 5.43,
    eps: 0.78,
    bvps: 17.99,
  },
  efficiency: {
    grossMargin: 46.94,
    ebitdaMargin: 39.93,
    ebitMargin: 18.55,
    netMargin: 15.76,
    assetTurnover: 0.1,
  },
  profitability: {
    roe: 4.32,
    roa: -3.0,
    roic: 1.83,
  },
  dividends: {
    dividendYield: 5.64,
    payout: 41.63,
  },
  debt: {
    currentRatio: 1.36,
    netDebtEbitda: 4.09,
    netDebtEbit: 8.79,
    netDebtEquity: 0.45,
    grossDebtEquity: 0.84,
    equityAssets: 0.37,
    liabilitiesAssets: 0.59,
  },
  growth: {
    revenueCagr5y: -2.45,
  },
};

// A deterministic (no randomness) builder of each offering's monthly
// revenue/cash series from a base value and a growth
// rate — avoids authoring 60 numbers one by one, keeping the same guarantee
// of internal consistency (the series grows smoothly to match the annual totals
// declared in `financial`).
function buildMonthlySeries(baseRevenue: number, baseCash: number, growth: number): MonthlyFinancials[] {
  return Array.from({ length: 6 }, (_, index) => ({
    month: index,
    revenue: Math.round(baseRevenue * (1 + growth * index)),
    cash: Math.round(baseCash * (1 + growth * 0.6 * index)),
  }));
}

// Terms of the 10 SME offerings that have a real, active offering on Sepolia behind them (see
// src/lib/mock/onChainOfferings.ts) — the numbers here are mirrored from
// src/lib/web3/demoConstants.ts, the same fixed values as the 10 real offerings, so that the
// static preview never disagrees with the live read of the contract (see
// RealOnChainInvestPanel.tsx). Fields that change over time (state, total raised, exact
// deadline) never come from here — always from useOnChainOfferingTerms(), straight from the chain.
function buildFixedOnChainTerms(): Offering["terms"] {
  return {
    tokenType: "equity",
    fundraisingTarget: ONCHAIN_SMES_MAX_TARGET_MBRL,
    valuePerToken: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
    quantityTokens: ONCHAIN_SMES_AUTHORIZED_SHARES,
    deadlineMonths: Math.round(ONCHAIN_SMES_DEADLINE_DAYS / 30),
  };
}

export const OFFERINGS: Offering[] = [
  {
    slug: "pme-padaria-bela-vista",
    name: { pt: "Token PME Padaria Bela Vista", en: "SME Token Padaria Bela Vista" },
    category: "pmes",
    company: {
      legalName: "Padaria Bela Vista Comércio de Alimentos Ltda.",
      tradeName: "Padaria Bela Vista",
      cnpj: "12.345.678/0001-90",
      sector: { pt: "Alimentação e varejo", en: "Food and retail" },
      location: "São Paulo, SP",
      summary: {
        pt: "Rede de 4 padarias artesanais na Zona Oeste de São Paulo, buscando capital para abrir uma nova unidade e modernizar equipamentos.",
        en: "A chain of 4 artisan bakeries in São Paulo's West Zone, raising capital to open a new location and modernize equipment.",
      },
    },
    financial: {
      annualRevenue: 2_400_000,
      availableCash: 180_000,
      debt: 320_000,
      monthlySeries: buildMonthlySeries(180_000, 28_000, 0.03),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-clinica-vitalis",
    name: { pt: "Token PME Clínica Vitalis", en: "SME Token Clínica Vitalis" },
    category: "pmes",
    company: {
      legalName: "Clínica Vitalis Odontologia Ltda.",
      tradeName: "Clínica Vitalis",
      cnpj: "23.456.789/0001-01",
      sector: { pt: "Saúde", en: "Health care" },
      location: "Belo Horizonte, MG",
      summary: {
        pt: "Clínica odontológica com 3 anos de operação buscando recursos para abrir uma segunda unidade de atendimento.",
        en: "A dental clinic operating for 3 years, raising funds to open a second location.",
      },
    },
    financial: {
      annualRevenue: 1_100_000,
      availableCash: 90_000,
      debt: 60_000,
      monthlySeries: buildMonthlySeries(85_000, 14_000, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-barbearia-corte-estilo",
    name: { pt: "Token PME Barbearia Corte & Estilo", en: "SME Token Barbearia Corte & Estilo" },
    category: "pmes",
    company: {
      legalName: "Corte & Estilo Barbearia Ltda.",
      tradeName: "Barbearia Corte & Estilo",
      cnpj: "13.456.789/0001-02",
      sector: { pt: "Serviços de beleza e estética", en: "Beauty and aesthetics services" },
      location: "Salvador, BA",
      summary: {
        pt: "Barbearia com 3 cadeiras e agenda cheia no bairro do Rio Vermelho, buscando capital para abrir uma segunda unidade e comprar equipamento novo.",
        en: "A 3-chair barbershop with a full schedule in the Rio Vermelho neighborhood, raising capital to open a second location and buy new equipment.",
      },
    },
    financial: {
      annualRevenue: 620_000,
      availableCash: 45_000,
      debt: 30_000,
      monthlySeries: buildMonthlySeries(48_000, 7_000, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-petshop-amigo-fiel",
    name: { pt: "Token PME Pet Shop Amigo Fiel", en: "SME Token Pet Shop Amigo Fiel" },
    category: "pmes",
    company: {
      legalName: "Amigo Fiel Comércio Pet Ltda.",
      tradeName: "Pet Shop Amigo Fiel",
      cnpj: "14.567.890/0001-13",
      sector: { pt: "Varejo pet e serviços veterinários", en: "Pet retail and veterinary services" },
      location: "Curitiba, PR",
      summary: {
        pt: "Pet shop com banho e tosa e consultório veterinário associado, buscando capital de giro para ampliar o estoque de ração e medicamentos.",
        en: "A pet shop with grooming and an associated veterinary office, raising working capital to expand its stock of pet food and medicine.",
      },
    },
    financial: {
      annualRevenue: 890_000,
      availableCash: 60_000,
      debt: 75_000,
      monthlySeries: buildMonthlySeries(68_000, 9_500, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-academia-vigor-fitness",
    name: { pt: "Token PME Academia Vigor Fitness", en: "SME Token Academia Vigor Fitness" },
    category: "pmes",
    company: {
      legalName: "Vigor Fitness Academia Ltda.",
      tradeName: "Academia Vigor Fitness",
      cnpj: "15.678.901/0001-24",
      sector: { pt: "Saúde e bem-estar — academia", en: "Health and wellness — gym" },
      location: "Goiânia, GO",
      summary: {
        pt: "Academia de bairro com 400 alunos ativos, buscando recursos para renovar equipamentos de musculação e ampliar o estúdio de aulas coletivas.",
        en: "A neighborhood gym with 400 active members, raising funds to renew its weight-training equipment and expand the group-class studio.",
      },
    },
    financial: {
      annualRevenue: 1_350_000,
      availableCash: 95_000,
      debt: 180_000,
      monthlySeries: buildMonthlySeries(105_000, 15_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-marcenaria-raizes",
    name: { pt: "Token PME Marcenaria Raízes", en: "SME Token Marcenaria Raízes" },
    category: "pmes",
    company: {
      legalName: "Raízes Marcenaria e Móveis Planejados Ltda.",
      tradeName: "Marcenaria Raízes",
      cnpj: "16.789.012/0001-35",
      sector: { pt: "Móveis planejados sob medida", en: "Custom-made furniture" },
      location: "Caxias do Sul, RS",
      summary: {
        pt: "Marcenaria especializada em móveis planejados sob medida, buscando capital para comprar uma nova máquina CNC e reduzir o prazo de entrega.",
        en: "A woodworking shop specializing in custom-made furniture, raising capital to buy a new CNC machine and cut delivery times.",
      },
    },
    financial: {
      annualRevenue: 1_050_000,
      availableCash: 70_000,
      debt: 210_000,
      monthlySeries: buildMonthlySeries(82_000, 11_000, 0.018),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-cafeteria-grao-arte",
    name: { pt: "Token PME Cafeteria Grão & Arte", en: "SME Token Cafeteria Grão & Arte" },
    category: "pmes",
    company: {
      legalName: "Grão & Arte Cafeteria Ltda.",
      tradeName: "Cafeteria Grão & Arte",
      cnpj: "17.890.123/0001-46",
      sector: { pt: "Alimentação — cafeteria especial", en: "Food — specialty coffee shop" },
      location: "Belo Horizonte, MG",
      summary: {
        pt: "Cafeteria de especialidade com torra própria, buscando capital para abrir um quiosque em um novo shopping da cidade.",
        en: "A specialty coffee shop that roasts its own beans, raising capital to open a kiosk in a new mall in the city.",
      },
    },
    financial: {
      annualRevenue: 780_000,
      availableCash: 52_000,
      debt: 40_000,
      monthlySeries: buildMonthlySeries(60_000, 8_500, 0.03),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-lavanderia-expressa-clean",
    name: { pt: "Token PME Lavanderia Expressa Clean", en: "SME Token Lavanderia Expressa Clean" },
    category: "pmes",
    company: {
      legalName: "Clean Expressa Lavanderia Ltda.",
      tradeName: "Lavanderia Expressa Clean",
      cnpj: "18.901.234/0001-57",
      sector: { pt: "Serviços — lavanderia self-service e sob encomenda", en: "Services — self-service and on-demand laundry" },
      location: "Recife, PE",
      summary: {
        pt: "Rede de 2 lavanderias self-service com serviço sob encomenda para prédios residenciais, buscando capital para instalar máquinas industriais numa terceira unidade.",
        en: "A chain of 2 self-service laundromats with on-demand service for residential buildings, raising capital to install industrial machines in a third location.",
      },
    },
    financial: {
      annualRevenue: 540_000,
      availableCash: 38_000,
      debt: 25_000,
      monthlySeries: buildMonthlySeries(42_000, 6_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-escola-idiomas-global-fluente",
    name: { pt: "Token PME Escola de Idiomas Global Fluente", en: "SME Token Escola de Idiomas Global Fluente" },
    category: "pmes",
    company: {
      legalName: "Global Fluente Idiomas Ltda.",
      tradeName: "Escola de Idiomas Global Fluente",
      cnpj: "19.012.345/0001-68",
      sector: { pt: "Educação — idiomas", en: "Education — languages" },
      location: "Florianópolis, SC",
      summary: {
        pt: "Escola de inglês e espanhol com turmas presenciais e online, buscando capital para lançar uma plataforma própria de aulas ao vivo.",
        en: "An English and Spanish school with in-person and online classes, raising capital to launch its own live-class platform.",
      },
    },
    financial: {
      annualRevenue: 960_000,
      availableCash: 68_000,
      debt: 55_000,
      monthlySeries: buildMonthlySeries(74_000, 10_500, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-estetica-bella-pele",
    name: { pt: "Token PME Estúdio de Estética Bella Pele", en: "SME Token Estúdio de Estética Bella Pele" },
    category: "pmes",
    company: {
      legalName: "Bella Pele Estética Ltda.",
      tradeName: "Estúdio de Estética Bella Pele",
      cnpj: "20.123.456/0001-79",
      sector: { pt: "Serviços de beleza e estética", en: "Beauty and aesthetics services" },
      location: "Fortaleza, CE",
      summary: {
        pt: "Estúdio de estética facial e corporal com equipe de 6 profissionais, buscando capital para adquirir um novo equipamento de radiofrequência.",
        en: "A facial and body aesthetics studio with a team of 6 professionals, raising capital to buy new radiofrequency equipment.",
      },
    },
    financial: {
      annualRevenue: 700_000,
      availableCash: 48_000,
      debt: 35_000,
      monthlySeries: buildMonthlySeries(54_000, 7_500, 0.022),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "agro-cerrado-norte",
    name: { pt: "Token Agro Cerrado Norte", en: "Agro Token Cerrado Norte" },
    category: "agro",
    company: {
      legalName: "Cerrado Norte Agropecuária Ltda.",
      tradeName: "Cerrado Norte",
      cnpj: "34.567.890/0001-12",
      sector: { pt: "Agronegócio — grãos", en: "Agribusiness — grains" },
      location: "Rio Verde, GO",
      summary: {
        pt: "Operação de soja e milho no Centro-Oeste, buscando capital de giro para custeio da safra.",
        en: "A soybean and corn operation in the Center-West, raising working capital to fund the harvest.",
      },
    },
    financial: {
      annualRevenue: 6_200_000,
      availableCash: 410_000,
      debt: 1_500_000,
      monthlySeries: buildMonthlySeries(480_000, 60_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "receivable",
      fundraisingTarget: 800_000,
      valuePerToken: 200,
      quantityTokens: 4_000,
      deadlineMonths: 12,
    },
    simulatedPrice: 200,
  },
  {
    slug: "agro-cafe-mantiqueira",
    name: { pt: "Token Agro Café Mantiqueira", en: "Agro Token Café Mantiqueira" },
    category: "agro",
    company: {
      legalName: "Fazenda Mantiqueira Café Especial Ltda.",
      tradeName: "Fazenda Mantiqueira",
      cnpj: "45.678.901/0001-23",
      sector: { pt: "Agronegócio — café especial", en: "Agribusiness — specialty coffee" },
      location: "Poços de Caldas, MG",
      summary: {
        pt: "Produtora de café especial buscando recursos para renovar o cafezal e obter certificação orgânica.",
        en: "A specialty coffee producer raising funds to renew its coffee plantation and obtain organic certification.",
      },
    },
    financial: {
      annualRevenue: 950_000,
      availableCash: 70_000,
      debt: 140_000,
      monthlySeries: buildMonthlySeries(70_000, 11_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "equity",
      fundraisingTarget: 250_000,
      valuePerToken: 80,
      quantityTokens: 3_125,
      deadlineMonths: 30,
    },
    simulatedPrice: 80,
  },
  {
    slug: "imo-residencial-aurora",
    name: { pt: "Token Imobiliário Residencial Aurora", en: "Real Estate Token Residencial Aurora" },
    category: "imobiliario",
    company: {
      legalName: "Aurora Empreendimentos Imobiliários SPE Ltda.",
      tradeName: "Residencial Aurora",
      cnpj: "56.789.012/0001-34",
      sector: { pt: "Incorporação residencial", en: "Residential development" },
      location: "Curitiba, PR",
      summary: {
        pt: "Sociedade de propósito específico (SPE) de um empreendimento residencial de 40 unidades, com obras em andamento.",
        en: "A special purpose company (SPE) for a 40-unit residential development, with construction under way.",
      },
    },
    financial: {
      annualRevenue: 3_800_000,
      availableCash: 260_000,
      debt: 2_100_000,
      monthlySeries: buildMonthlySeries(300_000, 40_000, 0.04),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "receivable",
      fundraisingTarget: 1_200_000,
      valuePerToken: 500,
      quantityTokens: 2_400,
      deadlineMonths: 20,
    },
    simulatedPrice: 500,
  },
  {
    slug: "imo-galpao-logistico-sul",
    name: { pt: "Token Imobiliário Galpão Logístico Sul", en: "Real Estate Token Galpão Logístico Sul" },
    category: "imobiliario",
    company: {
      legalName: "Galpão Logístico Sul Locações Ltda.",
      tradeName: "Galpão Logístico Sul",
      cnpj: "67.890.123/0001-45",
      sector: { pt: "Imóveis logísticos e industriais", en: "Logistics and industrial real estate" },
      location: "Porto Alegre, RS",
      summary: {
        pt: "Galpão logístico locado a empresas de e-commerce, buscando capital para expansão do pátio de manobras.",
        en: "A logistics warehouse leased to e-commerce companies, raising capital to expand its maneuvering yard.",
      },
    },
    financial: {
      annualRevenue: 1_600_000,
      availableCash: 120_000,
      debt: 900_000,
      monthlySeries: buildMonthlySeries(130_000, 18_000, 0.015),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "receivable",
      fundraisingTarget: 600_000,
      valuePerToken: 300,
      quantityTokens: 2_000,
      deadlineMonths: 24,
    },
    simulatedPrice: 300,
  },
  {
    slug: "auto-frota-sul",
    name: { pt: "Token Auto Frota Sul", en: "Auto Token Frota Sul" },
    category: "auto",
    company: {
      legalName: "Frota Sul Locação de Veículos Ltda.",
      tradeName: "Frota Sul",
      cnpj: "78.901.234/0001-56",
      sector: { pt: "Locação de veículos", en: "Vehicle rental" },
      location: "Florianópolis, SC",
      summary: {
        pt: "Frota de 60 veículos para locação corporativa, buscando capital para renovar parte da frota.",
        en: "A fleet of 60 vehicles for corporate rental, raising capital to renew part of the fleet.",
      },
    },
    financial: {
      annualRevenue: 2_900_000,
      availableCash: 150_000,
      debt: 1_100_000,
      monthlySeries: buildMonthlySeries(230_000, 24_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "equity",
      fundraisingTarget: 900_000,
      valuePerToken: 450,
      quantityTokens: 2_000,
      deadlineMonths: 36,
    },
    simulatedPrice: 450,
  },
  {
    slug: "auto-oficina-rapida-eletrica",
    name: { pt: "Token Auto Oficina Rápida Elétrica", en: "Auto Token Oficina Rápida Elétrica" },
    category: "auto",
    company: {
      legalName: "Oficina Rápida Elétrica Ltda.",
      tradeName: "Oficina Rápida Elétrica",
      cnpj: "89.012.345/0001-67",
      sector: { pt: "Serviços automotivos — veículos elétricos", en: "Automotive services — electric vehicles" },
      location: "Campinas, SP",
      summary: {
        pt: "Rede de oficinas especializadas em manutenção de veículos elétricos e híbridos, em expansão.",
        en: "An expanding chain of repair shops specializing in electric and hybrid vehicle maintenance.",
      },
    },
    financial: {
      annualRevenue: 780_000,
      availableCash: 55_000,
      debt: 90_000,
      monthlySeries: buildMonthlySeries(58_000, 9_000, 0.035),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "equity",
      fundraisingTarget: 400_000,
      valuePerToken: 100,
      quantityTokens: 4_000,
      deadlineMonths: 24,
    },
    simulatedPrice: 100,
  },
  {
    slug: "divida-confeccoes-ipe",
    name: { pt: "Título de Dívida Confecções Ipê", en: "Debt Security Confecções Ipê" },
    category: "divida",
    company: {
      legalName: "Confecções Ipê Têxtil Ltda.",
      tradeName: "Confecções Ipê",
      cnpj: "90.123.456/0001-78",
      sector: { pt: "Têxtil e confecção", en: "Textiles and apparel" },
      location: "Fortaleza, CE",
      summary: {
        pt: "Antecipação de recebíveis de vendas para grandes redes de varejo, com prazo médio de 90 dias.",
        en: "Advance on sales receivables from large retail chains, with an average term of 90 days.",
      },
    },
    financial: {
      annualRevenue: 4_200_000,
      availableCash: 95_000,
      debt: 700_000,
      monthlySeries: buildMonthlySeries(340_000, 16_000, 0.01),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "debt",
      fundraisingTarget: 300_000,
      valuePerToken: 1_000,
      quantityTokens: 300,
      deadlineMonths: 6,
    },
    simulatedPrice: 1_000,
  },
  {
    slug: "divida-distribuidora-nordeste",
    name: { pt: "Título de Dívida Distribuidora Nordeste", en: "Debt Security Distribuidora Nordeste" },
    category: "divida",
    company: {
      legalName: "Distribuidora Nordeste de Alimentos Ltda.",
      tradeName: "Distribuidora Nordeste",
      cnpj: "01.234.567/0001-89",
      sector: { pt: "Distribuição e atacado", en: "Distribution and wholesale" },
      location: "Recife, PE",
      summary: {
        pt: "Linha de capital de giro para compra antecipada de estoque sazonal.",
        en: "A working capital line for buying seasonal inventory in advance.",
      },
    },
    financial: {
      annualRevenue: 5_600_000,
      availableCash: 130_000,
      debt: 950_000,
      monthlySeries: buildMonthlySeries(450_000, 21_000, 0.012),
    },
    indicators: DEMO_INDICATORS,
    terms: {
      tokenType: "debt",
      fundraisingTarget: 450_000,
      valuePerToken: 1_000,
      quantityTokens: 450,
      deadlineMonths: 9,
    },
    simulatedPrice: 1_000,
  },
];

if (process.env.NODE_ENV !== "production") {
  for (const slug of ONCHAIN_SMES_SLUGS_IN_ORDER) {
    const offering = OFFERINGS.find((item) => item.slug === slug);
    if (!offering) {
      throw new Error(`ONCHAIN_SMES_SLUGS_IN_ORDER references the slug "${slug}", which doesn't exist in OFFERINGS.`);
    }
    if (offering.category !== "pmes") {
      throw new Error(`Offering "${slug}" is linked to a real on-chain offering, but its category isn't "pmes".`);
    }
  }
}

export function getOfferingBySlug(slug: string): Offering | undefined {
  return OFFERINGS.find((offering) => offering.slug === slug);
}

export function getOfferingsByCategory(category: TokenCategory): Offering[] {
  return OFFERINGS.filter((offering) => offering.category === category);
}

// The "Assets and tokens" hub showcase: one offering from each of three
// different categories, to show variety without repeating a category.
export const SHOWCASE_HUB_SLUGS = ["pme-padaria-bela-vista", "agro-cerrado-norte", "imo-residencial-aurora"];

// The generic list of disclosure documents (disabled placeholders, the same for every offering —
// no real document exists at this stage) lives in the dictionaries: common.defaultDocuments.
