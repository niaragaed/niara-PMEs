# CLAUDE.md — niara-PMEs

Instruções permanentes para o Claude Code neste repositório.
Leia este arquivo antes de escrever qualquer código.

---

## O projeto

**Niara PMEs** — plataforma que ajuda pequenas e médias empresas a estruturar
captação de investimento e dividir capital via tokenização (o "produto de
receita" do grupo Niara; a exchange global — repositório irmão `niara-site`
— é a "visão" de longo prazo).

**Estágio atual: site institucional + protótipo de interface. Não há
backend, autenticação, carteira nem blockchain conectada.** Tudo é
demonstração.

---

## ⚠️ Next.js 16 (preservar)

Este projeto usa **Next.js 16**, que tem breaking changes em relação a
versões anteriores.

- `params`, `searchParams`, `cookies` e `headers` são **assíncronos** —
  sempre com `await`.
- Defaults do `next/image` mudaram.
- React 19 em dev roda efeitos duas vezes (StrictMode) — todo `useEffect`
  com canvas, WebGL ou listener precisa de cleanup correto.

---

## 🔴 Regra principal: nada simulado pode parecer real

- Não ofereça valores mobiliários reais, não prometa retorno/rentabilidade,
  não invente empresas, ofertas, parcerias, licenças, auditorias, logos de
  instituições ou número de usuários.
- Onde houver dado fictício, rotule como demonstração.
- **Nunca** prometer isenção fiscal (nada de "sem IR/IOF"). Ganho de capital
  é tributável.
- Botões sem backend ficam **desabilitados e rotulados** (ex.: "Em breve"),
  nunca fingem sucesso.
- Registro on-chain (quando existir) não substitui cartório nem os livros
  societários da Lei 6.404 — nunca sugerir o contrário.
- Nunca rotular nada como "ao vivo" ou "tempo real".

## 🔴 Dados sensíveis (LGPD)

- **Nunca** persistir CPF, documento, data de nascimento ou endereço em
  `localStorage`. Esses dados vivem só em estado React, quando/se houver
  formulário.
- Nunca commitar `.env`, chaves de API ou segredos. O repositório é
  **público**.

---

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind **v4**
- Tailwind v4 é **CSS-first**: não há `tailwind.config.js`; tokens ficam em
  `@theme` dentro de `src/app/globals.css`
- `next/font/google` (não CDN) para as fontes
- Animação de scroll: `gsap` + `ScrollTrigger` (seções pinned, parallax leve)
  e `lenis` (smooth scroll, integrado ao ScrollTrigger)
- Micro-reveals (fade/slide/stagger simples): `framer-motion`
- Ícones: `lucide-react`
- Estado: React (`useState`, Context). Sem libs de estado externas.

Removido: `three` / `@react-three/fiber` / `@react-three/drei` (não eram
mais usados por nada no projeto) e, depois, o próprio astronauta 2D — ver
"Astronauta (removido)" abaixo.

---

## Design system

Use **somente** tokens do `@theme` (`src/app/globals.css`). Nunca cores
hardcoded nos componentes.

Tema **claro** (diferente do `niara-site`, que é escuro). Paleta oficial:
**paleta E (sálvia + pêssego)**.

**Base / neutros:** `bg` #FAF8F5 · `surface` #FFFFFF · `surface-alt` #F1EEE6
(tint neutro de chrome — dropdowns, ícones, footer; **não** usar para
alternância de fundo de seção) · `border` #E7E2D9 · `ink` #23271F (texto
principal) · `ink-muted` #5C6152 (texto secundário)

**Verde-sálvia (primária):** `military` #3E4835 · `military-600` #4E5A42
(hover) · `military-100` #E6EBDD — **fundo de seção "sálvia"**

**Pêssego (acento / CTA):** `salmon` #F0A487 · `salmon-600` #E08E6F (hover)
· `salmon-100` #FBE9DF — **fundo de seção "pêssego"**

**Acentos de seção:** `ink-peach` #8A5A47 (subtítulo terroso sobre fundo
pêssego — nunca `ink-muted`/cinza ali) · `chip-sage` #DCE3CF (selo/label
atrás do título de card)

Os nomes dos tokens (`military`, `salmon` etc.) foram mantidos por
compatibilidade de código mesmo após a mudança de paleta militar→sálvia —
só os valores hex e a semântica visual mudaram.

### 🔴 `h1`–`h6` e `@layer base`

A cor/fonte padrão dos headings é definida em `globals.css` **dentro de
`@layer base`** — não mover para fora dela. Regras CSS fora de qualquer
`@layer` vencem incondicionalmente qualquer coisa dentro de uma layer
(inclusive as utilities do Tailwind, que vivem em `@layer utilities`),
não importa a especificidade. Sem `@layer base` aqui, uma classe como
`text-bg` num `<h2>` (ex.: título sobre a faixa CTA de fundo verde
sólido) simplesmente não tem efeito nenhum — foi um bug real encontrado
e corrigido na Parte 3. Qualquer outro CSS solto adicionado a
`globals.css` que deva conviver com as utilities do Tailwind precisa do
mesmo tratamento.

