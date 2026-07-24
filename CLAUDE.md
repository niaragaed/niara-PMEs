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
- 3D: `three` + `@react-three/fiber` + `@react-three/drei` (astronauta do
  hero)
- Animação de scroll/reveal: `framer-motion`
- Ícones: `lucide-react`
- Estado: React (`useState`, Context). Sem libs de estado externas.

---

## Design system

Use **somente** tokens do `@theme` (`src/app/globals.css`). Nunca cores
hardcoded nos componentes.

Tema **claro** (diferente do `niara-site`, que é escuro):

**Base / neutros:** `bg` #FAF8F3 · `surface` #FFFFFF · `surface-alt` #F1EEE6
· `border` #E4DFD3 · `ink` #1B1E17 (texto principal) · `ink-muted` #5A5F52
(texto secundário)

**Verde militar (primária):** `military` #4B5320 · `military-600` #5C6528
(hover) · `military-100` #E9ECDD (tint)

**Salmão (acento / CTA):** `salmon` #F2907A · `salmon-600` #E67C63 (hover) ·
`salmon-100` #FBE3DC (tint)

**Tipografia:** Space Grotesk (`--font-display`, títulos) · Inter
(`--font-sans`, corpo)

**Raio:** sm 8px · md 12px · lg 20px · full (generoso, estética arejada)

**Sombras:** `shadow-soft` / `shadow-soft-lg` — suaves, para cards e
elementos elevados sobre fundo claro.

Referência visual viva: `/styleguide` (a partir da Parte 5).

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

## Astronauta 3D (hero)

- Componente cliente isolado (`'use client'`), importado via `next/dynamic`
  com `ssr: false` e envolto em `<Suspense>` — WebGL não roda em SSR.
- Modelo trocável: `ASTRONAUT_MODEL_URL = "/models/astronaut.glb"`. Enquanto
  esse arquivo não existir em `public/models/`, o componente renderiza um
  astronauta **procedural** (primitivas: capacete esférico claro, corpo em
  cápsula/cilindro, viseira escura) com a mesma lógica de tracking do
  cursor. Basta dropar o `.glb` depois — não usar `useGLTF` de forma que
  quebre o build na ausência do arquivo.
- Tracking do cursor com damping (`THREE.MathUtils.damp`/lerp), nunca
  movimento seco. Idle bob sutil via `Math.sin(clock.elapsedTime)`.
- Respeitar `prefers-reduced-motion` (desliga tracking/idle, mostra pose
  estática) e pausar o render loop fora da viewport (IntersectionObserver).

---

## Organização

```
src/
  app/                 rotas (App Router)
  components/
    hero/              astronauta 3D, hero
    nav/               header, dropdowns, menu mobile
    sections/          narrativa por scroll (home)
    ui/                compartilhados (Logo, botões etc.)
  lib/
    i18n/              dicionário de textos (pt-br.ts)
    nav-items.ts        itens de navegação compartilhados (Header/Footer)
public/
  models/              astronaut.glb (opcional, ver seção acima)
  niara-pme-logo.png   logo (placeholder até a arte final)
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
- **Logo:** componente `<Logo />` (`next/image` apontando para
  `public/niara-pme-logo.png`). Arte final é preta sobre PNG transparente —
  ainda não disponível; placeholder é substituível sem mudar o componente.

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

## Pendências conhecidas

- Header, navegação e stubs de rota (Parte 2)
- Hero com astronauta 3D (Parte 3)
- Narrativa por scroll + footer (Parte 4)
- Styleguide + ajustes de responsividade/acessibilidade (Parte 5)
- Logo final (PNG/SVG preto transparente) — substituir
  `public/niara-pme-logo.png`
- Modelo 3D final do astronauta (`public/models/astronaut.glb`) — opcional,
  há placeholder procedural
- Formulário de contato real, autenticação, backend — fora de escopo por
  ora
