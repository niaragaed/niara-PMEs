// Configuração das "âncoras" do astronauta viajante: cada uma referencia o
// id de uma seção da home e a pose (posição/escala/opacidade) que o
// astronauta assume quando essa seção está em foco. AstronautGuide cria uma
// transição (scroll-scrubbed) entre cada par de âncoras consecutivas.
//
// Atualizar esta lista conforme seções são adicionadas/reordenadas nas
// próximas partes — não é preciso mexer na lógica de AstronautGuide.
export type AstronautAnchor = {
  /** id da seção que serve de referência de scroll para esta pose */
  id: string;
  left: string;
  top: string;
  xPercent: number;
  yPercent: number;
  scale: number;
  opacity: number;
};

export const ASTRONAUT_ANCHORS: AstronautAnchor[] = [
  // Hero: protagonista, centralizado, encostado na base da tela.
  { id: "hero", left: "50%", top: "88%", xPercent: -50, yPercent: -50, scale: 1, opacity: 1 },
  // Benefícios: canto direito.
  { id: "benefits", left: "97%", top: "38%", xPercent: -100, yPercent: -50, scale: 0.5, opacity: 1 },
  // "Como funciona" é uma sequência pinned (Parte 2) — sem âncora própria de
  // propósito: a transição para a próxima âncora atravessa esse trecho.
  // Quando posso usar a tokenização: canto esquerdo.
  { id: "when-to-use", left: "3%", top: "38%", xPercent: 0, yPercent: -50, scale: 0.5, opacity: 1 },
  // Conheça os tokens: canto direito.
  { id: "tokens", left: "97%", top: "38%", xPercent: -100, yPercent: -50, scale: 0.5, opacity: 1 },
  // Para empresas x investidores: canto esquerdo.
  { id: "audiences", left: "3%", top: "38%", xPercent: 0, yPercent: -50, scale: 0.5, opacity: 1 },
  // Faixa CTA final (fundo verde sólido) — sem âncora própria: a transição
  // para os créditos atravessa esse trecho, então o astronauta não chega a
  // "parar" sobre o fundo escuro.
  // Créditos: desaparece por completo, aqui sim.
  { id: "credits", left: "50%", top: "50%", xPercent: -50, yPercent: -50, scale: 0.35, opacity: 0 },
];

// Modo simplificado para telas pequenas: só aparece no hero, pequeno, num
// canto que não disputa espaço com o bloco de texto centralizado — e some
// assim que o usuário rola para além dele.
export const ASTRONAUT_MOBILE_HERO_ANCHOR: AstronautAnchor = {
  id: "hero",
  left: "88%",
  top: "10%",
  xPercent: -50,
  yPercent: -50,
  scale: 0.4,
  opacity: 1,
};

// Breakpoint a partir do qual há espaço lateral (fora do container
// max-w-6xl da home) suficiente para o astronauta viajar sem cobrir cards.
export const ASTRONAUT_DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";
export const ASTRONAUT_MOBILE_MEDIA_QUERY = "(max-width: 1279.98px)";