**Tipografia:** Space Grotesk (`--font-display`, títulos) · Inter
(`--font-sans`, corpo)

**Raio:** sm 8px · md 12px · lg 20px · full (generoso, estética arejada)

**Sombras:** `shadow-soft` / `shadow-soft-lg` — suaves, para cards e
elementos elevados sobre fundo claro.

Padrão de alternância de fundo nas seções da home: sálvia
(`bg-military-100`) e pêssego (`bg-salmon-100`) se alternam entre seções de
conteúdo. Cards continuam brancos (`bg-surface`) sobre qualquer um dos
dois, com o chip (`bg-chip-sage`) atrás do título/ícone do card.

Referência visual viva: `/styleguide`.

Estética: clara, limpa, moderna, arejada. Adaptamos **estrutura** de
referências externas (ex.: MetaMask home), nunca a estética escura nem o
texto delas.

---

## Idioma

O idioma padrão (e único, por ora) é **português do Brasil** —
`<html lang="pt-BR">` no layout raiz. Todo texto de interface fica
centralizado em `src/lib/i18n/pt-br.ts` (dicionário tipado por área:
`common`, `meta`, `nav`, `hero`, `sections`, `footer` etc., crescendo
conforme as partes seguintes). Componentes importam `{ ptBr }` desse
arquivo — não hardcodar strings de interface direto no JSX.

Comentários de código ficam em português (convenção do projeto).

---

## Astronauta (removido)

O astronauta (guia de scroll 2D que seguia o cursor e viajava pelas
âncoras de cada seção) foi **removido por completo** — não ficou bom
visualmente. Saíram: `src/components/astronaut/` (`AstronautGuide.tsx` +
`anchors.ts`), o `<AstronautGuide />` em `src/app/page.tsx`,
`public/astronaut.png` e o gancho de fade-out na seção Créditos.

No lugar dele, o hero foi rebalanceado para ficar centrado no texto
(headline + subtítulo + CTAs), com um elemento decorativo sutil atrás do
conteúdo — o motivo do planeta anelado do `<Logo />` (círculo + elipse
inclinada) desenhado em SVG dentro de `HeroParallaxLayers.tsx`, com leve
parallax por scroll (GSAP `ScrollTrigger`, respeitando
`prefers-reduced-motion`) — junto dos glows suaves (`blur` + cores da
paleta) que já existiam ali. Não reintroduzir um elemento central 3D/2D
persistente sem alinhar antes com o usuário.

---

## Scroll suave (Lenis) + GSAP ScrollTrigger

`src/components/scroll/LenisProvider.tsx`, montado no layout raiz (envolve
`Header` + conteúdo + `Footer`, global ao site).

- Lenis roda em modo `root` (sem wrapper/content — hookeia o scroll nativo
  do `window`), com `autoRaf: false`: quem dirige o tick é o
  `gsap.ticker`, e `lenis.on('scroll', ScrollTrigger.update)` mantém o
  ScrollTrigger sincronizado. Padrão recomendado pela própria GSAP para
  integrar com Lenis.
- Com `prefers-reduced-motion`, o Lenis **nem é montado** — o componente
  renderiza `children` direto, sem o wrapper `<ReactLenis>`. Como o
  `ReactLenis` em modo `root` não insere nenhum elemento DOM (só um
  `Context.Provider`), os dois caminhos produzem exatamente o mesmo
  markup — sem risco de mismatch de hidratação por causa disso.
- Teclado (Page Up/Down, setas, Espaço) e âncoras (`#hash`) continuam
  funcionando com o Lenis ativo — testado via Playwright.

### 🔴 Pegadinha do pin dentro de `<main>` flex (`pinSpacing`)

Qualquer `ScrollTrigger.create({ pin: true, ... })` numa seção cujo pai
seja `display: flex` (o `<main className="flex flex-1 flex-col">` da
home é) **precisa** de `pinSpacing: true` explícito. Por padrão, o GSAP
detecta pai `display:flex` e desativa o `pinSpacing` automaticamente
(assumindo que o flex já cuida do espaçamento) — sem isso, o
pin-spacer não reserva o espaço extra de scroll e a seção "solta" cedo
demais, revelando o conteúdo de baixo no meio da sequência. Ver
`HowItWorksSection.tsx` para o padrão correto. Isso vale para qualquer
seção pinned futura dentro do `<main>` da home.

---

## Organização

```
src/
  app/                 rotas (App Router)
  components/
    hero/              hero (headline, CTAs), HeroParallaxLayers (glow +
                       motivo do planeta anelado, decorativos)
    nav/               header, dropdowns, menu mobile
    scroll/            LenisProvider (smooth scroll + sync com ScrollTrigger)
    sections/          narrativa por scroll (home), inclui pin de "Como funciona"
    ui/                compartilhados (Logo, botões etc.)
  lib/
    i18n/              dicionário de textos (pt-br.ts)
    nav-items.ts        itens de navegação compartilhados (Header/Footer)
public/
  niara-pme-logo.svg   logo (placeholder SVG até a arte final em PNG)
```

