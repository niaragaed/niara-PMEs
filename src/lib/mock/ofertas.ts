// Dados fictícios de demonstração para as telas /negociar (hub, categorias,
// detalhe da oferta e boleta). Nenhuma empresa, CNPJ, valor financeiro ou
// termo de oferta aqui é real — tudo é ilustrativo, escolhido só para ser
// internamente coerente (ex.: metaCaptacao ≈ valorPorToken × quantidade).
// Nenhuma promessa de retorno é feita: não há campo de rendimento/projeção.

import type { TokenCategory } from "@/lib/mock/ativos";

export type TipoToken = "participacao" | "recebivel" | "divida";

export type FinanceiroMensal = {
  mes: string;
  receita: number;
  caixa: number;
};

// Indicadores fundamentalistas (demonstração — ver `INDICADORES_DEMONSTRACAO`
// abaixo). Estrutura em grupos, espelhando `ptBr.negociar.oferta.indicadores.
// grupos` — cada chave de item aqui precisa ter a chave correspondente em
// `itens` no dicionário i18n (nome + explicação do popover "?" vivem lá).
export type IndicadoresFundamentalistas = {
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

export type Oferta = {
  slug: string;
  nome: string;
  categoria: TokenCategory;
  empresa: {
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    setor: string;
    localizacao: string;
    resumo: string;
  };
  financeiro: {
    receitaAnual: number;
    caixaDisponivel: number;
    endividamento: number;
    serieMensal: FinanceiroMensal[];
  };
  indicadores: IndicadoresFundamentalistas;
  termos: {
    tipoToken: TipoToken;
    metaCaptacao: number;
    valorPorToken: number;
    quantidadeTokens: number;
    prazoMeses: number;
  };
  precoSimulado: number;
};

// Mesmo conjunto de indicadores fictícios para todas as ofertas nesta fase
// (não há análise fundamentalista real de nenhuma empresa) — o campo
// `indicadores` fica por oferta no tipo acima para permitir personalizar
// valores por oferta no futuro sem mudar a modelagem.
const INDICADORES_DEMONSTRACAO: IndicadoresFundamentalistas = {
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
function buildSerieMensal(receitaBase: number, caixaBase: number, crescimento: number): FinanceiroMensal[] {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  return meses.map((mes, index) => ({
    mes,
    receita: Math.round(receitaBase * (1 + crescimento * index)),
    caixa: Math.round(caixaBase * (1 + crescimento * 0.6 * index)),
  }));
}

export const OFERTAS: Oferta[] = [
  {
    slug: "pme-padaria-bela-vista",
    nome: "Token PME Padaria Bela Vista",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Padaria Bela Vista Comércio de Alimentos Ltda.",
      nomeFantasia: "Padaria Bela Vista",
      cnpj: "12.345.678/0001-90",
      setor: "Alimentação e varejo",
      localizacao: "São Paulo, SP",
      resumo:
        "Rede de 4 padarias artesanais na Zona Oeste de São Paulo, buscando capital para abrir uma nova unidade e modernizar equipamentos.",
    },
    financeiro: {
      receitaAnual: 2_400_000,
      caixaDisponivel: 180_000,
      endividamento: 320_000,
      serieMensal: buildSerieMensal(180_000, 28_000, 0.03),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "participacao",
      metaCaptacao: 500_000,
      valorPorToken: 100,
      quantidadeTokens: 5_000,
      prazoMeses: 24,
    },
    precoSimulado: 100,
  },
  {
    slug: "pme-clinica-vitalis",
    nome: "Token PME Clínica Vitalis",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Clínica Vitalis Odontologia Ltda.",
      nomeFantasia: "Clínica Vitalis",
      cnpj: "23.456.789/0001-01",
      setor: "Saúde",
      localizacao: "Belo Horizonte, MG",
      resumo:
        "Clínica odontológica com 3 anos de operação buscando recursos para abrir uma segunda unidade de atendimento.",
    },
    financeiro: {
      receitaAnual: 1_100_000,
      caixaDisponivel: 90_000,
      endividamento: 60_000,
      serieMensal: buildSerieMensal(85_000, 14_000, 0.025),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "participacao",
      metaCaptacao: 350_000,
      valorPorToken: 50,
      quantidadeTokens: 7_000,
      prazoMeses: 18,
    },
    precoSimulado: 50,
  },
  {
    slug: "agro-cerrado-norte",
    nome: "Token Agro Cerrado Norte",
    categoria: "agro",
    empresa: {
      razaoSocial: "Cerrado Norte Agropecuária Ltda.",
      nomeFantasia: "Cerrado Norte",
      cnpj: "34.567.890/0001-12",
      setor: "Agronegócio — grãos",
      localizacao: "Rio Verde, GO",
      resumo: "Operação de soja e milho no Centro-Oeste, buscando capital de giro para custeio da safra.",
    },
    financeiro: {
      receitaAnual: 6_200_000,
      caixaDisponivel: 410_000,
      endividamento: 1_500_000,
      serieMensal: buildSerieMensal(480_000, 60_000, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "recebivel",
      metaCaptacao: 800_000,
      valorPorToken: 200,
      quantidadeTokens: 4_000,
      prazoMeses: 12,
    },
    precoSimulado: 200,
  },
  {
    slug: "agro-cafe-mantiqueira",
    nome: "Token Agro Café Mantiqueira",
    categoria: "agro",
    empresa: {
      razaoSocial: "Fazenda Mantiqueira Café Especial Ltda.",
      nomeFantasia: "Fazenda Mantiqueira",
      cnpj: "45.678.901/0001-23",
      setor: "Agronegócio — café especial",
      localizacao: "Poços de Caldas, MG",
      resumo: "Produtora de café especial buscando recursos para renovar o cafezal e obter certificação orgânica.",
    },
    financeiro: {
      receitaAnual: 950_000,
      caixaDisponivel: 70_000,
      endividamento: 140_000,
      serieMensal: buildSerieMensal(70_000, 11_000, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "participacao",
      metaCaptacao: 250_000,
      valorPorToken: 80,
      quantidadeTokens: 3_125,
      prazoMeses: 30,
    },
    precoSimulado: 80,
  },
  {
    slug: "imo-residencial-aurora",
    nome: "Token Imobiliário Residencial Aurora",
    categoria: "imobiliario",
    empresa: {
      razaoSocial: "Aurora Empreendimentos Imobiliários SPE Ltda.",
      nomeFantasia: "Residencial Aurora",
      cnpj: "56.789.012/0001-34",
      setor: "Incorporação residencial",
      localizacao: "Curitiba, PR",
      resumo: "Sociedade de propósito específico (SPE) de um empreendimento residencial de 40 unidades, com obras em andamento.",
    },
    financeiro: {
      receitaAnual: 3_800_000,
      caixaDisponivel: 260_000,
      endividamento: 2_100_000,
      serieMensal: buildSerieMensal(300_000, 40_000, 0.04),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "recebivel",
      metaCaptacao: 1_200_000,
      valorPorToken: 500,
      quantidadeTokens: 2_400,
      prazoMeses: 20,
    },
    precoSimulado: 500,
  },
  {
    slug: "imo-galpao-logistico-sul",
    nome: "Token Imobiliário Galpão Logístico Sul",
    categoria: "imobiliario",
    empresa: {
      razaoSocial: "Galpão Logístico Sul Locações Ltda.",
      nomeFantasia: "Galpão Logístico Sul",
      cnpj: "67.890.123/0001-45",
      setor: "Imóveis logísticos e industriais",
      localizacao: "Porto Alegre, RS",
      resumo: "Galpão logístico locado a empresas de e-commerce, buscando capital para expansão do pátio de manobras.",
    },
    financeiro: {
      receitaAnual: 1_600_000,
      caixaDisponivel: 120_000,
      endividamento: 900_000,
      serieMensal: buildSerieMensal(130_000, 18_000, 0.015),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "recebivel",
      metaCaptacao: 600_000,
      valorPorToken: 300,
      quantidadeTokens: 2_000,
      prazoMeses: 24,
    },
    precoSimulado: 300,
  },
  {
    slug: "auto-frota-sul",
    nome: "Token Auto Frota Sul",
    categoria: "auto",
    empresa: {
      razaoSocial: "Frota Sul Locação de Veículos Ltda.",
      nomeFantasia: "Frota Sul",
      cnpj: "78.901.234/0001-56",
      setor: "Locação de veículos",
      localizacao: "Florianópolis, SC",
      resumo: "Frota de 60 veículos para locação corporativa, buscando capital para renovar parte da frota.",
    },
    financeiro: {
      receitaAnual: 2_900_000,
      caixaDisponivel: 150_000,
      endividamento: 1_100_000,
      serieMensal: buildSerieMensal(230_000, 24_000, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "participacao",
      metaCaptacao: 900_000,
      valorPorToken: 450,
      quantidadeTokens: 2_000,
      prazoMeses: 36,
    },
    precoSimulado: 450,
  },
  {
    slug: "auto-oficina-rapida-eletrica",
    nome: "Token Auto Oficina Rápida Elétrica",
    categoria: "auto",
    empresa: {
      razaoSocial: "Oficina Rápida Elétrica Ltda.",
      nomeFantasia: "Oficina Rápida Elétrica",
      cnpj: "89.012.345/0001-67",
      setor: "Serviços automotivos — veículos elétricos",
      localizacao: "Campinas, SP",
      resumo: "Rede de oficinas especializadas em manutenção de veículos elétricos e híbridos, em expansão.",
    },
    financeiro: {
      receitaAnual: 780_000,
      caixaDisponivel: 55_000,
      endividamento: 90_000,
      serieMensal: buildSerieMensal(58_000, 9_000, 0.035),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "participacao",
      metaCaptacao: 400_000,
      valorPorToken: 100,
      quantidadeTokens: 4_000,
      prazoMeses: 24,
    },
    precoSimulado: 100,
  },
  {
    slug: "divida-confeccoes-ipe",
    nome: "Título de Dívida Confecções Ipê",
    categoria: "divida",
    empresa: {
      razaoSocial: "Confecções Ipê Têxtil Ltda.",
      nomeFantasia: "Confecções Ipê",
      cnpj: "90.123.456/0001-78",
      setor: "Têxtil e confecção",
      localizacao: "Fortaleza, CE",
      resumo: "Antecipação de recebíveis de vendas para grandes redes de varejo, com prazo médio de 90 dias.",
    },
    financeiro: {
      receitaAnual: 4_200_000,
      caixaDisponivel: 95_000,
      endividamento: 700_000,
      serieMensal: buildSerieMensal(340_000, 16_000, 0.01),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "divida",
      metaCaptacao: 300_000,
      valorPorToken: 1_000,
      quantidadeTokens: 300,
      prazoMeses: 6,
    },
    precoSimulado: 1_000,
  },
  {
    slug: "divida-distribuidora-nordeste",
    nome: "Título de Dívida Distribuidora Nordeste",
    categoria: "divida",
    empresa: {
      razaoSocial: "Distribuidora Nordeste de Alimentos Ltda.",
      nomeFantasia: "Distribuidora Nordeste",
      cnpj: "01.234.567/0001-89",
      setor: "Distribuição e atacado",
      localizacao: "Recife, PE",
      resumo: "Linha de capital de giro para compra antecipada de estoque sazonal.",
    },
    financeiro: {
      receitaAnual: 5_600_000,
      caixaDisponivel: 130_000,
      endividamento: 950_000,
      serieMensal: buildSerieMensal(450_000, 21_000, 0.012),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: {
      tipoToken: "divida",
      metaCaptacao: 450_000,
      valorPorToken: 1_000,
      quantidadeTokens: 450,
      prazoMeses: 9,
    },
    precoSimulado: 1_000,
  },
];

export function getOfertaBySlug(slug: string): Oferta | undefined {
  return OFERTAS.find((oferta) => oferta.slug === slug);
}

export function getOfertasByCategoria(categoria: TokenCategory): Oferta[] {
  return OFERTAS.filter((oferta) => oferta.categoria === categoria);
}

// Vitrine do hub "Ativos e tokens": uma oferta de cada uma de três
// categorias diferentes, para mostrar variedade sem repetir categoria.
export const VITRINE_HUB_SLUGS = ["pme-padaria-bela-vista", "agro-cerrado-norte", "imo-residencial-aurora"];

// Lista genérica de material de divulgação — placeholders desabilitados,
// iguais para todas as ofertas (nenhum documento real existe nesta fase).
export const DOCUMENTOS_PADRAO = [
  "Memorando de informações",
  "Balanço financeiro",
  "Demonstrações financeiras",
  "Release de resultados",
  "Apresentação dos resultados",
  "Contrato social / estatuto",
  "Termo de adesão à oferta",
];
