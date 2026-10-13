// Dados fictícios de demonstração para as telas /negociar (hub, categorias,
// detalhe da oferta e boleta). Nenhuma empresa, CNPJ, valor financeiro ou
// termo de oferta aqui é real — tudo é ilustrativo, escolhido só para ser
// internamente coerente (ex.: metaCaptacao ≈ valorPorToken × quantidade).
// Nenhuma promessa de retorno é feita: não há campo de rendimento/projeção.

import type { TokenCategory } from "@/lib/mock/ativos";
import { ONCHAIN_SMES_SLUGS_IN_ORDER } from "@/lib/mock/ofertasOnChain";
import {
  ONCHAIN_SMES_AUTHORIZED_SHARES,
  ONCHAIN_SMES_MAX_TARGET_MBRL,
  ONCHAIN_SMES_DEADLINE_DAYS,
  ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
} from "@/lib/web3/demoConstants";

export type TokenType = "equity" | "receivable" | "debt";

export type MonthlyFinancials = {
  month: string;
  revenue: number;
  cash: number;
};

// Indicadores fundamentalistas (demonstração — ver `INDICADORES_DEMONSTRACAO`
// abaixo). Estrutura em grupos, espelhando `ptBr.negociar.oferta.indicadores.
// grupos` — cada chave de item aqui precisa ter a chave correspondente em
// `itens` no dicionário i18n (nome + explicação do popover "?" vivem lá).
export type FundamentalIndicatorValues = {
  valuation: {
    pl: number;
    pvp: number;
    psr: number;
    evEbitda: number;
    evEbit: number;
    pEbitda: number;
    pEbit: number;
    pAtivo: number;
    pAtivoCircLiq: number;
    pCapGiro: number;
    lpa: number;
    vpa: number;
  };
  eficiencia: {
    margemBruta: number;
    margemEbitda: number;
    margemEbit: number;
    margemLiquida: number;
    giroAtivos: number;
  };
  rentabilidade: {
    roe: number;
    roa: number;
    roic: number;
  };
  dividendos: {
    dividendYield: number;
    payout: number;
  };
  endividamento: {
    liquidezCorrente: number;
    dividaLiquidaEbitda: number;
    dividaLiquidaEbit: number;
    dividaLiquidaPatrimonio: number;
    dividaBrutaPatrimonio: number;
    patrimonioAtivos: number;
    passivosAtivos: number;
  };
  crescimento: {
    cagrReceitas5a: number;
  };
};

