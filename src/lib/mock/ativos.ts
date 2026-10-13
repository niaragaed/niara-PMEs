// Fictitious demo data for the /ativos screen. No value here represents real positions, prices or
// performance — see the demo notice rendered on the page itself. Display text is written in both
// languages next to the data (LocalizedText); category/region codes are shared with the database
// and the dictionaries.
import type { LocalizedText } from "@/lib/i18n/locale";

export type TokenCategory = "pmes" | "agro" | "imobiliario" | "auto" | "divida";

export type Region = "sudeste" | "sul" | "nordeste" | "centro-oeste";

export type Position = {
  symbol: string;
  name: LocalizedText;
  category: TokenCategory;
  region: Region;
  shares: number;
  averagePrice: number;
  currentValue: number;
};

export type MonthlyEvolution = {
  /** 0 = January … 11 = December; the chart turns it into a short month name. */
  month: number;
  invested: number;
  gain: number;
};

export type CatalogAsset = {
  id: string;
  name: LocalizedText;
  category: TokenCategory;
  description: LocalizedText;
};

export const MOCK_POSITIONS: Position[] = [
  {
    symbol: "PME01",
    name: { pt: "Token PMEs", en: "SME Token" },
    category: "pmes",
    region: "sudeste",
    shares: 120,
    averagePrice: 125,
    currentValue: 16850,
  },
  {
    symbol: "AGR01",
    name: { pt: "Token Agro", en: "Agro Token" },
    category: "agro",
    region: "centro-oeste",
    shares: 200,
    averagePrice: 45,
    currentValue: 9540,
  },
  {
    symbol: "IMO01",
    name: { pt: "Token Imobiliário", en: "Real Estate Token" },
    category: "imobiliario",
    region: "sul",
    shares: 80,
    averagePrice: 210,
    currentValue: 17640,
  },
  {
    symbol: "AUT01",
    name: { pt: "Token Auto", en: "Auto Token" },
    category: "auto",
    region: "sudeste",
    shares: 150,
    averagePrice: 32,
    currentValue: 4416,
  },
  {
    symbol: "DIV01",
    name: { pt: "Títulos de dívida", en: "Debt securities" },
    category: "divida",
    region: "nordeste",
    shares: 40,
    averagePrice: 86,
    currentValue: 3556,
  },
];

export const MOCK_EVOLUTION: MonthlyEvolution[] = [
  { month: 0, invested: 8000, gain: 120 },
  { month: 1, invested: 14000, gain: 280 },
  { month: 2, invested: 19000, gain: 410 },
  { month: 3, invested: 23500, gain: 300 },
  { month: 4, invested: 28000, gain: 560 },
  { month: 5, invested: 32000, gain: 890 },
  { month: 6, invested: 35500, gain: 750 },
  { month: 7, invested: 39000, gain: 1200 },
  { month: 8, invested: 42500, gain: 1450 },
  { month: 9, invested: 45500, gain: 1980 },
  { month: 10, invested: 47800, gain: 2400 },
  { month: 11, invested: 49040, gain: 2962 },
];

export const MOCK_CATALOG: CatalogAsset[] = [
  {
    id: "cat-sme-bakery",
    name: { pt: "Token PME Padaria Bela Vista", en: "SME Token Padaria Bela Vista" },
    category: "pmes",
    description: { pt: "Participação tokenizada de uma rede de padarias em expansão.", en: "Tokenized stake in an expanding bakery chain." },
  },
  {
    id: "cat-agro-cerrado",
    name: { pt: "Token Agro Cerrado Norte", en: "Agro Token Cerrado Norte" },
    category: "agro",
    description: { pt: "Token lastreado em uma operação de grãos no Centro-Oeste.", en: "Token backed by a grain operation in the Center-West." },
  },
  {
    id: "cat-realestate-aurora",
    name: { pt: "Token Imobiliário Residencial Aurora", en: "Real Estate Token Residencial Aurora" },
    category: "imobiliario",
    description: { pt: "Cotas tokenizadas de um empreendimento residencial.", en: "Tokenized shares of a residential development." },
  },
  {
    id: "cat-auto-fleet",
    name: { pt: "Token Auto Frota Sul", en: "Auto Token Frota Sul" },
    category: "auto",
    description: { pt: "Token vinculado a uma frota de veículos para locação.", en: "Token tied to a rental vehicle fleet." },
  },
  {
    id: "cat-debt-apparel",
    name: { pt: "Título de Dívida Confecções Ipê", en: "Debt Security Confecções Ipê" },
    category: "divida",
    description: { pt: "Antecipação de recebíveis de uma confecção têxtil.", en: "Receivables advance for a textile apparel maker." },
  },
  {
    id: "cat-sme-clinic",
    name: { pt: "Token PME Clínica Vitalis", en: "SME Token Clínica Vitalis" },
    category: "pmes",
    description: { pt: "Participação tokenizada de uma clínica odontológica.", en: "Tokenized stake in a dental clinic." },
  },
];