---

## Convenções

- **Client components:** tudo que usa canvas, WebGL, `framer-motion` com
  hooks de scroll, ou listener de mouse/teclado precisa de `"use client"` e
  cleanup no `useEffect`.
- **Acessibilidade:** dropdowns com `aria-haspopup`, `aria-expanded`, roles
  adequados, foco visível, fecham com Esc e clique fora; imagens
  decorativas com `aria-hidden`.
- **Responsivo** sempre: testar desktop, tablet e mobile (menu hambúrguer +
  acordeões).
- **Logo:** componente `<Logo />` (`next/image`, caminho na constante
  `LOGO_SRC` em `src/components/ui/Logo.tsx`). Placeholder atual é um SVG
  (`public/niara-pme-logo.svg`); a arte final será um PNG preto sobre fundo
  transparente — quando chegar, basta trocar o valor de `LOGO_SRC`.

---

## Fluxo de trabalho

1. Antes de codar, ler os arquivos envolvidos — não presumir.
2. Rodar `tsc --noEmit` e `npm run lint` ao final de cada parte; corrigir o
   que aparecer.
3. Rodar `npm run dev`/`build` para confirmar que compila e que as rotas
   respondem sem erro de SSR/WebGL.
4. **Commit local ao final de cada parte**, mensagem em português no padrão
   `feat:` / `fix:` / `refactor:` / `chore:`.
5. Nunca `--force`, nunca reescrever histórico, nunca push sem ser pedido.
6. Se algo quebrar ou ficar ambíguo: **parar e explicar**, não improvisar.

---

## Estado atual

Homepage (`src/app/page.tsx`), nesta ordem: Hero (texto centrado + motivo
decorativo do planeta anelado/glow, sem astronauta — ver "Astronauta
(removido)") → Benefícios da tokenização (pêssego) → Como funciona
(sequência pinned) → Quando posso usar a Tokenização? (sálvia) → Conheça
os Tokens (pêssego, cards linkam para as rotas-stub de cada token) → Para
empresas × investidores (sálvia) → Aviso de demonstração/CVM → Faixa CTA
final (verde sólido) → Créditos (placeholder sóbrio — "Equipe Niara" +
áreas genéricas, sem nomes reais) → Footer.

Scroll suave via Lenis sincronizado ao GSAP ScrollTrigger. Header +
navegação, `/styleguide`. Todas as rotas do nav têm stub sem 404. Testado
com `tsc`, `eslint`, `build` e verificação visual via Playwright (desktop,
mobile, teclado, reduced-motion) a cada parte.

As 5 partes do redesign (paleta E, astronauta 2D, Lenis + pin, seções de
conteúdo aprovado, créditos) estão completas. O astronauta foi removido
depois (ver seção própria) e o hero rebalanceado.

## Pendências conhecidas

- Logo final (PNG preto sobre fundo transparente) — substituir o valor de
  `LOGO_SRC` em `src/components/ui/Logo.tsx` (hoje aponta para o
  placeholder `public/niara-pme-logo.svg`). Há um arquivo
  `public/logo em fundo claro.png` no repositório que parece ser a arte
  real do logo (globo + anel + "NIARA") — ainda não integrado a nenhum
  componente; confirmar com o usuário antes de usar.
- Revisão jurídica pendente do texto das seções "Benefícios da
  tokenização" (Vantagem Tributária, Crédito mais Barato e Justo/
  Peer-to-Peer) e "Quando posso usar a Tokenização?" (Antecipação do
  Caixa) — textos aprovados para exibição, mas ainda não validados
  juridicamente. Não alterar nem expandir esses textos sem instrução.
- Formulário de contato real, autenticação, backend — fora de escopo por
  ora
- Conteúdo real das páginas-stub (`/negociar/*`, `/ativos`, `/perfil`,
  `/sobre/*`) — hoje só exibem aviso de "em construção"
- **Bug conhecido (pré-existente, não corrigido nesta rodada):**
  `Reveal.tsx`/`RevealGroup.tsx` usam `useReducedMotion()` do
  framer-motion, que lê `window.matchMedia` de forma síncrona já no
  primeiro render do cliente — em um dispositivo com
  `prefers-reduced-motion: reduce` ativo, isso diverge do HTML renderizado
  no servidor (que não tem acesso a essa preferência) e o React acusa um
  erro de hidratação no console (`"A tree hydrated but some attributes...
  didn't match"`). Não observado impacto visual (o framer-motion aplica o
  estado final correto via DOM direto, independente do mismatch), mas o
  erro de console é real e é uma limitação do próprio hook do
  framer-motion, não do nosso código. Corrigir exigiria mudar o padrão de
  inicialização de `reducedMotion` nesses dois componentes (ex.: começar
  sempre `false` e só atualizar via `useEffect` pós-montagem) — deixado
  para uma tarefa própria, já que afeta componentes usados em várias
  seções existentes.
