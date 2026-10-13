// Dados fictícios de demonstração para a tela /ativos. Nenhum valor aqui
// representa posições, preços ou desempenho reais — ver aviso de
// demonstração renderizado na própria página.

export type TokenCategory = "pmes" | "agro" | "imobiliario" | "auto" | "divida";

export type Region = "sudeste" | "sul" | "nordeste" | "centro-oeste";

export type Position = {
  symbol: string;
  name: string;
  category: TokenCategory;
  region: Region;
  shares: number;
  averagePrice: number;
  currentValue: number;
};

export type MonthlyEvolution = {
  month: string;
  investido: number;
  ganho: number;
};

export type CatalogAsset = {
  id: string;
  name: string;
  category: TokenCategory;
  description: string;
};

export const MOCK_POSITIONS: Position[] = [
  {
    symbol: "PME01",
    name: "Token PMEs",
    category: "pmes",
    region: "sudeste",
    shares: 120,
    averagePrice: 125,
    currentValue: 16850,
  },
  {
    symbol: "AGR01",
    name: "Token Agro",
    category: "agro",
    region: "centro-oeste",
    shares: 200,
    averagePrice: 45,
    currentValue: 9540,
  },
  {
    symbol: "IMO01",
    name: "Token Imobiliário",
    category: "imobiliario",
    region: "sul",
    shares: 80,
    averagePrice: 210,
    currentValue: 17640,
  },
  {
    symbol: "AUT01",
    name: "Token Auto",
    category: "auto",
    region: "sudeste",
    shares: 150,
    averagePrice: 32,
    currentValue: 4416,
  },
  {
    symbol: "DIV01",
    name: "Títulos de dívida",
    category: "divida",
    region: "nordeste",
    shares: 40,
    averagePrice: 86,
    currentValue: 3556,
  },
];

export const MOCK_EVOLUTION: MonthlyEvolution[] = [
  { month: "Jan", investido: 8000, ganho: 120 },
  { month: "Fev", investido: 14000, ganho: 280 },
  { month: "Mar", investido: 19000, ganho: 410 },
  { month: "Abr", investido: 23500, ganho: 300 },
  { month: "Mai", investido: 28000, ganho: 560 },
  { month: "Jun", investido: 32000, ganho: 890 },
  { month: "Jul", investido: 35500, ganho: 750 },
  { month: "Ago", investido: 39000, ganho: 1200 },
  { month: "Set", investido: 42500, ganho: 1450 },
  { month: "Out", investido: 45500, ganho: 1980 },
  { month: "Nov", investido: 47800, ganho: 2400 },
  { month: "Dez", investido: 49040, ganho: 2962 },
];

export const MOCK_CATALOG: CatalogAsset[] = [
  {
    id: "cat-pme-padaria",
    name: "Token PME Padaria Bela Vista",
    category: "pmes",
    description: "Participação tokenizada de uma rede de padarias em expansão.",
  },
  {
    id: "cat-agro-cerrado",
    name: "Token Agro Cerrado Norte",
    category: "agro",
    description: "Token lastreado em uma operação de grãos no Centro-Oeste.",
  },
  {
    id: "cat-imo-aurora",
    name: "Token Imobiliário Residencial Aurora",
    category: "imobiliario",
    description: "Cotas tokenizadas de um empreendimento residencial.",
  },
  {
    id: "cat-auto-frota",
    name: "Token Auto Frota Sul",
    category: "auto",
    description: "Token vinculado a uma frota de veículos para locação.",
  },
  {
    id: "cat-divida-confeccoes",
    name: "Título de Dívida Confecções Ipê",
    category: "divida",
    description: "Antecipação de recebíveis de uma confecção têxtil.",
  },
  {
    id: "cat-pme-clinica",
    name: "Token PME Clínica Vitalis",
    category: "pmes",
    description: "Participação tokenizada de uma clínica odontológica.",
  },
];
