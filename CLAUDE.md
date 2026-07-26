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
backend nem autenticação.** A única conexão real com blockchain é a
carteira (MetaMask, rede Sepolia/testnet, somente leitura de endereço/rede/
saldo) na seção Carteira de `/perfil` — ver "Tela `/perfil`" abaixo. Todo o
resto (ofertas, boleta, dashboard de portfólio etc.) continua demonstração,
sem nenhuma transação real.

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
- Gráficos (dashboard `/ativos`): `recharts` (`BarChart` empilhado da
  evolução do portfólio, `PieChart`/donut da alocação) — ver "Tela /ativos"
  abaixo
- Estado: React (`useState`, Context). Sem libs de estado externas.
- Carteira real (seção Carteira de `/perfil`, testnet Sepolia): `wagmi` v3 +
  `viem` v2 + `@tanstack/react-query` v5 — mesma stack e estrutura do
  `ConnectWallet`/`ConnectionPanel` do `niara-site` (repositório irmão,
  originalmente da rota `/pilot` dele), reaproveitada aqui. Ver "Tela
  `/perfil`" abaixo, seção "4. Carteira".

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

**Verde-sálvia (primária):** `military` **#3E4835 / rgb(62,72,53)** — valor
oficial, medido da faixa CTA "Quer estruturar a captação" e fonte única de
verdade para qualquer verde do site · `military-600` #4E5A42 (hover) ·
`military-100` #E6EBDD — **fundo de seção "sálvia"**

**Pêssego (acento / CTA):** `salmon` **#F0A487 / rgb(240,164,135)** — valor
oficial, medido do botão "Contate-nos" e fonte única de verdade para
qualquer salmão do site · `salmon-600` #E08E6F (hover) · `salmon-100`
#FBE9DF — **fundo de seção "pêssego"**

**Acentos de seção:** `ink-peach` #8A5A47 (subtítulo terroso sobre o
**tint** `salmon-100` — nunca `ink-muted`/cinza ali; não usar sobre o
salmon cheio, ver regra de contraste abaixo) · `chip-sage` #DCE3CF
(selo/label atrás do título de card)

### 🔴 Fundos cheios de seção + regra de contraste

Desde a Parte 6, as seções de conteúdo (exceto "Como funciona") alternam
fundo **cheio** — `bg-military` (#3E4835, escuro) ou `bg-salmon` (#F0A487,
claro) — em vez dos tints `-100` usados antes. O Hero passou a usar
`bg-military` cheio também (antes ficava sobre `bg` neutro). Os tints
(`military-100`/`salmon-100`) continuam existindo como tokens (usados em
chips, glows do hero, hover de botão outline etc.), só deixaram de ser o
fundo de seção inteira.

Texto que fica **direto sobre o fundo da seção** (título/subtítulo, fora
de qualquer card branco) precisa dos tokens semânticos abaixo — checados
para AA (4.5:1) contra os hex exatos acima, não improvisar outro tom:

- Sobre `bg-military` (escuro): `text-on-military` (#FAF8F5, claro —
  mesmo tom de `--color-bg`, já usado assim na faixa CTA final) para o
  título; para subtítulo, se houver, reaproveitar o padrão da CTA
  (`text-on-military/80`) em vez de criar um novo tom.
- Sobre `bg-salmon` (claro): `text-on-salmon` (#23271F, escuro — mesmo
  tom de `--color-ink`) para o título; `text-on-salmon-muted` (#5A3325)
  para subtítulo. **Não** usar `ink-peach` aqui — foi calibrado para o
  tint `salmon-100`, bem mais claro, e não atinge 4.5:1 sobre o salmon
  cheio.

Cards continuam brancos (`bg-surface`) dentro de qualquer fundo cheio, com
texto interno (`text-ink`/`text-ink-muted`) inalterado — a regra de
contraste acima só vale para texto solto direto sobre a cor da seção.
Cards sem borda (`SectionCard`) não precisam de ajuste sobre fundo escuro
(nunca tiveram borda); cards com borda (`border-border`, ex.:
`AudiencesSection`) só devem manter a borda quando o fundo por trás for
claro (salmon) — sobre `bg-military` ela some visualmente e deve ser
removida, mantendo só a sombra.

Os nomes dos tokens (`military`, `salmon` etc.) foram mantidos por
compatibilidade de código mesmo após a mudança de paleta militar→sálvia —
só os valores hex e a semântica visual mudaram.

### Tokens do dashboard `/ativos`

Além dos tokens de seção acima, a tela `/ativos` (ver "Tela /ativos"
abaixo) introduziu tokens próprios em `@theme`, todos pensados para uso
**sobre `bg-military` cheio**:

- `on-military-muted` #C3CBB3 — texto secundário de densidade de dados
  (rótulos de KPI, legendas, notas), mais suave que `on-military` puro.
  Diferente de `on-military/80` (usado no subtítulo do Hero/CTA): este é
  um tom próprio, pensado para telas densas de dados, não para
  marketing — não reaproveitar `on-military/80` aqui nem vice-versa.
- `panel` / `panel-border` — fundo e borda dos cards do dashboard (KPI,
  gráfico, tabela, catálogo). `panel` é `color-mix(military 90%, black)`
  — **mais escuro** que a seção, não mais claro. Border é um overlay
  claro sutil (`on-military` em baixa opacidade).
  🔴 **Isso foi um bug real, não uma escolha estética arbitrária**: a
  primeira versão usava um overlay *claro* (`color-mix(on-military 6%,
  transparent)`), que eleva a luminância do fundo do card — e por isso
  **reduz** o contraste de qualquer texto claro dentro dele. Com esse
  fundo mais claro, `value-negative` caía para ~3,98:1 contra o painel
  (abaixo do mínimo AA de 4,5:1 para texto pequeno, ex.: a coluna
  "Variação" da tabela de posições) mesmo depois de já ter sido escolhido
  para passar em 4,5:1 contra o `bg-military` puro. Escurecer o fundo do
  card resolve na direção certa: aumenta a margem de contraste de todos
  os tokens de texto claro usados dentro dele, em vez de reduzi-la. Ao
  criar qualquer novo tom de texto claro para uso dentro de um card sobre
  fundo escuro, **sempre verificar contraste contra o fundo real do card
  (`panel`), não só contra o fundo da seção** — os dois não são a mesma
  cor e o card pode ser a superfície mais exigente das duas.
- `value-positive` #9BD1A0 / `value-negative` #EDA492 — ganho/perda (KPI,
  variação % da tabela). `value-negative` foi ajustado de um coral mais
  escuro (#E67C63, ~3,4:1 contra `bg-military`) para #EDA492 (~4,73:1
  contra `bg-military`, ~5,25:1 contra `panel`) pelo mesmo motivo acima.
  É inevitavelmente próximo do tom de `salmon` — vermelhos/corais só
  atingem AA contra este verde ficando claros o bastante para se
  aproximarem do pêssego; o projeto já reaproveita `salmon` em papéis
  diferentes em outros lugares (chip de categoria "Token PMEs" *é*
  literalmente `salmon`), então essa proximidade é consistente com o
  padrão existente, não uma inconsistência nova.
- `chart-pmes` #F0A487 (= `salmon`) · `chart-agro` #B7C29E ·
  `chart-imobiliario` #E4C07A · `chart-auto` #7FA9A3 · `chart-divida`
  #B49FC0 — paleta categórica fixa dos gráficos (5 classes de token),
  usada tanto no donut quanto no indicador de categoria da tabela e do
  catálogo. Passados ao Recharts como `fill="var(--color-chart-*)"`
  (atributo lido pelo SVG em tempo de render, funciona normalmente com
  `var()`) — não hardcodar os hex nos componentes.

