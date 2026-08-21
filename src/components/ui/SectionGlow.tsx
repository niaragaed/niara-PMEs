// Luz de fundo pro sálvia cheio (bg-military) das telas internas — /negociar, /ativos,
// /perfil, /investir. Puramente decorativo (aria-hidden, sem pointer-events), pra quebrar a
// "parede de verde" com contraste de matiz de verdade: usa --color-salmon (o mesmo pêssego dos
// selos/CTAs), não uma variação do próprio verde — essa foi a 1ª tentativa (ver histórico) e não
// resolveu porque ficava sutil demais pra notar de longe. Nenhum blur filter — o esmaecimento
// vem do próprio radial-gradient (mais barato pro GPU e sem contorno visível sobrando).
//
// AJUSTES:
//   - Cor e intensidade (o que você mais provavelmente vai calibrar) ficam em variáveis CSS no
//     :root de globals.css (--section-glow-color, --section-glow-opacity-primary/-secondary) —
//     mude lá, sem precisar tocar neste arquivo.
//   - Posição/tamanho de cada glow ficam no array GLOWS abaixo (classes Tailwind).
//   - Pra desligar a animação (deixar os glows fixos), use <SectionGlow animate={false} />.
//
// Geometria pensada pra segurança de contraste: os dois glows nascem ANCORADOS fora do
// container (offsets negativos grandes) — o centro cheio do gradiente fica sempre fora da área
// visível, então o que aparece na tela já é a borda mais suave do gradiente, nunca o pico de
// opacidade. Título/subtítulo (text-on-military) ficam tipicamente no canto oposto de cada
// glow; cards por cima são opacos (bg-surface/bg-panel) e cobrem o glow por completo onde
// existem — não há texto solto na zona mais forte de nenhum dos dois.
//
// Não precisa de "use client": é só HTML/CSS estático (a animação é CSS puro via classe — ver
// globals.css), sem nenhum estado ou efeito em React.
//
// 🔴 REQUISITO DO CHAMADOR — o elemento que envolve <SectionGlow /> precisa da classe
// `isolate` (nunca só `relative`, nunca `relative z-0`). Sem isso, `-z-10` (ver abaixo) escapa
// pro stacking context do documento e o próprio fundo do chamador cobre o glow por completo —
// não importa a opacidade. `position: relative` sozinho NÃO cria um stacking context (precisa
// de `isolate`, ou de `position` + z-index numérico); `isolate` faz o mesmo sem exigir
// `position` no elemento.
//
// 🔴 EFEITO COLATERAL DE `isolate` NO CHAMADOR + `fixed` no glow — `isolate` também eleva o
// chamador (ex.: <main>) pro mesmo "andar" de prioridade de pintura que elementos posicionados,
// acima de IRMÃOS que não são stacking context (ex.: <Footer>, comum no layout raiz). Como o
// glow interno é `fixed` (cobre a viewport inteira, inclusive por cima de onde o rodapé aparece
// ao rolar até o fim), isso fazia o glow vazar visivelmente pro <Footer>, tingindo o fundo claro
// dele de salmão (visto em screenshot real). Corrigido dando `isolate` também ao <Footer>
// (src/components/nav/Footer.tsx) — os dois ficam no mesmo "andar", e como <Footer> vem DEPOIS
// de <main> no documento, ele passa a pintar por cima onde as caixas se sobrepõem, cobrindo o
// glow com o próprio fundo opaco. Se algum dia outro elemento entre <main> e <Footer> precisar
// ficar visualmente por cima do glow perto do fim da página, o mesmo raciocínio se aplica: dar
// `isolate` a ele também (nunca depender só da ordem do DOM sem stacking context equivalente).
//
// 🔴 HISTÓRICO DE TENTATIVAS DE POSICIONAMENTO (todas verificadas de verdade com Playwright —
// scroll real + getComputedStyle + screenshot em cada uma, não só raciocínio sobre CSS, porque
// mais de uma parecia correta no papel e não era):
//
// 1. `absolute inset-0` dentro do container: cobria a altura do DOCUMENTO inteiro, não da tela.
//    Em página curta não se notava, mas numa grade longa (ex.: as 10 PMEs) o glow ancorado no
//    fundo ficava a milhares de pixels abaixo do que dá pra ver — o meio da rolagem passava sem
//    nenhum glow por perto.
// 2. `fixed inset-0` (usado hoje): resolve o problema acima (preso à viewport, não ao
//    documento) — mas sozinho vazava pro <Footer>, ver "REQUISITO DO CHAMADOR" abaixo pro porquê
//    e a correção.
// 3. `sticky top-0` com altura fixa + `margin-bottom` negativo igual, tentando fazer o wrapper
//    "auto-confinar" à caixa do <main> sem vazar pro Footer: TESTADO E DESCARTADO — medindo com
//    Playwright em toda a faixa de rolagem (não só início/meio/fim), o wrapper nunca desgrudava
//    do topo, mesmo perto do fim do documento — o cancelamento de altura via margem negativa não
//    faz o browser recalcular o limite de descolamento do jeito que a lógica sugere (testado em
//    layout flex-col; pode ser peculiaridade da combinação, não confiar nela de novo sem medir).
//    Resultado prático: comportava-se como `fixed`, só que sem a vantagem de ser mais simples.
type GlowSpec = {
  position: string;
  opacityVar: "--section-glow-opacity-primary" | "--section-glow-opacity-secondary";
  animationClass: "animate-section-glow-a" | "animate-section-glow-b";
};

const GLOWS: GlowSpec[] = [
  {
    position: "-top-40 -right-40 h-[48rem] w-[48rem]",
    opacityVar: "--section-glow-opacity-primary",
    animationClass: "animate-section-glow-a",
  },
  {
    position: "-bottom-56 -left-40 h-[36rem] w-[36rem]",
    opacityVar: "--section-glow-opacity-secondary",
    animationClass: "animate-section-glow-b",
  },
];

export function SectionGlow({ animate = true }: { animate?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {GLOWS.map((glow, index) => (
        <div
          key={index}
          className={`absolute rounded-full ${glow.position} ${animate ? glow.animationClass : ""}`}
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, var(--section-glow-color) var(${glow.opacityVar}), transparent) 0%, transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
