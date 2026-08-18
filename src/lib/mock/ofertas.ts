// Dados fictícios de demonstração para as telas /negociar (hub, categorias,
// detalhe da oferta e boleta). Nenhuma empresa, CNPJ, valor financeiro ou
// termo de oferta aqui é real — tudo é ilustrativo, escolhido só para ser
// internamente coerente (ex.: metaCaptacao ≈ valorPorToken × quantidade).
// Nenhuma promessa de retorno é feita: não há campo de rendimento/projeção.

import type { TokenCategory } from "@/lib/mock/ativos";
import { ONCHAIN_PMES_SLUGS_EM_ORDEM } from "@/lib/mock/ofertasOnChain";
import {
  ONCHAIN_PMES_COTAS_AUTORIZADAS,
  ONCHAIN_PMES_META_MAXIMA_MBRL,
  ONCHAIN_PMES_PRAZO_DIAS,
  ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
} from "@/lib/web3/demoConstants";

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

// Termos das 10 ofertas PME que têm uma oferta real e ativa em Sepolia por trás (ver
// src/lib/mock/ofertasOnChain.ts) — os números aqui são espelhados de
// src/lib/web3/demoConstants.ts, os mesmos valores fixos das 10 ofertas reais, para que a
// pré-visualização estática nunca discorde da leitura ao vivo do contrato (ver
// RealOnChainInvestPanel.tsx). Campos que mudam com o tempo (estado, total arrecadado, prazo
// exato) nunca vêm daqui — sempre de useOfertaOnChainTermos(), direto da chain.
function buildTermosOnChainFixos(): Oferta["termos"] {
  return {
    tipoToken: "participacao",
    metaCaptacao: ONCHAIN_PMES_META_MAXIMA_MBRL,
    valorPorToken: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
    quantidadeTokens: ONCHAIN_PMES_COTAS_AUTORIZADAS,
    prazoMeses: Math.round(ONCHAIN_PMES_PRAZO_DIAS / 30),
  };
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
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
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
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-barbearia-corte-estilo",
    nome: "Token PME Barbearia Corte & Estilo",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Corte & Estilo Barbearia Ltda.",
      nomeFantasia: "Barbearia Corte & Estilo",
      cnpj: "13.456.789/0001-02",
      setor: "Serviços de beleza e estética",
      localizacao: "Salvador, BA",
      resumo:
        "Barbearia com 3 cadeiras e agenda cheia no bairro do Rio Vermelho, buscando capital para abrir uma segunda unidade e comprar equipamento novo.",
    },
    financeiro: {
      receitaAnual: 620_000,
      caixaDisponivel: 45_000,
      endividamento: 30_000,
      serieMensal: buildSerieMensal(48_000, 7_000, 0.025),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-petshop-amigo-fiel",
    nome: "Token PME Pet Shop Amigo Fiel",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Amigo Fiel Comércio Pet Ltda.",
      nomeFantasia: "Pet Shop Amigo Fiel",
      cnpj: "14.567.890/0001-13",
      setor: "Varejo pet e serviços veterinários",
      localizacao: "Curitiba, PR",
      resumo:
        "Pet shop com banho e tosa e consultório veterinário associado, buscando capital de giro para ampliar o estoque de ração e medicamentos.",
    },
    financeiro: {
      receitaAnual: 890_000,
      caixaDisponivel: 60_000,
      endividamento: 75_000,
      serieMensal: buildSerieMensal(68_000, 9_500, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-academia-vigor-fitness",
    nome: "Token PME Academia Vigor Fitness",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Vigor Fitness Academia Ltda.",
      nomeFantasia: "Academia Vigor Fitness",
      cnpj: "15.678.901/0001-24",
      setor: "Saúde e bem-estar — academia",
      localizacao: "Goiânia, GO",
      resumo:
        "Academia de bairro com 400 alunos ativos, buscando recursos para renovar equipamentos de musculação e ampliar o estúdio de aulas coletivas.",
    },
    financeiro: {
      receitaAnual: 1_350_000,
      caixaDisponivel: 95_000,
      endividamento: 180_000,
      serieMensal: buildSerieMensal(105_000, 15_000, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-marcenaria-raizes",
    nome: "Token PME Marcenaria Raízes",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Raízes Marcenaria e Móveis Planejados Ltda.",
      nomeFantasia: "Marcenaria Raízes",
      cnpj: "16.789.012/0001-35",
      setor: "Móveis planejados sob medida",
      localizacao: "Caxias do Sul, RS",
      resumo:
        "Marcenaria especializada em móveis planejados sob medida, buscando capital para comprar uma nova máquina CNC e reduzir o prazo de entrega.",
    },
    financeiro: {
      receitaAnual: 1_050_000,
      caixaDisponivel: 70_000,
      endividamento: 210_000,
      serieMensal: buildSerieMensal(82_000, 11_000, 0.018),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-cafeteria-grao-arte",
    nome: "Token PME Cafeteria Grão & Arte",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Grão & Arte Cafeteria Ltda.",
      nomeFantasia: "Cafeteria Grão & Arte",
      cnpj: "17.890.123/0001-46",
      setor: "Alimentação — cafeteria especial",
      localizacao: "Belo Horizonte, MG",
      resumo: "Cafeteria de especialidade com torra própria, buscando capital para abrir um quiosque em um novo shopping da cidade.",
    },
    financeiro: {
      receitaAnual: 780_000,
      caixaDisponivel: 52_000,
      endividamento: 40_000,
      serieMensal: buildSerieMensal(60_000, 8_500, 0.03),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-lavanderia-expressa-clean",
    nome: "Token PME Lavanderia Expressa Clean",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Clean Expressa Lavanderia Ltda.",
      nomeFantasia: "Lavanderia Expressa Clean",
      cnpj: "18.901.234/0001-57",
      setor: "Serviços — lavanderia self-service e sob encomenda",
      localizacao: "Recife, PE",
      resumo:
        "Rede de 2 lavanderias self-service com serviço sob encomenda para prédios residenciais, buscando capital para instalar máquinas industriais numa terceira unidade.",
    },
    financeiro: {
      receitaAnual: 540_000,
      caixaDisponivel: 38_000,
      endividamento: 25_000,
      serieMensal: buildSerieMensal(42_000, 6_000, 0.02),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-escola-idiomas-global-fluente",
    nome: "Token PME Escola de Idiomas Global Fluente",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Global Fluente Idiomas Ltda.",
      nomeFantasia: "Escola de Idiomas Global Fluente",
      cnpj: "19.012.345/0001-68",
      setor: "Educação — idiomas",
      localizacao: "Florianópolis, SC",
      resumo:
        "Escola de inglês e espanhol com turmas presenciais e online, buscando capital para lançar uma plataforma própria de aulas ao vivo.",
    },
    financeiro: {
      receitaAnual: 960_000,
      caixaDisponivel: 68_000,
      endividamento: 55_000,
      serieMensal: buildSerieMensal(74_000, 10_500, 0.025),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
  },
  {
    slug: "pme-estetica-bella-pele",
    nome: "Token PME Estúdio de Estética Bella Pele",
    categoria: "pmes",
    empresa: {
      razaoSocial: "Bella Pele Estética Ltda.",
      nomeFantasia: "Estúdio de Estética Bella Pele",
      cnpj: "20.123.456/0001-79",
      setor: "Serviços de beleza e estética",
      localizacao: "Fortaleza, CE",
      resumo:
        "Estúdio de estética facial e corporal com equipe de 6 profissionais, buscando capital para adquirir um novo equipamento de radiofrequência.",
    },
    financeiro: {
      receitaAnual: 700_000,
      caixaDisponivel: 48_000,
      endividamento: 35_000,
      serieMensal: buildSerieMensal(54_000, 7_500, 0.022),
    },
    indicadores: INDICADORES_DEMONSTRACAO,
    termos: buildTermosOnChainFixos(),
    precoSimulado: ONCHAIN_PMES_PRECO_POR_COTA_MBRL,
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

if (process.env.NODE_ENV !== "production") {
  for (const slug of ONCHAIN_PMES_SLUGS_EM_ORDEM) {
    const oferta = OFERTAS.find((item) => item.slug === slug);
    if (!oferta) {
      throw new Error(`ONCHAIN_PMES_SLUGS_EM_ORDEM referencia o slug "${slug}", que não existe em OFERTAS.`);
    }
    if (oferta.categoria !== "pmes") {
      throw new Error(`Oferta "${slug}" está ligada a uma oferta on-chain real, mas categoria não é "pmes".`);
    }
  }
}

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