Sempre que precisar verificar contraste AA (4.5:1) ao adicionar um tom
novo, usar a fórmula de luminância relativa do WCAG 2.x contra o hex
exato do fundo **onde o texto realmente vai ficar** (seção vs. card vs.
tooltip flutuante — cada um pode ter um fundo efetivo diferente).

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

Padrão de alternância de fundo nas seções da home: sálvia (`bg-military`)
e pêssego (`bg-salmon`), **cheios** (ver "Fundos cheios de seção" acima —
os tints `-100` não são mais usados como fundo de seção inteira), se
alternam entre seções de conteúdo. Cards continuam brancos (`bg-surface`)
sobre qualquer um dos dois, com o chip (`bg-chip-sage`) atrás do
título/ícone do card.

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
`public/astronaut.png` e o gancho de fade-out que existia na seção
Créditos (seção essa também removida depois — ver "Estado atual").

No lugar dele, o hero foi rebalanceado para ficar centrado no texto
(headline + subtítulo + CTAs), com um elemento decorativo sutil atrás do
conteúdo — o motivo do planeta anelado do `<Logo />` (círculo + elipse
inclinada) desenhado em SVG dentro de `HeroParallaxLayers.tsx`, com leve
parallax por scroll (GSAP `ScrollTrigger`, respeitando
`prefers-reduced-motion`) — junto dos glows suaves (`blur` + cores da
paleta) que já existiam ali. Não reintroduzir um elemento central 3D/2D
persistente sem alinhar antes com o usuário.

### Anel do planeta: salmão reforçado + rotação lenta

O traço da elipse (anel) usa `--color-salmon` em opacidade alta (`0.9`),
separada da opacidade do círculo (corpo do planeta, `0.3`) — antes os dois
dividiam uma única opacidade de container (`0.2`), o que apagava o salmão
sobre o `bg-military`. Mesma lógica no glow salmão (`layer2Ref`): opacidade
e área um pouco maiores (`bg-salmon/35`, `h-80 w-80`) para o brilho ficar
mais presente sem sujar o fundo. Nenhum token novo foi criado — resolvido
só com opacidade/uso sobre os tokens já oficiais.

O anel gira devagar e continuamente (`hero-orbit-ring-spin`,
`globals.css`, 56s linear infinite) em torno do centro do próprio traço —
a `<g>` que envolve a `<ellipse>` recebe `transform-box: fill-box;
transform-origin: center;` para o eixo de rotação ficar no centro do
planeta, não no canto do SVG. A inclinação estática original (-18°) foi
incorporada à animação (`from { rotate(-18deg) }` → `to { rotate(342deg)
}`, isto é, uma volta completa de -18° a -18°+360°) em vez de ficar num
atributo `transform` solto na `<ellipse>` — CSS `transform` substitui por
completo (não combina com) o atributo `transform` do SVG no mesmo
elemento, então os dois não podiam coexistir. Por essa mesma escolha de
ângulo final (342° ≡ -18° em módulo 360), a regra global de
`prefers-reduced-motion: reduce` já existente em `globals.css` (que reduz
toda animação a uma única iteração de ~0.01ms) trava o anel exatamente na
inclinação estática original, sem precisar de uma media query própria só
para este elemento — desde que a animação tenha `forwards` no fill-mode
(`animation: hero-orbit-ring-spin 56s linear infinite forwards`): sem
isso, ao fim da única iteração o navegador descarta o "to" e o transform
volta a `none` (anel "destorcido", perde a inclinação por completo) em
vez de ficar parado nos 342°. Verificado via Playwright: `getComputedStyle`
do `<g>` muda de ângulo a cada poucos segundos em modo normal e permanece
travado com o mesmo transform sob `reducedMotion: 'reduce'`. O parallax de
scroll (GSAP `ScrollTrigger`, no `<div>`
externo que envolve o SVG) continua funcionando junto, sem conflito — atua
sobre um elemento HTML diferente do `<g>` que a animação CSS controla.

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

## Tela `/ativos` (dashboard de portfólio)

Substituiu o stub antigo ("Ativos — em construção"). Dashboard de
portfólio tokenizado no estilo do dashboard "Assets" do `niara-site`
(repositório irmão, exchange), mas adaptado: fundo **verde-sálvia cheio**
(`bg-military`, não o dashboard escuro/preto do `niara-site`), idioma
pt-BR, moeda **R$ (BRL)** em vez de USDT. Ver `AtivosPage.tsx`
(orquestrador) e os componentes em `src/components/ativos/`.

**Estrutura da página** (`AtivosPage.tsx`, `"use client"` por causa do
estado da aba):

- Banner de demonstração fixo no topo (`bg-panel`, obrigatório pela regra
  "nada simulado pode parecer real" — texto: "Demonstração — carteira e
  dados simulados. Não reflete posições ou valores reais.")
- Duas abas (`role="tablist"`/`role="tab"`/`role="tabpanel"`, sem roving
  tabindex — foco via Tab nativo do `<button>`, ativação via
  click/Enter/Espaço, suficiente para o nível de acessibilidade já usado
  no resto do projeto): **"Minha carteira"** (padrão) e **"Ativos
  disponíveis"**.
- Aba "Minha carteira": `PortfolioSummary` (4 KPIs) → grid com
  `PortfolioEvolutionChart` (7 colunas) + `AllocationDonut` (5 colunas) →
  `PositionsTable`.
- Aba "Ativos disponíveis": `AssetCatalog` — grade de cards de catálogo
  demo, cada um com botão "Investir (Em breve)" **desabilitado**
  (`disabled aria-disabled="true"`, mesmo padrão do CTA do Hero).

**Dados**: tudo em `src/lib/mock/ativos.ts` (tipado: `Position`,
`MonthlyEvolution`, `CatalogAsset`) — 5 posições (uma por categoria de
token: PMEs, Agro, Imobiliário, Auto, Títulos de dívida), 12 meses de
evolução, 6 itens de catálogo. Nenhum valor é real; números escolhidos só
para serem internamente coerentes (KPIs somam a partir das posições,
último mês da evolução bate com os totais). Derivações (totais do
portfólio, agrupamento de alocação) ficam em `src/lib/ativos/derive.ts`
como funções puras — os componentes não guardam valor derivado em
estado, recalculam a partir do mock a cada render (mesmo padrão do
dashboard do `niara-site`).

**Alocação (donut)**: três visões alternáveis (`AllocationView`: `classe`
| `ativo` | `setor`) — "Por classe" agrupa por categoria de token (cor
fixa por categoria, `CATEGORY_COLOR_VAR` em `derive.ts`), "Por ativo"
mostra uma fatia por posição (cor = cor da categoria da posição), "Por
setor/região" agrupa por região (`Region`: sudeste/sul/nordeste/
centro-oeste, cor fixa por região). O SVG do gráfico é `aria-hidden`; a
alternativa acessível é a própria lista de legenda ao lado (texto real,
não decorativo) com label + % + valor em R$ — mesmo padrão de
acessibilidade do donut do `niara-site`.

