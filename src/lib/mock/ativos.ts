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
  invested: number;
  gain: number;
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
  { month: "Jan", invested: 8000, gain: 120 },
  { month: "Fev", invested: 14000, gain: 280 },
  { month: "Mar", invested: 19000, gain: 410 },
  { month: "Abr", invested: 23500, gain: 300 },
  { month: "Mai", invested: 28000, gain: 560 },
  { month: "Jun", invested: 32000, gain: 890 },
  { month: "Jul", invested: 35500, gain: 750 },
  { month: "Ago", invested: 39000, gain: 1200 },
  { month: "Set", invested: 42500, gain: 1450 },
  { month: "Out", invested: 45500, gain: 1980 },
  { month: "Nov", invested: 47800, gain: 2400 },
  { month: "Dez", invested: 49040, gain: 2962 },
];

export const MOCK_CATALOG: CatalogAsset[] = [
  {
    id: "cat-sme-bakery",
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
    id: "cat-realestate-aurora",
    name: "Token Imobiliário Residencial Aurora",
    category: "imobiliario",
    description: "Cotas tokenizadas de um empreendimento residencial.",
  },
  {
    id: "cat-auto-fleet",
    name: "Token Auto Frota Sul",
    category: "auto",
    description: "Token vinculado a uma frota de veículos para locação.",
  },
  {
    id: "cat-debt-apparel",
    name: "Título de Dívida Confecções Ipê",
    category: "divida",
    description: "Antecipação de recebíveis de uma confecção têxtil.",
  },
  {
    id: "cat-sme-clinic",
    name: "Token PME Clínica Vitalis",
    category: "pmes",
    description: "Participação tokenizada de uma clínica odontológica.",
  },
];