export type Offering = {
  slug: string;
  name: string;
  category: TokenCategory;
  company: {
    legalName: string;
    tradeName: string;
    cnpj: string;
    sector: string;
    location: string;
    summary: string;
  };
  financial: {
    annualRevenue: number;
    availableCash: number;
    endividamento: number;
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

// Mesmo conjunto de indicadores fictícios para todas as ofertas nesta fase
// (não há análise fundamentalista real de nenhuma empresa) — o campo
// `indicadores` fica por oferta no tipo acima para permitir personalizar
// valores por oferta no futuro sem mudar a modelagem.
const DEMO_INDICATORS: FundamentalIndicatorValues = {
  valuation: {
    pl: 15.87,
    pvp: 0.68,
    psr: 2.5,
    evEbitda: 10.35,
    evEbit: 22.28,
    pEbitda: 6.26,
    pEbit: 13.48,
    pAtivo: 0.25,
    pAtivoCircLiq: -0.31,
    pCapGiro: 5.43,
    lpa: 0.78,
    vpa: 17.99,
  },
  eficiencia: {
    margemBruta: 46.94,
    margemEbitda: 39.93,
    margemEbit: 18.55,
    margemLiquida: 15.76,
    giroAtivos: 0.1,
  },
  rentabilidade: {
    roe: 4.32,
    roa: -3.0,
    roic: 1.83,
  },
  dividendos: {
    dividendYield: 5.64,
    payout: 41.63,
  },
  endividamento: {
    liquidezCorrente: 1.36,
    dividaLiquidaEbitda: 4.09,
    dividaLiquidaEbit: 8.79,
    dividaLiquidaPatrimonio: 0.45,
    dividaBrutaPatrimonio: 0.84,
    patrimonioAtivos: 0.37,
    passivosAtivos: 0.59,
  },
  crescimento: {
    cagrReceitas5a: -2.45,
  },
};

// Construtor determinístico (sem aleatoriedade) da série mensal de
// receita/caixa de cada oferta a partir de um valor-base e uma taxa de
// crescimento — evita autorar 60 números um a um, mantendo a mesma garantia
// de coerência interna (série cresce suavemente até bater com os totais
// anuais declarados em `financeiro`).
function buildMonthlySeries(baseRevenue: number, baseCash: number, growth: number): MonthlyFinancials[] {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  return months.map((month, index) => ({
    month,
    revenue: Math.round(baseRevenue * (1 + growth * index)),
    cash: Math.round(baseCash * (1 + growth * 0.6 * index)),
  }));
}

// Termos das 10 ofertas PME que têm uma oferta real e ativa em Sepolia por trás (ver
// src/lib/mock/ofertasOnChain.ts) — os números aqui são espelhados de
// src/lib/web3/demoConstants.ts, os mesmos valores fixos das 10 ofertas reais, para que a
// pré-visualização estática nunca discorde da leitura ao vivo do contrato (ver
// RealOnChainInvestPanel.tsx). Campos que mudam com o tempo (estado, total arrecadado, prazo
// exato) nunca vêm daqui — sempre de useOfertaOnChainTermos(), direto da chain.
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
    name: "Token PME Padaria Bela Vista",
    category: "pmes",
    company: {
      legalName: "Padaria Bela Vista Comércio de Alimentos Ltda.",
      tradeName: "Padaria Bela Vista",
      cnpj: "12.345.678/0001-90",
      sector: "Alimentação e varejo",
      location: "São Paulo, SP",
      summary:
        "Rede de 4 padarias artesanais na Zona Oeste de São Paulo, buscando capital para abrir uma nova unidade e modernizar equipamentos.",
    },
    financial: {
      annualRevenue: 2_400_000,
      availableCash: 180_000,
      endividamento: 320_000,
      monthlySeries: buildMonthlySeries(180_000, 28_000, 0.03),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-clinica-vitalis",
    name: "Token PME Clínica Vitalis",
    category: "pmes",
    company: {
      legalName: "Clínica Vitalis Odontologia Ltda.",
      tradeName: "Clínica Vitalis",
      cnpj: "23.456.789/0001-01",
      sector: "Saúde",
      location: "Belo Horizonte, MG",
      summary:
        "Clínica odontológica com 3 anos de operação buscando recursos para abrir uma segunda unidade de atendimento.",
    },
    financial: {
      annualRevenue: 1_100_000,
      availableCash: 90_000,
      endividamento: 60_000,
      monthlySeries: buildMonthlySeries(85_000, 14_000, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-barbearia-corte-estilo",
    name: "Token PME Barbearia Corte & Estilo",
    category: "pmes",
    company: {
      legalName: "Corte & Estilo Barbearia Ltda.",
      tradeName: "Barbearia Corte & Estilo",
      cnpj: "13.456.789/0001-02",
      sector: "Serviços de beleza e estética",
      location: "Salvador, BA",
      summary:
        "Barbearia com 3 cadeiras e agenda cheia no bairro do Rio Vermelho, buscando capital para abrir uma segunda unidade e comprar equipamento novo.",
    },
    financial: {
      annualRevenue: 620_000,
      availableCash: 45_000,
      endividamento: 30_000,
      monthlySeries: buildMonthlySeries(48_000, 7_000, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-petshop-amigo-fiel",
    name: "Token PME Pet Shop Amigo Fiel",
    category: "pmes",
    company: {
      legalName: "Amigo Fiel Comércio Pet Ltda.",
      tradeName: "Pet Shop Amigo Fiel",
      cnpj: "14.567.890/0001-13",
      sector: "Varejo pet e serviços veterinários",
      location: "Curitiba, PR",
      summary:
        "Pet shop com banho e tosa e consultório veterinário associado, buscando capital de giro para ampliar o estoque de ração e medicamentos.",
    },
    financial: {
      annualRevenue: 890_000,
      availableCash: 60_000,
      endividamento: 75_000,
      monthlySeries: buildMonthlySeries(68_000, 9_500, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-academia-vigor-fitness",
    name: "Token PME Academia Vigor Fitness",
    category: "pmes",
    company: {
      legalName: "Vigor Fitness Academia Ltda.",
      tradeName: "Academia Vigor Fitness",
      cnpj: "15.678.901/0001-24",
      sector: "Saúde e bem-estar — academia",
      location: "Goiânia, GO",
      summary:
        "Academia de bairro com 400 alunos ativos, buscando recursos para renovar equipamentos de musculação e ampliar o estúdio de aulas coletivas.",
    },
    financial: {
      annualRevenue: 1_350_000,
      availableCash: 95_000,
      endividamento: 180_000,
      monthlySeries: buildMonthlySeries(105_000, 15_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-marcenaria-raizes",
    name: "Token PME Marcenaria Raízes",
    category: "pmes",
    company: {
      legalName: "Raízes Marcenaria e Móveis Planejados Ltda.",
      tradeName: "Marcenaria Raízes",
      cnpj: "16.789.012/0001-35",
      sector: "Móveis planejados sob medida",
      location: "Caxias do Sul, RS",
      summary:
        "Marcenaria especializada em móveis planejados sob medida, buscando capital para comprar uma nova máquina CNC e reduzir o prazo de entrega.",
    },
    financial: {
      annualRevenue: 1_050_000,
      availableCash: 70_000,
      endividamento: 210_000,
      monthlySeries: buildMonthlySeries(82_000, 11_000, 0.018),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-cafeteria-grao-arte",
    name: "Token PME Cafeteria Grão & Arte",
    category: "pmes",
    company: {
      legalName: "Grão & Arte Cafeteria Ltda.",
      tradeName: "Cafeteria Grão & Arte",
      cnpj: "17.890.123/0001-46",
      sector: "Alimentação — cafeteria especial",
      location: "Belo Horizonte, MG",
      summary: "Cafeteria de especialidade com torra própria, buscando capital para abrir um quiosque em um novo shopping da cidade.",
    },
    financial: {
      annualRevenue: 780_000,
      availableCash: 52_000,
      endividamento: 40_000,
      monthlySeries: buildMonthlySeries(60_000, 8_500, 0.03),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-lavanderia-expressa-clean",
    name: "Token PME Lavanderia Expressa Clean",
    category: "pmes",
    company: {
      legalName: "Clean Expressa Lavanderia Ltda.",
      tradeName: "Lavanderia Expressa Clean",
      cnpj: "18.901.234/0001-57",
      sector: "Serviços — lavanderia self-service e sob encomenda",
      location: "Recife, PE",
      summary:
        "Rede de 2 lavanderias self-service com serviço sob encomenda para prédios residenciais, buscando capital para instalar máquinas industriais numa terceira unidade.",
    },
    financial: {
      annualRevenue: 540_000,
      availableCash: 38_000,
      endividamento: 25_000,
      monthlySeries: buildMonthlySeries(42_000, 6_000, 0.02),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-escola-idiomas-global-fluente",
    name: "Token PME Escola de Idiomas Global Fluente",
    category: "pmes",
    company: {
      legalName: "Global Fluente Idiomas Ltda.",
      tradeName: "Escola de Idiomas Global Fluente",
      cnpj: "19.012.345/0001-68",
      sector: "Educação — idiomas",
      location: "Florianópolis, SC",
      summary:
        "Escola de inglês e espanhol com turmas presenciais e online, buscando capital para lançar uma plataforma própria de aulas ao vivo.",
    },
    financial: {
      annualRevenue: 960_000,
      availableCash: 68_000,
      endividamento: 55_000,
      monthlySeries: buildMonthlySeries(74_000, 10_500, 0.025),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "pme-estetica-bella-pele",
    name: "Token PME Estúdio de Estética Bella Pele",
    category: "pmes",
    company: {
      legalName: "Bella Pele Estética Ltda.",
      tradeName: "Estúdio de Estética Bella Pele",
      cnpj: "20.123.456/0001-79",
      sector: "Serviços de beleza e estética",
      location: "Fortaleza, CE",
      summary:
        "Estúdio de estética facial e corporal com equipe de 6 profissionais, buscando capital para adquirir um novo equipamento de radiofrequência.",
    },
    financial: {
      annualRevenue: 700_000,
      availableCash: 48_000,
      endividamento: 35_000,
      monthlySeries: buildMonthlySeries(54_000, 7_500, 0.022),
    },
    indicators: DEMO_INDICATORS,
    terms: buildFixedOnChainTerms(),
    simulatedPrice: ONCHAIN_SMES_PRICE_PER_SHARE_MBRL,
  },
  {
    slug: "agro-cerrado-norte",
    name: "Token Agro Cerrado Norte",
    category: "agro",
    company: {
      legalName: "Cerrado Norte Agropecuária Ltda.",
      tradeName: "Cerrado Norte",
      cnpj: "34.567.890/0001-12",
      sector: "Agronegócio — grãos",
      location: "Rio Verde, GO",
      summary: "Operação de soja e milho no Centro-Oeste, buscando capital de giro para custeio da safra.",
    },
    financial: {
      annualRevenue: 6_200_000,
      availableCash: 410_000,
      endividamento: 1_500_000,
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
    name: "Token Agro Café Mantiqueira",
    category: "agro",
    company: {
      legalName: "Fazenda Mantiqueira Café Especial Ltda.",
      tradeName: "Fazenda Mantiqueira",
      cnpj: "45.678.901/0001-23",
      sector: "Agronegócio — café especial",
      location: "Poços de Caldas, MG",
      summary: "Produtora de café especial buscando recursos para renovar o cafezal e obter certificação orgânica.",
    },
    financial: {
      annualRevenue: 950_000,
      availableCash: 70_000,
      endividamento: 140_000,
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
    name: "Token Imobiliário Residencial Aurora",
    category: "imobiliario",
    company: {
      legalName: "Aurora Empreendimentos Imobiliários SPE Ltda.",
      tradeName: "Residencial Aurora",
      cnpj: "56.789.012/0001-34",
      sector: "Incorporação residencial",
      location: "Curitiba, PR",
      summary: "Sociedade de propósito específico (SPE) de um empreendimento residencial de 40 unidades, com obras em andamento.",
    },
    financial: {
      annualRevenue: 3_800_000,
      availableCash: 260_000,
      endividamento: 2_100_000,
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
    name: "Token Imobiliário Galpão Logístico Sul",
    category: "imobiliario",
    company: {
      legalName: "Galpão Logístico Sul Locações Ltda.",
      tradeName: "Galpão Logístico Sul",
      cnpj: "67.890.123/0001-45",
      sector: "Imóveis logísticos e industriais",
      location: "Porto Alegre, RS",
      summary: "Galpão logístico locado a empresas de e-commerce, buscando capital para expansão do pátio de manobras.",
    },
    financial: {
      annualRevenue: 1_600_000,
      availableCash: 120_000,
      endividamento: 900_000,
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
    name: "Token Auto Frota Sul",
    category: "auto",
    company: {
      legalName: "Frota Sul Locação de Veículos Ltda.",
      tradeName: "Frota Sul",
      cnpj: "78.901.234/0001-56",
      sector: "Locação de veículos",
      location: "Florianópolis, SC",
      summary: "Frota de 60 veículos para locação corporativa, buscando capital para renovar parte da frota.",
    },
    financial: {
      annualRevenue: 2_900_000,
      availableCash: 150_000,
      endividamento: 1_100_000,
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
    name: "Token Auto Oficina Rápida Elétrica",
    category: "auto",
    company: {
      legalName: "Oficina Rápida Elétrica Ltda.",
      tradeName: "Oficina Rápida Elétrica",
      cnpj: "89.012.345/0001-67",
      sector: "Serviços automotivos — veículos elétricos",
      location: "Campinas, SP",
      summary: "Rede de oficinas especializadas em manutenção de veículos elétricos e híbridos, em expansão.",
    },
    financial: {
      annualRevenue: 780_000,
      availableCash: 55_000,
      endividamento: 90_000,
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
    name: "Título de Dívida Confecções Ipê",
    category: "divida",
    company: {
      legalName: "Confecções Ipê Têxtil Ltda.",
      tradeName: "Confecções Ipê",
      cnpj: "90.123.456/0001-78",
      sector: "Têxtil e confecção",
      location: "Fortaleza, CE",
      summary: "Antecipação de recebíveis de vendas para grandes redes de varejo, com prazo médio de 90 dias.",
    },
    financial: {
      annualRevenue: 4_200_000,
      availableCash: 95_000,
      endividamento: 700_000,
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
    name: "Título de Dívida Distribuidora Nordeste",
    category: "divida",
    company: {
      legalName: "Distribuidora Nordeste de Alimentos Ltda.",
      tradeName: "Distribuidora Nordeste",
      cnpj: "01.234.567/0001-89",
      sector: "Distribuição e atacado",
      location: "Recife, PE",
      summary: "Linha de capital de giro para compra antecipada de estoque sazonal.",
    },
    financial: {
      annualRevenue: 5_600_000,
      availableCash: 130_000,
      endividamento: 950_000,
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
      throw new Error(`ONCHAIN_PMES_SLUGS_EM_ORDEM referencia o slug "${slug}", que não existe em OFERTAS.`);
    }
    if (offering.category !== "pmes") {
      throw new Error(`Oferta "${slug}" está ligada a uma oferta on-chain real, mas categoria não é "pmes".`);
    }
  }
}

export function getOfferingBySlug(slug: string): Offering | undefined {
  return OFFERINGS.find((offering) => offering.slug === slug);
}

export function getOfferingsByCategory(category: TokenCategory): Offering[] {
  return OFFERINGS.filter((offering) => offering.category === category);
}

// Vitrine do hub "Ativos e tokens": uma oferta de cada uma de três
// categorias diferentes, para mostrar variedade sem repetir categoria.
export const SHOWCASE_HUB_SLUGS = ["pme-padaria-bela-vista", "agro-cerrado-norte", "imo-residencial-aurora"];

// Lista genérica de material de divulgação — placeholders desabilitados,
// iguais para todas as ofertas (nenhum documento real existe nesta fase).
export const DEFAULT_DOCUMENTS = [
  "Memorando de informações",
  "Balanço financeiro",
  "Demonstrações financeiras",
  "Release de resultados",
  "Apresentação dos resultados",
  "Contrato social / estatuto",
  "Termo de adesão à oferta",
];