**Gráfico de evolução (barras empilhadas)**: `recharts` `BarChart`,
`stackId` único para as duas séries ("Valor investido" + "Ganho de
capital"). Cores via `fill="var(--color-chart-*)"` / `var(--color-value-
positive)` — atributo SVG lido em runtime, `var()` funciona normalmente
aqui (diferente de um valor estático de build). Abaixo do gráfico, uma
descrição textual (`ptBr.ativos.evolucao.description`) serve de
alternativa de acessibilidade ao SVG `aria-hidden`, apontando que os
mesmos dados aparecem na tabela de posições.

**Tooltips do Recharts**: tipo próprio (`ChartTooltipProps`/
`DonutTooltipProps`) em vez dos genéricos do Recharts (`TooltipProps<...>`)
— evita conflitos de variância entre o tipo esperado pela prop `content`
e o componente customizado (mesmo padrão do `niara-site`).

Ver "Tokens do dashboard `/ativos`" (seção de Design system acima) para
os tokens de cor específicos desta tela e a pegadinha de contraste que já
foi corrigida (fundo do card mais escuro que a seção, não mais claro).

---

## Tela `/perfil` (cadastro, empresas, perfil de investidor, carteira)

Substituiu o stub antigo ("Perfil — em construção"). Inspirada na página
Profile do `niara-site` (repositório irmão) — mesma estrutura de
sidebar + seções e mesma lógica de questionário de perfil de investidor
(porém traduzida e com conteúdo próprio) — mas adaptada ao tema
verde-sálvia cheio (`bg-military`, igual à tela `/ativos`, não o dashboard
escuro do `niara-site`) e com duas adições específicas de PME: documento
CPF **ou** CNPJ e cadastro de empresa com escolha de finalidade
(investidora / a ser tokenizada). Ver `PerfilPage.tsx` (orquestrador) e os
componentes em `src/components/perfil/`.

**Estrutura da página** (`PerfilPage.tsx`, `"use client"` por causa do
estado do contexto de perfil de investidor):

- Banner de demonstração fixo no topo (mesmo padrão do banner de `/ativos`)
- Faixa de aviso de KYC (`bg-panel`): "Não verificado" + texto explicando
  que a verificação de identidade será exigida quando o produto entrar no
  ar e que nenhuma aprovação é simulada aqui
- Badges de status (`ShieldAlert` "Não verificado" + `TrendingUp` "Perfil:
  {categoria atual}")
- Sidebar de navegação por âncora (`PerfilNav.tsx` — sticky no desktop,
  abas horizontais roláveis no mobile, mesmo padrão do `ProfileNav` do
  `niara-site`) + quatro seções empilhadas, nesta ordem: **Dados de
  cadastro** → **Empresas** → **Perfil de investidor** → **Carteira**.

**Tokens de cor**: a tela reaproveita os tokens já criados para `/ativos`
(`panel`/`panel-border` para cards, `on-military`/`on-military-muted`
para texto, `value-negative` para erro de validação, `salmon`/`on-salmon`
para CTAs e estado ativo) — **nenhum token novo foi criado**. Campos de
formulário usam `bg-military` (mais claro que o `panel` do card que os
contém, para ficarem visualmente distintos) com borda `panel-border` e
anel de foco `ring-salmon`; erro de validação usa borda e texto
`value-negative` (já calibrado para AA contra `military`/`panel`, ver
"Tokens do dashboard `/ativos`" acima).

### 1. Dados de cadastro (`PersonalDataSection.tsx`)

Alternância Pessoa física/jurídica (mesmo padrão visual das abas de
`/ativos`) controla o campo de documento (`maskCPF`/`maskCNPJ`, ver
`src/lib/masks.ts`) e os campos exclusivos de cada tipo (Nome completo +
Data de nascimento para PF; Razão social + Nome fantasia para PJ).
`AvatarUpload.tsx` é a mesma lógica do `niara-site` (object URL local via
`URL.createObjectURL`, revogado no cleanup do `useEffect` e ao trocar de
imagem) — **a imagem nunca é enviada**, só existe como blob no navegador.

🔴 **LGPD**: CPF/CNPJ, data de nascimento, endereço, telefone e a foto de
avatar vivem **só em estado React** (`useState`), nunca em
`localStorage`/`sessionStorage`/cookies — mesma regra que os demais dados
de perfil abaixo. "Salvar (simulação)" só move o rascunho (`draft`) para o
estado "salvo" (`saved`) da própria sessão do componente; nada sai do
navegador.

### 2. Empresas (`CompaniesSection.tsx`)

Botão "Cadastrar empresa" abre um formulário cuja primeira escolha é a
**finalidade**: empresa investidora ou empresa a ser tokenizada
(`radio`, não `select`, para deixar as duas opções visíveis lado a lado
com a descrição de cada uma). Setor/categoria reaproveita o tipo
`TokenCategory` e os rótulos de `ptBr.ativos.categorias` já usados em
`/ativos` (mesmas 5 classes: PMEs, Agro, Imobiliário, Auto, Títulos de
dívida) — evita duplicar taxonomia. Empresas cadastradas entram em
"Minhas empresas" (estado em memória, `crypto.randomUUID()` como id),
com badge de finalidade e ações Editar/Remover (simulação). Ao escolher
"a ser tokenizada", aparece a nota de que a estruturação da oferta é um
fluxo à parte e o botão "Estruturar oferta" fica desabilitado/rotulado
"(Em breve)" — mesmo padrão de botão do CTA do Hero e do catálogo de
`/ativos`. LGPD: CNPJ e demais dados da empresa também só em memória.

### 3. Perfil de investidor (`InvestorProfileSection.tsx` + `InvestorProfileQuiz.tsx` + `InvestorProfileResultCard.tsx`)

Explica que a seção equivale à API (Análise do Perfil do Investidor) da
CVM e que, em produção, o questionário seria obrigatório antes do cadastro
se completar — "aqui, por ser demonstração, o restante do site continua
acessível" (nada bloqueia navegação). Um resultado padrão
(`DEFAULT_INVESTOR_PROFILE` em `src/lib/investor-profile.ts`, categoria
"Arrojado", avaliado em 19/07/2026) já vem preenchido — diferente do
`niara-site`, onde o perfil nasce "pendente" até o usuário responder —
porque aqui não há persistência entre sessões para reidratar um resultado
real, então começar vazio deixaria a demonstração sempre no estado
"pendente". "Refazer avaliação" abre o questionário (5 perguntas, pt-BR,
conteúdo em `ptBr.perfil.investidor.quiz.questions`) e, ao concluir,
recalcula a categoria (`categorizeScore`, mesma lógica de tercis do
`niara-site`) e volta para o card de resultado. O resultado (categoria +
escore + data) fica só no `PerfilContext` (React, em memória) — **nunca**
em `localStorage`, diferente do `niara-site` (que persiste lá); decisão
deliberada para manter a mesma garantia de "nada persiste além da sessão"
que o resto da tela de perfil já promete.

A escala Conservador–Moderado–Arrojado é uma barra de gradiente
(`aria-hidden`, decorativa) com um indicador na posição do escore — a
alternativa acessível são os três rótulos de texto acima da barra (não a
barra em si), mesmo padrão de acessibilidade do donut de `/ativos` (SVG
decorativo + lista/texto real ao lado). Blocos "O que este perfil
significa"/"Reação a risco e volatilidade"/"Classes de ativos mais
adequadas" e o disclaimer ("resultado ilustrativo, não constitui
recomendação...") vêm de `ptBr.perfil.investidor.categoryDetails`.

### 4. Carteira (`WalletSection.tsx`)

🔴 **Conexão real** (única parte não-simulada do site) — lê endereço, rede
e saldo de teste de uma carteira MetaMask de verdade via EIP-1193
(`window.ethereum`); nenhuma transação é enviada, nenhuma chave privada é
tocada pelo app (fica inteiramente a cargo do MetaMask) e nada é enviado a
servidor (não há backend — tudo roda client-side). Reaproveita a mesma
stack e estrutura do `ConnectWallet`/`ConnectionPanel` do `niara-site`
(repositório irmão, `src/components/web3/` lá, originalmente construídos
para a rota de piloto `/pilot` dele) — mesmos hooks (`useConnection`,
`useConnect`, `useDisconnect`, `useSwitchChain`, `useBalance`), mesmo
connector (`injected()`) e mesma rede única (`sepolia` de `wagmi/chains`),
só adaptados ao pt-BR e ao tema verde-sálvia (`panel`/`on-military`/
`salmon` em vez dos tokens de tema escuro do `niara-site`).

**Estrutura** (`src/lib/web3/config.ts` + `src/app/providers.tsx` +
`src/components/web3/ConnectWallet.tsx` + `ConnectionPanel.tsx`, todos
copiados/adaptados do `niara-site`):

- `config.ts`: `createConfig` do wagmi com `chains: [sepolia]`,
  `connectors: [injected()]`, `storage: createStorage({ storage:
  cookieStorage })` e `ssr: true` — permite hidratar o estado de conexão
  no servidor via cookie (evita flash "desconectado" no primeiro render).
  `transports` usa `http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)` — sem
  essa env var (não commitada, `.env*` já no `.gitignore`), cai no RPC
  público padrão da própria definição de `sepolia` em `wagmi/chains`; não
  há segredo hardcoded em lugar nenhum.
- `providers.tsx` (`"use client"`): `WagmiProvider` + `QueryClientProvider`
  (`@tanstack/react-query`, exigido internamente pelo wagmi para cache dos
  hooks de leitura). Montado no layout raiz (`src/app/layout.tsx`, que por
  isso passou a ser `async` — usa `cookieToInitialState(config, (await
  headers()).get("cookie"))`, padrão Next 16/wagmi para SSR), então a
  conexão fica disponível em qualquer rota, não só em `/perfil`.
- `ConnectWallet.tsx`: detecção de provider injetado via
  `useSyncExternalStore` (sem evento para assinar — só leitura
  pós-hidratação, servidor assume presente para não penalizar o caminho
  feliz com flash negativo); três estados — não detectada (link para
  `metamask.io/download`), rede errada (qualquer `chainId !== sepolia.id`,
  inclusive mainnet — botão "Trocar para Sepolia" via `useSwitchChain`,
  que também adiciona a rede automaticamente se a carteira não a conhecer
  ainda, via `wallet_addEthereumChain` interno do wagmi) e conectada
  (endereço truncado + botão de copiar endereço completo, feedback
  "Copiado" por 2s + botão desconectar). Eventos `accountsChanged`/
  `chainChanged`/desconexão são tratados automaticamente pelo próprio
  wagmi internamente (não há listener manual no código) — a UI
  simplesmente re-renderiza porque os hooks são reativos ao estado do
  connector.
- `ConnectionPanel.tsx`: painel com status/endereço/rede/saldo em ETH de
  teste (`useBalance`, só habilitado quando conectado **e** em Sepolia).
  Diferente do `niara-site` (que também lê saldo de tokens ERC-20 reais
  via `useReadContracts`, ex. mUSDT), aqui não há leitura de token — a
  Niara PMEs não tem nenhum contrato ERC-20 real implantado, então
  fabricar endereços de contrato para ler seria inventar dado que pareceria
  real (violaria a regra "nada simulado pode parecer real" do topo deste
  arquivo). Só o saldo nativo (ETH de Sepolia) é lido.
- "Desconectar" só limpa a sessão de conexão do site (`useDisconnect` do
  wagmi) — a carteira em si continua conectada no MetaMask; texto da UI
  deixa isso explícito, já que MetaMask historicamente não expõe uma forma
  programática de revogar a permissão do site (isso se faz nas
  configurações de conexões do próprio MetaMask, fora do controle do app).

Textos em `ptBr.perfil.carteira` (`src/lib/i18n/pt-br.ts`) deixam claro que
a conexão é real mas o resto da plataforma não: "Conexão real com sua
carteira — apenas leitura de endereço e rede. Nenhuma transação é
realizada." + nota reforçando que compra/venda/qualquer operação com valor
mobiliário não passa por aqui. O pool de carteiras fictícias que existia
antes (`DEMO_WALLET_POOL`, `src/lib/mock/perfil.ts`) foi removido por
completo — não faz mais sentido com conexão real.

---

## Telas `/sobre/documentos` (Documentação) e `/sobre/contato` (Contate-nos)

Substituíram os stubs antigos ("Documentos e FAQs" / "Contate-nos").
Inspiradas nas páginas `docs` e `contact` do `niara-site` (repositório
irmão) — mesma estrutura (sidebar com navegação por seções/âncoras +
conteúdo, acordeão de FAQ, formulário de contato via `mailto`) — mas em
pt-BR, no tema verde-sálvia cheio (`bg-military`, igual a `/ativos` e
`/perfil`) e com conteúdo próprio de PME (captação via tokenização sob a
Resolução CVM 88, não a exchange). **Nenhum token novo foi criado** —
reaproveitam `panel`/`panel-border`, `on-military`/`on-military-muted`,
`salmon`/`on-salmon` e `value-negative`, já existentes desde `/ativos`.

### `/sobre/documentos` (`DocumentacaoPage.tsx`, componentes em
`src/components/documentacao/`)

Tarja "Estágio atual" no topo (`bg-panel`, rótulo em `salmon`) — texto diz
que os contratos estão em protótipo/testnet, sem mainnet nem auditoria
publicada, e que todo o conteúdo do site é demonstração. Abaixo, cabeçalho
centrado (título + subtítulo) e, em seguida, `DocumentacaoNav.tsx`
(sidebar sticky no desktop / abas horizontais roláveis no mobile, mesmo
padrão de `PerfilNav.tsx`) ao lado do conteúdo, com seções por âncora
(`scroll-mt-24`, mesma convenção de `/perfil`): O que é a Niara PMEs →
Como funciona a tokenização (lista numerada 01–04) → Enquadramento
regulatório → Modelo de receita → Tecnologia → FAQ (`FaqAccordion.tsx`,
adaptado do `FaqAccordion` do `niara-site` — teclado + `aria-expanded`/
`aria-controls`, mesmo padrão de acessibilidade).

🔴 **Revisão jurídica pendente antes do go-live** — textos aprovados para
exibição nesta fase, mas ainda não validados juridicamente:
- Seção "Enquadramento regulatório" (`ptBr.documentacao.enquadramento`):
  menção à Resolução CVM 88 e à necessidade de plataforma
  autorizada/registrada pela CVM para oferta pública.
- Afirmação de que o registro on-chain é "probatório de integridade e
  anterioridade" e não substitui os livros societários da Lei 6.404 nem o
  registro em cartório (mesma regra já vale para `/perfil`, ver "Regra
  principal" no topo deste arquivo).
- Seção "Modelo de receita" (`ptBr.documentacao.modeloReceita`):
  deliberadamente **sem percentuais** ("em definição") — não preencher
  números de taxa sem validação jurídica/de produto.

### `/sobre/contato` (`ContatoPage.tsx` + `ContatoForm.tsx`, em
`src/components/contato/`)

Formulário (Nome, Email, Assunto — select com 6 opções, Mensagem) ao lado
de um painel "Fale direto com a gente" com o e-mail em link `mailto`.
Reaproveita `TextField`/`SelectField` de `src/components/perfil/FormField.tsx`
(rotulado "compartilhado" desde a tela `/perfil`) mais um novo
`TextareaField` adicionado ao mesmo arquivo. `SelectField` ganhou
`placeholder` opcional — antes era obrigatório e sempre renderizava uma
`<option>` em branco (fazia sentido em `CompaniesSection`, onde o campo
começa vazio); aqui o campo Assunto já nasce com um valor selecionado, e
uma opção em branco extra seria só ruído.

Envio **honesto via `mailto`, sem backend** (mesmo padrão do
`ContactForm` do `niara-site`): ao validar (nome, email com formato
válido via `isValidEmail` de `src/lib/masks.ts`, mensagem não vazia), o
clique em "Abrir email" monta `mailto:niaragaed@gmail.com` com
assunto/corpo pré-preenchidos via `window.location.href` — nunca simula
sucesso nem faz `POST`. LGPD: os campos do formulário vivem só em
`useState` do componente; nada é persistido em `localStorage`/
`sessionStorage` nem enviado a servidor.

---

## Telas `/negociar` (hub, categorias, detalhe da oferta e boleta simulada)

Substituíram os 6 stubs antigos das rotas `/negociar/*`
(`ativos-e-tokens` e as 5 categorias) e adicionaram uma rota nova. Tema
verde-sálvia cheio (`bg-military`, igual a `/ativos` e `/perfil`), mas
com uma diferença deliberada: aqui os cards de conteúdo são **brancos**
(`bg-surface`, texto `ink`/`ink-muted`), não os cards escuros (`panel`)
usados em `/ativos`/`/perfil` — decisão do design aprovado para esta
seção, replicada em todas as 4 telas abaixo. `StubPage.tsx` foi removido
por ficar sem nenhum uso depois da troca.

🔴 **A negociação é 100% simulação de produto.** Nenhuma ordem é
enviada a um servidor, nenhuma correspondência de ordens (order book)
real existe, e o enquadramento regulatório (Resolução CVM 88/135,
autorização da CVM para a plataforma) depende de revisão jurídica
antes de qualquer uso real — mesma ressalva já registrada para
`/sobre/documentos`. Ao contrário do terminal `/trade` do `niara-site`
(repositório irmão), que é uma bolsa com book de ofertas em tempo real,
a boleta aqui não tem book: cada ordem simulada apenas confirma
instantaneamente, o que é a forma correta de simular a compra/venda de
uma participação/cota ilíquida de PME, diferente de um ativo líquido
com profundidade de mercado.

**Ícone + cor por categoria** (`src/lib/categories.ts`, `CATEGORY_META`):
Token PMEs → `Building2` (reaproveita `salmon-100`/`ink-peach`, já
existentes) · Token Agro → `Wheat` (reaproveita `military-100`, ícone em
`--color-cat-agro-icon`) · Token Imobiliário → `Home` · Token Auto →
`Car` · Títulos de dívida → `Landmark` — os últimos três com tokens
próprios (`--color-cat-{imobiliario,auto,divida}-{chip,icon}` em
`globals.css`). Todos pensados para uso sobre card **branco**, não sobre
`bg-military` — diferente dos tokens `--color-chart-*` de `/ativos`, que
são para o donut/gráfico sobre fundo escuro. `CategoryChip` (ícone
decorativo, `aria-hidden`) e `CategoryBadge` (ícone + nome da categoria,
texto real e visível) ficam em
`src/components/negociar/CategoryChip.tsx`.

**Dados**: `src/lib/mock/ofertas.ts` — as 5 categorias (nome/descrição/
ficha/casos de uso ficam em `ptBr.negociar.categorias`, ver
i18n abaixo) e 10 ofertas fictícias tipadas (`Oferta`), 2 por categoria.
Os nomes reaproveitam os mesmos exemplos já usados no catálogo de
`/ativos` (`src/lib/mock/ativos.ts`, ex.: "Token PME Padaria Bela
Vista") para consistência narrativa entre as duas telas — mesma
demonstração fictícia, vista de dois ângulos diferentes. Nenhum campo
de rendimento/retorno projetado existe no tipo `Oferta`: a regra "nada
de promessa de retorno" foi respeitada removendo o campo, não
escondendo-o na UI. `DOCUMENTOS_PADRAO` é uma lista genérica de
material de divulgação (mesmos placeholders "Em breve" para todas as
ofertas, já que nenhum documento real existe nesta fase) — 7 itens,
nesta ordem: Memorando de informações, Balanço financeiro,
Demonstrações financeiras, Release de resultados, Apresentação dos
resultados, Contrato social / estatuto, Termo de adesão à oferta.
Cada `Oferta` também tem `indicadores: IndicadoresFundamentalistas`
(indicadores fundamentalistas fictícios em 6 grupos — valuation,
eficiência, rentabilidade, dividendos, endividamento, crescimento; ver
"Indicadores fundamentalistas" logo abaixo). Todas as 10 ofertas usam o
mesmo objeto `INDICADORES_DEMONSTRACAO` (não há análise fundamentalista
real de nenhuma empresa) — o campo fica por oferta no tipo para
permitir personalizar valores por oferta no futuro sem mudar a
modelagem.

**Hub** (`/negociar/ativos-e-tokens`, `HubPage.tsx`): banner de
demonstração, grade de 5 `CategoryCard` (chip colorido + nome + 1 linha
+ "Ver categoria →", linkando para a rota da categoria) e uma "Vitrine
(demonstração)" com 3 `ShowcaseCard` (`VITRINE_HUB_SLUGS` em
`ofertas.ts`, uma oferta de 3 categorias diferentes) linkando para o
detalhe.

**Template de categoria** (`CategoryPage.tsx`, reaproveitado pelas 5
rotas via prop `categoria`): link de volta ao hub, cabeçalho com
`CategoryChip` grande + nome + descrição, ficha em `<dl>` (Lastro
por categoria + Público/Enquadramento/Estágio compartilhados — os 3
últimos são idênticos entre categorias, por isso vivem em
`ptBr.negociar.categoriaTemplate` e não duplicados por categoria), 3
casos de uso e vitrine filtrada por categoria (`getOfertasByCategoria`).

**Detalhe da oferta** (`/negociar/oferta/[slug]`, rota dinâmica nova —
`params` assíncrono, Next.js 16; `notFound()` + `not-found.tsx` próprio
se o slug não existir em `OFERTAS`). `OfertaDetailPage.tsx`: dados
públicos da empresa, financeiro/caixa (KPIs + `FinanceiroChart.tsx`,
`recharts` `LineChart` de receita/caixa simulados dos últimos 6 meses,
com descrição textual como alternativa ao SVG `aria-hidden` — mesmo
padrão de `/ativos`), **indicadores fundamentalistas** (ver seção
própria abaixo), termos da oferta (tipo de token, meta de
captação, valor por cota, quantidade, prazo — nota reforçando que
qualquer estimativa é ilustrativa), documentos placeholder desabilitados
(7 itens, ver "Dados" acima) e riscos estilo CVM 88. CTA "Negociar
(simulação)" no cabeçalho abre a boleta e some enquanto ela está aberta
(evita duplicidade); reaparece ao fechar.

**Indicadores fundamentalistas** (`FundamentalIndicators.tsx`,
renderizado logo após "Financeiro / caixa"): painel branco inspirado no
layout do Investidor10 — título + aviso "Indicadores simulados de
demonstração — não refletem valores reais nem análise de nenhuma
empresa" (obrigatório pela regra "nada simulado pode parecer real"),
depois 6 grupos (Valuation, Eficiência, Rentabilidade, Dividendos,
Endividamento, Crescimento), cada um com rótulo + barra de acento à
esquerda (`bg-salmon`, decorativa) e uma grade de cards de indicador
(`grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`, empilha
sozinha no mobile). Cada card tem nome do indicador + botão "?"
(`HelpCircle` do lucide-react) + valor fictício formatado (`numero`:
2 casas decimais pt-BR; `percentual`: idem + `%`). Nomes, unidade e
texto de explicação de cada indicador vivem em
`ptBr.negociar.oferta.indicadores.grupos` (i18n); os valores numéricos
em si (fictícios) vivem em `INDICADORES_DEMONSTRACAO`
(`src/lib/mock/ofertas.ts`).

O botão "?" (`IndicatorHelp.tsx`) abre um popover acessível
(`<button aria-expanded aria-controls>` + `role="tooltip"`) com a
explicação do indicador — fecha com Esc, clique fora ou novo clique no
próprio botão; o estado de "qual está aberto" fica em
`FundamentalIndicators` (um único `openKey`), garantindo só um popover
aberto por vez entre todos os grupos/cards. Funciona por toque
(`pointerdown`, não só `mousedown`) e por teclado (foco visível via
`focus-visible:outline-salmon`, ativa com Enter/Espaço nativos do
`<button>`). Entrada usa a mesma utility `animate-dropdown` já usada
nos dropdowns do header — reaproveitada em vez de criar uma nova
animação, e já respeita `prefers-reduced-motion` pela regra global
existente em `globals.css` (reduz qualquer `animation-duration` a
~0.01ms), sem precisar de tratamento próprio.

🔴 **Posicionamento do popover é ancorado à direita do botão
(`right-0`), não centralizado** — decisão deliberada, não estética: um
popover centralizado (`left-1/2 -translate-x-1/2`) sobre um card perto
da borda direita da grade pode ultrapassar a viewport no mobile e criar
scroll horizontal na página inteira (elementos que se estendem além da
borda direita aumentam `scrollWidth`; a mesma classe de bug já não
existe para a esquerda, onde o excesso é só clipado sem gerar scroll).
Ancorando pela direita, o popover só se estende para a esquerda a
partir do botão — no pior caso (card na primeira coluna) fica com
menos espaço à esquerda, nunca cria overflow à direita. Verificado com
Playwright: `document.documentElement.scrollWidth ===
document.documentElement.clientWidth` em 390px de largura com o
popover do último indicador (canto da grade) aberto.

**Boleta simulada** (`OrderTicket.tsx`): painel lateral sticky no
desktop (`lg:static`, dentro do grid de 12 colunas da página) e drawer
inferior com backdrop no mobile (mesmo componente — só classes
Tailwind responsivas mudam `fixed inset-x-0 bottom-0` para
`lg:static`; o backdrop (`bg-ink/50`) só existe abaixo de `lg`). Fecha
por clique no X, clique no backdrop ou tecla Esc (o botão fechar
recebe foco ao abrir). Fluxo: Comprar/Vender → quantidade + preço
(pré-preenchido com `oferta.precoSimulado`, editável) → total/taxa
calculados → "Revisar (simulação)" → resumo → "Confirmar (simulação)"
→ mensagem de resultado rotulada como simulada, com um saldo simulado
em `useState` (não persistido) que é debitado/creditado — tudo
reseta ao fechar e reabrir a boleta (o componente desmonta). Nenhum
`fetch`/`POST` em lugar nenhum. Cor do toggle Comprar/Vender reaproveita
`military`/`salmon` (não `value-positive`/`value-negative`, que são
calibrados para contraste contra fundo **escuro** `bg-military`/`panel`
e falhariam AA se usados como texto direto sobre um card **branco**
como os desta seção — mesma classe de pegadinha já documentada para
`--color-panel`). Erro de validação usa o token novo
`--color-on-surface-negative` (vermelho escuro, ~6.5:1 contra branco),
criado especificamente para texto de erro sobre `bg-surface` nesta
seção — não confundir com `--color-value-negative`.

**i18n**: todo o texto de interface das 4 telas fica em
`ptBr.negociar` (`hub`, `categorias`, `categoriaTemplate`, `oferta`
— incluindo `oferta.indicadores.grupos` (nomes, unidade e explicações
dos indicadores fundamentalistas), `boleta`) em `src/lib/i18n/pt-br.ts`;
texto descritivo das ofertas fictícias (nome da empresa, resumo do
negócio etc.) e os valores numéricos dos indicadores fundamentalistas
ficam direto no mock (`ofertas.ts`), seguindo o mesmo padrão de
`mock/ativos.ts`.

Verificado com dev server + Playwright (desktop 1280px e mobile 390px):
hub, template de categoria, detalhe da oferta (documentos ampliados +
indicadores fundamentalistas — popover do "?" abrindo/fechando por
clique, Esc, clique fora e teclado, um por vez, sem scroll horizontal
no mobile) e o fluxo completo da boleta (abrir → revisar → confirmar →
nova ordem), incluindo o drawer mobile com backdrop — sem erros de
console.

---

## Tela `/entrar` (login/registro)

Substituiu os botões desabilitados "Entrar" (header) e "Iniciar
captação" (hero), que ficam **habilitados** a partir desta parte.
Header "Entrar" → `/entrar`; hero "Iniciar captação" →
`/entrar?intent=captacao` — mesma tela, o parâmetro só troca
título/subtítulo para dar ênfase a "criar conta para estruturar
captação" (`EntrarPage.tsx` recebe `isCaptacaoIntent`, calculado a
partir de `searchParams` assíncrono, Next 16, em `src/app/entrar/
page.tsx`). Estrutura inspirada na tela de login da Ondo (split:
mídia à esquerda, formulário unificado "entrar ou criar conta" à
direita), adaptada: a esquerda é a capa de um vídeo do YouTube (não
foto) que ensina a criar conta na MetaMask.

**Overlay de tela cheia, não rota "normal"**: como Header/Footer são
montados no layout raiz (`src/app/layout.tsx`) e envolvem todas as
rotas incondicionalmente, uma nested layout não consegue removê-los
— só adicionar UI. `EntrarPage.tsx` (`"use client"`) resolve isso
sendo um `<div role="dialog" aria-modal="true">` **`fixed inset-0
z-50`**, que cobre visualmente Header (`z-40`) e Footer por completo
sem precisar desmontá-los do DOM. Enquanto montado, trava o scroll do
`<body>` (`document.body.style.overflow = "hidden"` num `useEffect`,
restaurado no cleanup) — sem isso a página por trás do overlay
continuaria rolável. Fecha por clique no X (`<Link href="/">`,
canto superior direito, `z-20` para ficar acima da capa de vídeo) ou
tecla Esc (`router.push("/")` num listener de `keydown`, mesmo padrão
de fechamento por teclado já usado no drawer da boleta de
`/negociar`).

**Coluna esquerda — capa do vídeo** (`VideoCover.tsx`): thumbnail do
YouTube (`https://img.youtube.com/vi/m7lSSzq6xg4/maxresdefault.jpg`,
com fallback automático via `onError` da própria `<img>` para
`hqdefault.jpg`, que o YouTube sempre gera mesmo quando a maxres não
existe) como `<img>` comum (não `next/image` — simplicidade, evita
mexer em `images.remotePatterns` do `next.config.ts` só por uma
thumbnail externa; `eslint-disable-next-line @next/next/no-img-
element`, mesmo padrão já usado em `AvatarUpload.tsx`). Toda a área é
um único `<a target="_blank" rel="noopener noreferrer">` para
`https://youtu.be/m7lSSzq6xg4`, com `aria-label` descritivo — não só
o botão de play.

🔴 **Overlay do gradiente foi calibrado por legibilidade, não só
estética**: a primeira versão usava `from-military` (100% opaco) `via-
military/75` `to-military/40`, pensada só para "escurecer para
legibilidade do texto" — mas como o texto/legenda fica centralizado
verticalmente (`items-center justify-center`) e a paleta do vídeo em
si já é um verde-petróleo escuro próximo do `military`, o resultado
media era a capa parecer **quase sólida**, sem se reconhecer como
thumbnail de vídeo (verificado via screenshot Playwright com o overlay
temporariamente removido via `display:none` para comparação lado a
lado). Corrigido para `from-military/85 via-military/40 to-
military/10` (bem mais claro) **mais** um fundo próprio
(`bg-military/70 backdrop-blur-sm`, rounded) só atrás do parágrafo de
legenda — a legibilidade do texto vem desse pill dedicado, não de
escurecer a imagem inteira; o botão de play já é legível sozinho
(fundo salmão sólido). Ao alterar este overlay no futuro, sempre
comparar contra a imagem crua (overlay `display:none`) antes de
assumir que ficou escuro demais ou de menos.

**Coluna direita — formulário** (dentro do próprio `EntrarPage.tsx`):
tema verde-sálvia cheio (`bg-military`, mesmo padrão de `/ativos`,
`/perfil`, `/negociar` — não o painel claro estilo Ondo, para poder
reaproveitar `ConnectWallet` e os tokens `on-military`/`panel-border`
sem criar uma variante clara nova desses componentes).

- **MetaMask (real)**: `<ConnectWallet connectLabel={...}
  connectButtonClassName="w-full justify-center py-3" />` — mesmo
  componente de conexão real da Carteira de `/perfil` (ver "Tela
  `/perfil`", seção "4. Carteira"), sem duplicar lógica de conexão.
  `ConnectWallet` ganhou dois props **opcionais** or aqui (retro-
  compatíveis, `/perfil` continua chamando `<ConnectWallet />` sem
  props e com o texto/estilo de sempre): `connectLabel` (sobrescreve
  o texto do botão só no estado "não conectado" — aqui "Entrar com
  MetaMask" em vez de "Conectar carteira") e
  `connectButtonClassName` (classes extras nesse mesmo botão, aqui
  usado para ficar largura total). Os demais estados do componente
  (não detectada/rede errada/conectada) são os mesmos de `/perfil`,
  sem alteração.
- Divisor "ou" → campo Email (`disabled`, novo prop opcional em
  `TextField`, ver `src/components/perfil/FormField.tsx` — retro-
  compatível, default `undefined`) + botão "Continuar" e botão
  "Continuar com Google" (ícone inline próprio, `GoogleIcon` dentro de
  `EntrarPage.tsx` — lucide-react não tem logos de marca), ambos
  desabilitados e rotulados "(Em breve)", mesmo padrão visual do CTA
  do Hero. Não dependem de backend/provedor de auth que ainda não
  existe — não fingem enviar nem criar conta.
- Nota de termos (`ptBr.entrar.termosNota`) menciona Termos de Uso e
  Política de Privacidade como "documentos em breve" — texto puro,
  **sem** links `href="#"` mortos, já que essas páginas ainda não
  existem.

**Honestidade e LGPD**: a conexão MetaMask aqui é a mesma conexão real
já documentada em "Tela `/perfil`" — só leitura de endereço/rede, sem
transação, sem conta em servidor (identificador pseudônimo padrão
web3, não CPF/CNPJ). O campo de email é decorativo (`disabled`, não
envia nem persiste nada). Quando `intent=captacao`, o subtítulo já
deixa explícito que a estruturação da oferta em si continua
demonstração e depende das autorizações da CVM.

**i18n**: `ptBr.entrar` em `src/lib/i18n/pt-br.ts`.

Verificado com dev server + Playwright (desktop 1280px e mobile
390px): link do header e da hero navegando para `/entrar` (com e sem
`intent=captacao`), split funcionando em ambas resoluções, botão
MetaMask no estado "não detectada" (ambiente do headless Chromium sem
extensão instalada — o fallback correto aparece, com link de
instalação), campos email/Google desabilitados, X e Esc voltando para
a home, clique na capa do vídeo abrindo `youtu.be/m7lSSzq6xg4` em nova
aba — sem erros de console.

---

## Organização

```
src/
  app/                 rotas (App Router)
    layout.tsx         layout raiz, async (Next 16) — monta <Providers>
                       (wagmi/react-query) com initialState via cookie
    providers.tsx      Providers (WagmiProvider + QueryClientProvider) —
                       ver "Tela /perfil", seção "4. Carteira"
    ativos/page.tsx    dashboard de portfólio (ver "Tela /ativos" abaixo)
    perfil/page.tsx    tela de perfil (ver "Tela /perfil" abaixo)
    sobre/documentos/  documentação + FAQ (ver "Telas /sobre/documentos e
                       /sobre/contato" abaixo)
    sobre/contato/     formulário de contato via mailto (idem acima)
    negociar/          hub + 5 categorias + detalhe de oferta (ver "Telas
                       /negociar" abaixo); oferta/[slug]/ é rota dinâmica
                       com not-found.tsx próprio
    entrar/page.tsx    login/registro (overlay tela cheia, ver "Tela
                       /entrar" abaixo); searchParams assíncrono (Next 16)
                       para o parâmetro ?intent=captacao
  components/
    ativos/            AtivosPage (abas + banner demo), PortfolioSummary
                       (KPIs), PortfolioEvolutionChart e AllocationDonut
                       (recharts), PositionsTable, AssetCatalog
    perfil/            PerfilPage (sidebar + badges + banners),
                       PerfilContext (perfil de investidor, em memória),
                       PersonalDataSection + AvatarUpload,
                       CompaniesSection, InvestorProfileSection +
                       InvestorProfileQuiz + InvestorProfileResultCard,
                       WalletSection (usa components/web3, ver abaixo),
                       FormField (TextField/SelectField/TextareaField/
                       ReadField compartilhados)
    web3/              ConnectWallet + ConnectionPanel — conexão real de
                       carteira (MetaMask/Sepolia) usada por WalletSection,
                       adaptados do niara-site (ver "Tela /perfil", seção
                       "4. Carteira")
    documentacao/      DocumentacaoPage (sidebar por seções + banner de
                       estágio atual), DocumentacaoNav, FaqAccordion
    contato/           ContatoPage (formulário + painel de contato
                       direto), ContatoForm (envio via mailto)
    negociar/          HubPage, CategoryPage (template das 5 categorias),
                       CategoryChip (CategoryChip + CategoryBadge),
                       CategoryCard, ShowcaseCard, OfertaDetailPage,
                       FinanceiroChart (recharts), FundamentalIndicators
                       + IndicatorHelp (indicadores fundamentalistas +
                       popover "?"), OrderTicket (boleta simulada) —
                       ver "Telas /negociar" abaixo
    entrar/            EntrarPage (overlay tela cheia, split + form),
                       VideoCover (capa do vídeo do YouTube) — ver
                       "Tela /entrar" acima
    hero/              hero (headline, CTAs), HeroParallaxLayers (glow +
                       motivo do planeta anelado, decorativos)
    nav/               header, dropdowns, menu mobile
    scroll/            LenisProvider (smooth scroll + sync com ScrollTrigger)
    sections/          narrativa por scroll (home), inclui pin de "Como funciona"
    ui/                compartilhados (Logo, botões etc.)
  lib/
    ativos/derive.ts   funções puras de derivação (totais, alocação por
                       classe/ativo/setor) a partir do mock de /ativos
    categories.ts      CATEGORY_META: ícone + tokens de cor + href por
                       categoria de token, usado nas telas /negociar
    format.ts          formatBRL/formatSignedBRL/formatPercent (Intl pt-BR)
    investor-profile.ts lógica pura de score/categorização do perfil de
                       investidor (conteúdo do questionário vem do
                       dicionário i18n, ver abaixo)
    masks.ts           máscaras e validações de formato (CPF/CNPJ/CEP/
                       telefone/data) da tela /perfil — validação só de
                       formato/comprimento, sem dígito verificador
    web3/config.ts     config wagmi (chain Sepolia, connector injected) da
                       conexão real de carteira — ver "Tela /perfil"
    i18n/              dicionário de textos (pt-br.ts)
    mock/ativos.ts     dados fictícios tipados da tela /ativos (posições,
                       evolução mensal, catálogo) — nunca dado real
    mock/ofertas.ts    categorias + 10 ofertas fictícias tipadas das telas
                       /negociar (dados públicos, financeiro, indicadores
                       fundamentalistas, termos, documentos) — nunca
                       dado real
    nav-items.ts        itens de navegação compartilhados (Header/Footer)
public/
  niara-pme-logo.png   logo oficial (globo + anel + "NIARA", PNG com fundo
                       transparente, preto — só funciona sobre fundo claro)
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
  `LOGO_SRC` em `src/components/ui/Logo.tsx`), apontando para a arte oficial
  `public/niara-pme-logo.png` (globo + anel + "NIARA", preto sobre fundo
  transparente — só a arte, sem "PMEs" embutido). O descritor "PMEs" é
  renderizado como texto real ao lado da imagem (`· PMEs`, `font-display`,
  `text-ink-muted`), não parte do arquivo, porque a arte não o inclui e ele
  segue necessário para diferenciar do produto da exchange (`niara-site`).
  Preta, funciona apenas sobre fundo **claro** (Header, Footer) — se for
  usada sobre fundo escuro (`bg-military`, seções cheias) no futuro, precisa
  de uma versão clara própria; não reutilizar a mesma arte lá.

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

Homepage (`src/app/page.tsx`), nesta ordem: Hero (**military cheio**, texto
claro — texto centrado + motivo decorativo do planeta anelado/glow, sem
astronauta — ver "Astronauta (removido)") → Benefícios da tokenização
(**salmon cheio**, texto escuro)
→ Como funciona (sequência pinned, fundo neutro `bg-surface-alt`,
inalterado) → Quando posso usar a Tokenização? (**military cheio**, texto
claro) → Conheça os Tokens (**salmon cheio**, cards linkam para as
rotas de categoria de `/negociar`, ver "Telas /negociar" acima) → Para
empresas × investidores (**salmon
cheio** — não verde: ficaria verde→[aviso neutro]→verde colado na faixa
CTA verde logo depois; salmon aqui mantém a alternância de ritmo) →
Aviso de demonstração/CVM (`bg-surface-alt`, neutro) → Faixa CTA final
(military cheio, texto claro — já era assim antes da Parte 6) → Footer.
Ver "Fundos cheios de seção + regra de contraste" acima para os tokens de
texto (`on-military`/`on-salmon`/`on-salmon-muted`) usados em cada uma.

Nas seções "Benefícios da tokenização" (3 cards) e "Quando posso usar a
Tokenização?" (4 cards), os cards usam `SectionCard` com `h-full` dentro
de um grid `items-stretch` — garante largura e altura idênticas entre os
cards de uma mesma linha, independente do tamanho do texto de cada um.

Scroll suave via Lenis sincronizado ao GSAP ScrollTrigger. Header +
navegação, `/styleguide`. Todas as rotas do nav respondem sem 404 — nenhuma
é mais `StubPage` (ver "Pendências conhecidas" abaixo). Testado com `tsc`,
`eslint`, `build` e verificação visual via Playwright (desktop, mobile,
teclado, reduced-motion) a cada parte.

As 5 partes do redesign (paleta E, astronauta 2D, Lenis + pin, seções de
conteúdo aprovado, créditos) estão completas. O astronauta foi removido
depois (ver seção própria) e o hero rebalanceado. A seção "Créditos"
(placeholder "Equipe Niara" + áreas genéricas) também foi removida por
completo depois — não fazia falta antes do site ter colaboradores reais a
creditar.

## Pendências conhecidas

- Logo final (`public/niara-pme-logo.png`, globo + anel + "NIARA", preto
  sobre fundo transparente) já integrada no Header e Footer via `<Logo />`.
  Funciona só sobre fundo **claro** — ainda falta uma versão clara da arte
  para uso sobre fundo escuro (`bg-military`/seções cheias), caso a logo
  precise aparecer ali no futuro.
- Revisão jurídica pendente do texto das seções "Benefícios da
  tokenização" (Vantagem Tributária, Crédito mais Barato e Justo/
  Peer-to-Peer) e "Quando posso usar a Tokenização?" (Antecipação do
  Caixa) — textos aprovados para exibição, mas ainda não validados
  juridicamente. Não alterar nem expandir esses textos sem instrução.
- Envio real de formulário de contato (hoje via `mailto`, sem backend),
  autenticação, backend — fora de escopo por ora
- Conexão de carteira (`/perfil`, ver "4. Carteira" acima) é real, mas só
  leitura (endereço/rede/saldo nativo em Sepolia) — sem assinatura de
  transação, sem leitura de token ERC-20 (a Niara PMEs não tem contrato
  próprio implantado, diferente do `niara-site`, que lê mUSDT/outros
  tokens de teste reais). `NEXT_PUBLIC_SEPOLIA_RPC_URL` é opcional (cai no
  RPC público padrão do `wagmi/chains` se ausente) — não commitar em
  `.env*` se for definida localmente.
- Nenhuma rota do site continua como `StubPage` — `/ativos`, `/perfil`,
  as duas rotas de `/sobre/*` e as 6 rotas de `/negociar/*` (hub + 5
  categorias + detalhe da oferta) já têm conteúdo real de demonstração
  (ver as respectivas seções acima). `StubPage.tsx` foi removido do
  projeto por ficar sem uso — não recriá-lo para novas rotas sem
  alinhar antes com o usuário.
- Revisão jurídica pendente do enquadramento regulatório citado nas
  telas `/negociar` (Resolução CVM 88, riscos estilo CVM) e da boleta
  simulada em si — nenhuma ordem real é enviada hoje, mas o texto de
  enquadramento segue a mesma ressalva já registrada para
  `/sobre/documentos` (ver "Telas /negociar" acima).
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
