# CLAUDE.md — niara-PMEs

Instruções permanentes para o Claude Code neste repositório.
Leia este arquivo antes de escrever qualquer código.

---

## O projeto

**Niara PMEs** — plataforma que ajuda pequenas e médias empresas a estruturar
captação de investimento e dividir capital via tokenização (o "produto de
receita" do grupo Niara; a exchange global — repositório irmão `niara-site`
— é a "visão" de longo prazo).

**Estágio atual: site institucional com backend real (Supabase) para o
ciclo de captação, mais protótipo de interface para o resto.** Desde a
fundação do backend (ver "Backend (Supabase)" abaixo), cadastro de conta
(`/cadastro`), login (`/entrar`), dados de perfil, cadastro/publicação de
oferta pelo emissor (`/empresa/ofertas`) e reserva/pagamento de aporte
pelo investidor (`/investir`) **gravam de verdade** num Postgres, com as
invariantes da Res. CVM 88 impostas no próprio banco (teto anual do
investidor, hard cap da oferta, gate de KYC, fechamento all-or-nothing) —
não é mais só UI. Ainda assim, nada disso é uma operação regulatória real:
a Niara PMEs não é uma plataforma autorizada pela CVM, o pagamento
(escrow) e a emissão de token são **mocks explícitos** (todo ref grava
prefixado `MOCK-`), e o "KYC (demonstração)" é um botão que sempre aprova
— ver "Backend (Supabase)" para o mapa completo do que é real vs.
simulado. A carteira MetaMask (rede Sepolia/testnet) na seção Carteira de
`/perfil` continua sendo a única conexão real com blockchain — ver "Tela
`/perfil`" abaixo — e agora também pode ser **vinculada** (persistida) à
conta no banco. O restante das telas de exploração (`/ativos`, boleta
simulada de `/negociar`, indicadores fundamentalistas etc.) segue 100%
demonstração/mock, sem nenhuma transação real.

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
  `localStorage`/`sessionStorage`/cookies (client-side) — vale para
  qualquer estado de UI puramente local. Isso não significa que esses
  dados nunca são persistidos: desde o backend Supabase (ver "Backend
  (Supabase)" abaixo), CPF/CNPJ, data de nascimento, telefone e endereço
  do fluxo real de cadastro/perfil **são** gravados de verdade num
  Postgres, só que sempre via Server Action no servidor, nunca por um
  `fetch` direto do navegador nem por storage do browser. São dados
  fictícios de demonstração por ora, mas já tratados como PII real de
  verdade quanto a onde e como trafegam.
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
- Backend real: `@supabase/supabase-js` v2 + `@supabase/ssr` v0.12
  (Postgres + Auth + Storage) e `zod` v4 para validação de formato nos
  Server Actions — as regras de negócio de verdade ficam travadas no
  banco. Ver "Backend (Supabase)" abaixo.

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

## Backend (Supabase)

Fundação adicionada em 6 commits (`chore: fundação backend` até
`feat(oferta): ...`) — Postgres + Auth + Storage via Supabase, seguindo
ports & adapters: UI e Server Actions nunca decidem sozinhos uma regra de
negócio da Res. CVM 88, só chamam o banco e traduzem o erro que ele
levantar. Nenhuma dessas partes faz da Niara PMEs uma plataforma
autorizada pela CVM — disclaimer explícito em
`supabase/migrations/0001_core.sql:3-8`.

### Clients e variáveis de ambiente

Três clients em `src/lib/supabase/`, cada um com um escopo de acesso
diferente:
- `client.ts` — browser (`createBrowserClient`), chave anônima, respeita RLS.
- `server.ts` — Server Components/Actions (`createServerClient`), chave
  anônima + cookies da requisição, respeita RLS.
- `admin.ts` — 🔴 usa `SUPABASE_SERVICE_ROLE_KEY`, **ignora RLS por
  completo**. Protegido por `import "server-only"` no topo — importar num
  client component quebra o build. É o client usado por quase todo Server
  Action de negócio (as tabelas de domínio têm RLS default-deny, ver
  abaixo, então o controle de acesso é feito no código da action via
  `resolveAccount()`, não numa policy).

`src/proxy.ts` — em Next.js 16 `middleware.ts` virou `proxy.ts`. Só
revalida a sessão a cada navegação via `supabase.auth.getUser()` (não
`getSession()`: `getUser()` revalida contra o servidor Supabase,
`getSession()` só lê o cookie sem garantia nenhuma). Nenhuma regra de
negócio mora aqui.

Variáveis de ambiente (`.env.example`, nunca commitar valores reais):
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas,
RLS protege), `SUPABASE_SERVICE_ROLE_KEY` (secreta, bypassa RLS),
`DATABASE_URL` / `DIRECT_URL` (Postgres via pooler), `NIARA_ENV=demo`
(marca `is_demo=true` nas linhas gravadas), `NIARA_PAYMENT_ADAPTER` /
`NIARA_KYC_ADAPTER` / `NIARA_CHAIN_ADAPTER` (hoje só existe `"mock"` — ver
"Ports & adapters" abaixo). `NEXT_PUBLIC_SEPOLIA_RPC_URL` (opcional, da
conexão wagmi — ver "Tela `/perfil`") é anterior a este backend e
independente dele.

### Ports & adapters — pagamento, KYC e emissão on-chain são mocks

`src/lib/ports.ts` define interfaces puras (`PaymentGateway`,
`KycProvider`, `ChainRegistry`); `src/lib/adapters.ts` escolhe a
implementação pela env var correspondente, **caindo em mock por padrão**
se a var estiver ausente ou tiver valor desconhecido — nunca cai
silenciosamente numa implementação real por engano. Hoje só existe
implementação mock (`src/lib/mocks.ts`), com disclaimer explícito: nada
ali move dinheiro real, verifica identidade de verdade ou emite token
on-chain de verdade. Todo ref gerado começa com `"MOCK-"` (`mockRef()`,
ex. `MOCK-ESCROW-<uuid>`, `MOCK-KYC-<uuid>`, `MOCK-TX-<uuid>`) — **nunca
apresentar um ref `MOCK-*` na UI como se fosse uma operação real.**
`mockKycProvider.submit` sempre retorna `status: "approved"` (ver "Gate de
KYC" abaixo).

### Schema e invariantes da Res. CVM 88 (`supabase/migrations/`)

Dinheiro é sempre `bigint` em centavos, nunca float (`0001_core.sql:10`).
Concorrência é tratada com `SELECT ... FOR UPDATE` na linha pai (oferta ou
investidor) antes de somar, nunca em JS.

- **`0001_core.sql`** — tabelas `issuers`, `offerings`, `investors`,
  `investments`, `payment_events`, com **RLS default-deny em todas** (sem
  nenhuma policy — acesso é 100% via client `admin` no servidor). Regras
  travadas por trigger, todas levantando `SQLSTATE 23514` (o código que os
  `translate*DbError()` do app casam):
  - `issuer_is_sep`: faturamento do emissor ≤ R$40M (teto SEP).
  - `cap_le_15m`: hard cap da oferta ≤ R$15M.
  - `additional_lot`: lote adicional ≤ 25% do cap base.
  - `window_le_180d`: janela de captação ≤ 180 dias.
  - `enforce_investor_annual_limit` — **teto anual do investidor** (padrão
    R$20 mil/ano; `NULL` = investidor qualificado, sem teto). 🔴 Soma só o
    que passou pela Niara — a regra real da Res. 88 é entre-plataformas
    (soma em todas as plataformas CVM ao mesmo tempo, proposta SDM
    05/2025 ainda não em vigor); é uma aproximação deliberada, não
    compliance completo — não tratar como se fosse.
  - `enforce_offering_hard_cap` — bloqueia reserva que estouraria o hard
    cap da oferta.
  - `enforce_investment_transition` — só permite transições legais de
    status (`reserved→{paid,cancelled}`, `paid→{settled,refunded}`) e é o
    **gate de KYC**: `reserved→paid` exige
    `investors.kyc_status = 'approved'`.
- **`0002_settlement.sql`** — `settle_offering()` (fecha a janela: se
  arrecadado ≥ meta mínima → `funded` + cancela reservas não pagas; senão
  → `failed` + estorna pagas) e `mark_offering_settled()` (chamada pelo
  app **depois** de emitir os tokens mock, marca `settled`) —
  **fechamento all-or-nothing** em duas etapas de estado puro no banco;
  efeitos externos (emissão do token) ficam por conta do app entre uma
  chamada e outra.
- **`0003`/`0004`** — ligam `investors.user_id`/`issuers.user_id` a
  `auth.users`, `unique` + nullable + `on delete set null` (apagar o login
  não apaga o histórico financeiro, só desvincula).
- **`0005_confirm_investment.sql`** — RPC `confirm_investment()`,
  transição atômica `reserved→paid`, idempotente duas vezes (por status
  **e** por `idempotency_key` em `payment_events`). Se o gate de KYC do
  0001 disparar no meio, a função inteira dá rollback — inclusive o
  `payment_events` já inserido na mesma transação.
- **`0006`/`0007`** — telefone/endereço/`wallet_address` em `investors` e
  `issuers` (nullable), depois `unique` em `wallet_address` por tabela. 🔴
  Gap documentado: a unicidade é *por tabela* — a mesma wallet num
  investidor e num emissor ao mesmo tempo não é bloqueada; aceito por ora.
- **`0008`/`0009`/`0010`** — `share_price_cents` (nº de cotas nunca é
  coluna, sempre derivado de `base_cap_cents / share_price_cents`),
  `sector`/`business_summary` públicos, `category`, `publish_cnpj`
  (opt-in — CNPJ some do banco na leitura pública quando `false`, não só
  da UI) e `logo_path` (arquivo mora no Storage, só o path é coluna).

### Autenticação (`src/lib/auth/resolveInvestor.ts`)

`resolveAccount()` é a fonte única de verdade de "quem está logado e
como": lê o usuário via `getUser()`, depois checa (client `admin`, porque
ainda não existe policy de self-read) se existe uma linha em
`investors.user_id` ou `issuers.user_id`. Retorna `{ userId,
role: 'investor'|'issuer'|null, accountId }` — **uma conta é investidor OU
emissor, nunca as duas** (a checagem é sequencial, quem casar primeiro
ganha). `accountId` é o id da linha de domínio (`investors.id`/
`issuers.id`) — nunca comparar entre roles; só `userId` (o id do login) é
comparável entre elas. Todo Server Action de negócio chama
`resolveAccount()` e nunca aceita `investor_id`/`issuer_id` vindo do
cliente.

`/entrar` ficou **só login** (`signInWithPassword`); criação de conta
migrou inteira para `/cadastro` (ver seção própria abaixo). Ao concluir o
cadastro, o app redireciona para `/conta?onboarding=1` — flag que abre o
quiz de perfil de investidor automaticamente na primeira visita a
`/perfil` (ver "Tela `/perfil`", seção "3. Perfil de investidor"). `/conta`
hoje é só um shim de redirect para `/perfil` (preserva `?aviso=`/
`?onboarding=`), mantido para não quebrar links antigos.

### Gate de KYC — o que "KYC (demonstração)" quer dizer aqui

Não existe verificação de identidade real em lugar nenhum. `kyc_status`
(`pending|approved|rejected`, default `pending`) só muda quando o
investidor clica "Fazer KYC (demonstração)" em `/investir`
(`submitKyc()`, `src/app/investir/kyc-actions.ts`) — isso chama o adapter
mock, que **sempre** retorna `approved`, e a action grava exatamente o
status que o adapter devolveu (não hardcoda `'approved'`, para trocar de
adapter no futuro sem mudar esse código). Esse botão só aparece depois de
uma tentativa de confirmar pagamento falhar com `kycRequired: true`.

🔴 **Isso é diferente do banner "Não verificado" fixo em `/perfil`**
(`PerfilPage.tsx`) — esse banner é estático, não lê `investors.kyc_status`
em nenhum momento. É possível um investidor ter `kyc_status='approved'`
de verdade no banco (por já ter confirmado um pagamento em `/investir`) e
`/perfil` continuar mostrando "Não verificado" — inconsistência
conhecida, não tratada nesta rodada; quem for mexer num dos dois lados
precisa decidir se liga o banner ao dado real ou documenta a diferença de
propósito entre eles.

### Ciclo de captação — investidor (`/investir`) e emissor (`/empresa/ofertas`)

Investidor: lista ofertas ativas (`loadActiveOfferingsByCategory`/
`loadPublicOffering`, em `src/lib/investments.ts` e
`src/app/investir/actions.ts`) → `reserveInvestment()` grava
`investments` com `status='reserved'` (o banco decide teto/hard
cap/janela; a action só traduz o erro) → `confirmInvestment()` chama o
adapter de pagamento mock e a RPC `confirm_investment` (`reserved→paid`,
gate de KYC) → o dono da oferta chama `closeOffering()` quando a janela
fecha, que roda `settle_offering`, emite token mock por aporte pago
(idempotente via `payment_events`) e por fim `mark_offering_settled`. Ver
"Tela `/investir`" e "Tela `/empresa/ofertas`" abaixo para a UI de cada
lado.

🔴 **REGRA DE OURO das leituras**: `loadActiveOfferingsByCategory` e
`loadPublicOffering` usam sempre uma lista branca explícita de colunas,
**nunca `select('*')`** — CNPJ, telefone, endereço completo, faturamento e
wallet nunca saem do banco nessas leituras (não é só "escondido no JSX";
o campo nem é buscado, então nunca aparece no HTML renderizado no
servidor / view-source). Aplicar o mesmo padrão em qualquer leitura nova
que exponha dado de oferta/emissor.

Emissor: `createOffering()` grava sempre em `status='draft'`;
`activateOffering()` é a única transição `draft→active` — como
`offerings` não tem trigger de transição (diferente de `investments`), a
proteção contra duplo clique/corrida é um `UPDATE ... WHERE id=? AND
issuer_id=? AND status='draft'` atômico no próprio Server Action, não o
banco. `hardCapCents` é sempre calculado como `base + floor(base *
lote% / 100)` — a faixa validada de lote (0–25%) é escolhida
matematicamente para nunca poder violar o CHECK `additional_lot` do
banco.

🔴 **Acoplamento frágil, atenção ao mexer em qualquer migration**: todo
`translate*DbError()` (em `cadastro/actions.ts`, `investir/actions.ts`,
`empresa/ofertas/actions.ts`, `perfil/actions.ts`) casa `error.code`
(`23514`/`23505`) **mais uma substring do texto do erro** (nome da
constraint ou mensagem de `RAISE EXCEPTION`) — não um código estável.
Renomear uma constraint CHECK ou editar uma mensagem de `RAISE EXCEPTION`
numa migration quebra silenciosamente esse casamento (cai no fallback
genérico "Não foi possível...", sem erro de compilação). Ao tocar numa
migration, dar `grep` no nome da constraint dentro de `src/app/**/
actions.ts` antes.

### Carteira vinculada ao banco (além da conexão MetaMask real)

`0006`/`0007` adicionam `wallet_address` (nullable, único por tabela) a
`investors`/`issuers`. `saveWallet()`/`unlinkWallet()`
(`src/app/perfil/actions.ts`) persistem o endereço atualmente conectado
via wagmi — a conexão MetaMask em si continua real e client-side,
inalterada (ver "Tela `/perfil`", seção "4. Carteira"); o que é novo é só
a camada de persistência. `WalletSection.tsx` compara o endereço conectado
no wagmi contra o `walletAddress` vindo do banco e mostra
Vincular/Trocar/Desvincular conforme o caso. Erro de unicidade (`23505`)
é traduzido para "Esta carteira já está vinculada a outra conta."

### Seed de demonstração (`scripts/seed-demo.ts`)

`npm run seed:demo` cria uma conta emissor + uma oferta ativa + uma conta
investidor prontas para logar (credenciais impressas no terminal ao
final), pensado para não precisar digitar cadastro ao vivo num pitch.
Roda fora do Next via `tsx` (novo devDependency, resolve os path aliases
`@/...` do `tsconfig.json` sozinho) porque os Server Actions reais
assumem uma requisição HTTP autenticada (`resolveAccount()` via cookies),
que não existe rodando um script solto — o script cria os usuários de
auth direto pelo admin API do Supabase e grava as linhas de domínio via
um client admin local ao script.

🔴 **Não reaproveita `createAdminClient()` de `src/lib/supabase/admin.ts`**
— tentativa inicial que quebrou na prática: `import "server-only"` lança
incondicionalmente sob Node puro (`throw` direto em
`node_modules/server-only/index.js`), não só quando bundlado para
browser como o comentário do próprio módulo sugere — o no-op só existe
via campo `"browser"` do `package.json` do pacote, que só bundlers
(webpack/turbopack) honram, não a resolução de módulo padrão do Node
usada por `tsx`. O script duplica as mesmas duas linhas de construção do
client em vez de importar o módulo guardado.

Idempotente **por conta** (lookup por `user_id` antes de criar — rodar de
novo não duplica nem troca credenciais), **não por oferta** (cada
execução cria uma oferta ativa nova, mesmo que a anterior já tenha sido
fechada num ensaio — não existe hoje um jeito de "resetar" uma oferta que
já mudou de estado sem mexer no histórico de aportes). Investidor demo
nasce `kyc_status='pending'` (não pré-aprovado) e sem teto anual
(`annual_limit_cents=null`) de propósito — deixa o gate de KYC disponível
para ser demonstrado ao vivo, sem risco de um valor redondo de
demonstração esbarrar no teto de varejo de R$20 mil/ano no meio do pitch.
Exige `NIARA_ENV=demo` (recusa rodar sem isso) e marca `is_demo: true` em
toda linha criada, mesmo padrão do resto do app.

### Upload de logo do emissor (`src/lib/storage/issuer-logo.ts`)

Real (Supabase Storage, bucket público `issuer-logos`,
`${accountId}/logo.<ext>`) — diferente do `AvatarUpload.tsx` da seção
"Dados de cadastro" (que continua 100% local/simulado, nunca enviado — ver
"Tela `/perfil`"). Validação de MIME/tamanho (2MB) roda no servidor, não
só no cliente. 🔴 Trocar a extensão entre uploads (png→jpg) deixa o
arquivo antigo órfão no bucket a menos que seja removido explicitamente —
o código já trata isso, mas é um detalhe fácil de reintroduzir como bug
(bucket é um domínio de falha separado da linha no banco). A URL pública
usa `?v=<versão>` para cache-busting, lida do `updated_at` do próprio
objeto no Storage (não existe `updated_at` em `issuers`) — sem isso,
sobrescrever o mesmo path manteria a imagem antiga em cache no
navegador/CDN.

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

## Tela `/perfil` (dados de cadastro, minhas ofertas, perfil de investidor, carteira)

Substituiu o stub antigo ("Perfil — em construção"). Inspirada na página
Profile do `niara-site` (repositório irmão) — mesma estrutura de sidebar +
seções e mesma lógica de questionário de perfil de investidor (porém
traduzida e com conteúdo próprio) — adaptada ao tema verde-sálvia cheio
(`bg-military`, igual à tela `/ativos`, não o dashboard escuro do
`niara-site`). Ver `PerfilPage.tsx` (orquestrador) e os componentes em
`src/components/perfil/`.

🔴 **Diferente da versão original desta tela**: os dados de cadastro e a
seção de ofertas hoje leem/gravam no banco de verdade (ver "Backend
(Supabase)" acima) — não são mais um formulário 100% em memória. Só o
resultado do questionário de perfil de investidor (seção 3) e o avatar
(dentro da seção 1) continuam simulados/locais, ver cada um abaixo. O
conceito antigo de "conta única com CPF **ou** CNPJ, mais empresas
cadastradas à parte com finalidade investidora/tokenizada" também não
existe mais: desde o backend real, uma **conta** já nasce como investidor
(PF) OU emissor (PJ) na hora do `/cadastro` — nunca as duas — e é
`profile.role` (vindo de `resolveAccount()`) que decide o que a tela
mostra, não mais um toggle manual dentro do perfil.

**Estrutura da página** (`PerfilPage.tsx`, `"use client"` por causa do
estado do contexto de perfil de investidor):

- Banner de demonstração fixo no topo (mesmo padrão do banner de `/ativos`)
- Faixa de aviso de KYC (`bg-panel`): "Não verificado" + texto explicando
  que a verificação de identidade completa será exigida quando o produto
  entrar no ar. 🔴 Este banner é **estático** — não lê `investors.kyc_status`
  do banco; ver "Backend (Supabase)" → "Gate de KYC" para a aprovação
  real (via `/investir`) que ele não reflete.
- Badges de status (`ShieldAlert` "Não verificado" — mesmo banner estático
  acima — + `TrendingUp` "Perfil: {categoria atual}")
- Sidebar de navegação por âncora (`PerfilNav.tsx` — sticky no desktop,
  abas horizontais roláveis no mobile, mesmo padrão do `ProfileNav` do
  `niara-site`) + seções empilhadas, nesta ordem: **Dados de cadastro** →
  **Minhas ofertas** (só para `role==='issuer'`) → **Perfil de
  investidor** → **Carteira**.

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

O tipo de pessoa (`TipoPessoa`, `"pf"`/`"pj"`) não é mais um toggle
manual — vem fixo de `profile.role` (investor→pf, issuer→pj) e decide os
campos exclusivos (Nome completo + Data de nascimento para PF; Razão
social + Nome fantasia + Faturamento anual + Setor + Resumo do negócio +
opt-in "Publicar CNPJ" para PJ) e a máscara de documento
(`maskDocumento`/`isValidDocumento`, `src/lib/masks.ts`). Campos
compartilhados (documento, telefone com prefixo fixo "+55" só na exibição,
endereço via CEP) completam o formulário. `updateProfile()`
(`src/app/perfil/actions.ts`) grava tudo isso de verdade no Postgres — ver
"Backend (Supabase)" acima. Para emissores, `LogoUpload.tsx` fica
embutido nesta seção e faz upload real para o Supabase Storage (ver
"Upload de logo do emissor" no Backend acima) — **diferente** de
`AvatarUpload.tsx` (foto de perfil, PF **e** PJ), que segue 100%
local/simulado: object URL via `URL.createObjectURL`, revogado no cleanup
do `useEffect` e ao trocar de imagem, **nunca enviado**.

🔴 **LGPD**: nesta fase os dados gravados (nome/CPF-CNPJ/data de
nascimento/telefone/endereço/setor/resumo do negócio) são fictícios de
demonstração, mas já são **PII persistida de verdade** num Postgres — não
mais só estado React efêmero como antes deste backend. Continua valendo a
regra de nunca persistir nada disso em `localStorage`/`sessionStorage`
(client-side) — a persistência acontece só no servidor, via Server
Action, nunca no navegador. Se algum dia os dados deixarem de ser
fictícios, a responsabilidade de LGPD passa a ser sobre o banco Supabase,
não mais uma garantia "nada sai do navegador".

### 2. Minhas ofertas (`MyOffersSection.tsx`, só para `role==='issuer'`)

Substituiu a antiga seção "Empresas"/"Minhas empresas" (cadastro de
empresa com escolha de finalidade dentro do perfil não existe mais — ver
nota 🔴 no topo desta tela). Painel **só de leitura**: lista as ofertas
reais do emissor logado (`loadMyOfferingsSummary()`, filtrado por
`accountId` no servidor — nunca `select('*')`) com valor do cap, status
(rótulos em `ptBr.empresaOfertas.status`) e meta mínima; botão "Gerenciar
ofertas" linka para `/empresa/ofertas`, onde criação/ativação/fechamento
acontecem de fato (ver seção própria abaixo). Estado vazio quando o
emissor ainda não tem nenhuma oferta.

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
que o resto da tela de perfil já promete — **esta é a única parte da
tela de perfil que continua assim** mesmo depois do backend real (ver nota
🔴 no topo desta tela): as outras seções passaram a persistir, esta não,
de propósito.

A seção recebe `abrirAutomaticamente` (de `PerfilPage.tsx`, vindo de
`abrirTesteInvestidor`) — `true` só na primeira visita a `/perfil` logo
após criar conta em `/cadastro` (via `?onboarding=1`, ver "Backend
(Supabase)" → "Autenticação"). Nesse caso o quiz abre direto, pulando o
card de resultado padrão, e a URL é limpa via
`window.history.replaceState` logo em seguida — sem isso, um F5 na mesma
URL reabriria o quiz do zero, já que a prop é recalculada a cada mount.

A escala Conservador–Moderado–Arrojado é uma barra de gradiente
(`aria-hidden`, decorativa) com um indicador na posição do escore — a
alternativa acessível são os três rótulos de texto acima da barra (não a
barra em si), mesmo padrão de acessibilidade do donut de `/ativos` (SVG
decorativo + lista/texto real ao lado). Blocos "O que este perfil
significa"/"Reação a risco e volatilidade"/"Classes de ativos mais
adequadas" e o disclaimer ("resultado ilustrativo, não constitui
recomendação...") vêm de `ptBr.perfil.investidor.categoryDetails`.

### 4. Carteira (`WalletSection.tsx`)

🔴 **Conexão real** — lê endereço, rede e saldo de teste de uma carteira
MetaMask de verdade via EIP-1193 (`window.ethereum`); nenhuma transação é
enviada e nenhuma chave privada é tocada pelo app (fica inteiramente a
cargo do MetaMask). A conexão em si é sempre client-side, direto entre o
navegador e o MetaMask — isso não mudou. O que mudou com o backend real
(ver "Backend (Supabase)" → "Carteira vinculada ao banco" acima): o
endereço conectado agora pode ser **salvo** (persistido em
`investors.wallet_address`/`issuers.wallet_address`) via
`saveWallet()`/`unlinkWallet()`, que são Server Actions de verdade — a
frase antiga "nada é enviado a servidor" só vale para a conexão MetaMask
propriamente dita, não mais para o botão de vincular. Reaproveita a mesma
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
`/perfil`, `/negociar` — não o painel claro estilo Ondo, para manter o
mesmo tema visual das demais telas internas mesmo sem reaproveitar
componente nenhum de web3 aqui).

🔴 **Desde o backend Supabase, esta tela ficou só login de verdade —
deixou de ter os campos decorativos/desabilitados que tinha antes.**
`handleEntrar()` chama `supabase.auth.signInWithPassword({ email,
password: senha })` de verdade; o único erro mapeado de
`mapAuthError()` é `invalid_credentials` (criação de conta não acontece
mais aqui, só em `/cadastro` — ver seção própria acima). Ao logar com
sucesso, `router.push("/perfil")` (que por sua vez redireciona sozinho
para `/cadastro` se a conta ainda não tiver dados de investidor/emissor,
cobrindo quem criou login mas não terminou o cadastro). Abaixo do botão
"Entrar", um link "Criar conta" leva para `/cadastro`, depois um divisor
"ou" e só então o botão "Continuar com Google" (`GoogleIcon` inline —
lucide-react não tem logos de marca) continua **desabilitado e rotulado
"(Em breve)"**, mesmo padrão visual do CTA do Hero — este é o único
elemento decorativo que sobrou nesta tela. Esta tela **não** oferece
conexão MetaMask; a única conexão de carteira real do site continua
sendo a seção Carteira de `/perfil` (ver "Tela `/perfil`", seção "4.
Carteira"), **intacta e sem relação com esta tela**.
- Nota de termos (`ptBr.entrar.termosNota`) menciona Termos de Uso e
  Política de Privacidade como "documentos em breve" — texto puro,
  **sem** links `href="#"` mortos, já que essas páginas ainda não
  existem.

**Honestidade e LGPD**: o formulário de email/senha grava de verdade
(via Supabase Auth, ver "Backend (Supabase)" acima) — só o botão Google
segue decorativo (`disabled`, não envia nem persiste nada). Quando
`intent=captacao`, o subtítulo (`ptBr.entrar.subtituloCaptacao`) já
deixa explícito que a estruturação da oferta em si continua demonstração
e depende das autorizações da CVM — sem mencionar carteira, já que esta
tela não a oferece.

**i18n**: `ptBr.entrar` em `src/lib/i18n/pt-br.ts`.

---

## Tela `/cadastro` (criação de conta)

Fluxo de 3 passos em `CadastroPage.tsx` (566 linhas): **conta** (email +
senha, `supabase.auth.signUp`) → **tipo** (investidor "pf" vs. empresa
"pj", escolha que fixa o `role` da conta para sempre — ver "Backend
(Supabase)" → "Autenticação") → **dados** (formulário completo por tipo,
submete para `createAccount()`). Erros de `signUp` tratados:
`user_already_exists`, `weak_password`; erros de banco (`23514`
`issuer_is_sep`, `23505` de `user_id` duplicado) traduzidos por
`translateDbError()` — `23505` aqui não é tratado como erro, é sinal de
"já tem conta", e a UI redireciona em vez de mostrar mensagem de falha.
`createAccount()` sempre lê `user.id` do lado do servidor, nunca confia
num id vindo do cliente. Ao concluir, redireciona para
`/conta?onboarding=1`, que abre automaticamente o quiz de perfil de
investidor na primeira visita a `/perfil` (ver "Tela `/perfil`", seção
"3. Perfil de investidor").

---

## Telas `/investir` (listagem + reserva) e `/investir/[offeringId]` (detalhe real)

Fluxo real de investimento — diferente de `/ativos` (que continua sendo o
dashboard de portfólio 100% mock, inalterado, ver "Tela `/ativos`" acima)
e diferente da boleta simulada de `/negociar` (que segue sem tocar em
banco nenhum, ver seção própria abaixo). Acesso restrito a
`role==='investor'` (redireciona para `/conta?aviso=apenas-investidor`),
com uma exceção: o emissor dono de uma oferta específica pode ver o
próprio `/investir/[offeringId]` (sem botão de reservar), via
`isOfferingOwner()`.

`InvestirPage.tsx`: cards de oferta ativa (linkam para o detalhe) +
"Minhas reservas" (aportes `reserved`/`paid` do investidor logado), com
botão "Confirmar pagamento" por reserva e, só quando a última tentativa
voltou com `kycRequired: true`, um botão inline "Fazer KYC
(demonstração)" — ver "Backend (Supabase)" → "Gate de KYC" acima.

`OfferingDetailPage.tsx`: dados públicos do emissor, termos (meta/hard
cap/arrecadado/valor por cota/cotas/janela), lista de documentos
placeholder (mesmos 7 itens "Em breve" de `/negociar`) e riscos estilo
CVM. `ReserveTicket` é o painel de reserva (sticky no desktop, bottom
sheet no mobile, mesmo padrão do `OrderTicket` da boleta simulada de
`/negociar`) — chama `reserveInvestment()` de verdade, não uma simulação.

`RealOfferCard.tsx` (usado dentro de `CategoryPage.tsx`, nas 5 categorias
de `/negociar`) mostra ofertas reais do banco lado a lado com o catálogo
fictício das mesmas categorias — badge sólido + anel salmão, visualmente
distinto do `ShowcaseCard` fictício, justamente para que uma oferta real
e uma fictícia nunca se confundam na mesma tela (aplicação direta da
regra "nada simulado pode parecer real" a essa superfície de dado real
convivendo com a demonstração antiga).

---

## Tela `/investir/onchain` (investimento real em Sepolia — blockchain de verdade)

Terceiro sistema de "investimento" da plataforma, distinto tanto de
`/ativos` (dashboard 100% mock) quanto de `/investir` (grava reserva/
pagamento *simulado* num Postgres real). Aqui não há Supabase nenhum:
carteira MetaMask conecta direto contra contratos reais implantados e
verificados em Sepolia (`niara-contracts-PMEs`, ver o `CLAUDE.md` daquele
repositório) — `aportar`, `encerrar`, `resgatarCotas` são transações de
verdade, assinadas pela carteira do usuário, confirmadas on-chain. A
única coisa "mock" aqui é o `MockBRL` (moeda de teste do escrow, sem
lastro) — a mecânica do contrato e o estado gravado são reais.

🔴 **Diferente de `/investir`, esta rota não exige login/conta na Niara
PMEs** — é dirigida inteiramente pela carteira conectada, decisão
deliberada para que qualquer pessoa consiga demonstrar o ciclo completo
sem precisar de cadastro.

**Descoberta**: `/investir/onchain` **não está no menu principal**
(`src/lib/nav-items.ts` só tem Negociar/Ativos/Perfil/Sobre — nem
`/investir` nem `/investir/onchain` aparecem lá). Desde a unificação com
empresas fictícias de PME (ver seção própria abaixo), o caminho principal
de descoberta é a categoria `/negociar/token-pmes`, onde cada uma das 10
ofertas reais em Sepolia já aparece com nome, foto e link direto para sua
própria página de detalhe (`/negociar/oferta/<slug>`, que embute o
investimento real) — `/investir/onchain` continua existindo por trás
disso só como a ferramenta multi-oferta do apresentador (ver "Uma ou
várias ofertas" abaixo) e via link dentro de `/investir`
(`ptBr.investir.linkOnChain`, exige login como investidor pra ser
visto). Nenhum item foi adicionado ao menu principal — decisão
deliberada do usuário.

### Unificação com empresas fictícias de PME (`/negociar/token-pmes`)

As 10 ofertas reais em Sepolia (ver "Uma ou várias ofertas" abaixo) não
tinham nome nenhum na UI até esta parte — só apareciam como "Oferta
1".."Oferta 10" no seletor de `/investir/onchain`. Para a categoria Token
PMEs ficar mais atrativa (pedido do usuário, mockup com foto de banner +
logo por empresa), cada uma das 10 ofertas reais ganhou a "cara" de uma
empresa fictícia de PME do catálogo de demonstração (`src/lib/mock/
ofertas.ts`) — as 2 que já existiam (Padaria Bela Vista, Clínica Vitalis)
mais 8 novas (Barbearia Corte & Estilo, Pet Shop Amigo Fiel, Academia
Vigor Fitness, Marcenaria Raízes, Cafeteria Grão & Arte, Lavanderia
Expressa Clean, Escola de Idiomas Global Fluente, Estúdio de Estética
Bella Pele). 🔴 **A transação em blockchain é real; a empresa por trás
dela é fictícia** — a regra "nada simulado pode parecer real" se aplica
ao caso inverso aqui, e por isso cada superfície repete o aviso: o card
da grade traz "Empresa fictícia de demonstração" ao lado do selo "Real —
Sepolia", o banner de demonstração da página de detalhe troca de texto
(`ptBr.negociar.oferta.demoBannerOnChain`) e um aviso extra
(`avisoMisto`) fica logo acima do painel de investir.

- **Mapeamento slug → índice on-chain**: `src/lib/mock/ofertasOnChain.ts`
  — `ONCHAIN_PMES_SLUGS_EM_ORDEM`, uma lista cuja **posição** de cada
  slug é o índice usado em `NEXT_PUBLIC_OFERTAS_ONCHAIN`
  (`getOnChainIndexBySlug()`). Deliberadamente uma lista ordenada, não um
  campo `onChainIndex` solto em cada `Oferta` — evita literal duplicado e
  fácil de dessincronizar. Checagem dev-only (10 entradas, sem
  duplicata, todas com `categoria === "pmes"`) roda no import do módulo,
  cruzada com `OFERTAS` em `ofertas.ts`.
- **Termos sem conflito com a chain**: `src/lib/web3/demoConstants.ts`
  espelha os valores fixos reais do contrato (as 10 ofertas são clones
  do mesmo script — meta mín. 100 mBRL, meta máx. 200 mBRL, 10 mBRL/cota,
  teto 200 mBRL, 20 cotas). O `termos` de cada uma das 10 `Oferta`
  ficticías (`buildTermosOnChainFixos()`) usa exatamente esses números —
  antes eram inventados e diferentes por empresa (ex. Padaria tinha meta
  R$500 mil), o que teria gerado dois números conflitantes para "a mesma
  oferta" nesta página unificada. Campos que mudam com o tempo (estado,
  total arrecadado, prazo exato) nunca vêm de dado estático — sempre de
  `useOfertaOnChainTermos()`, direto da chain — e a prévia no card usa
  sempre **mBRL**, nunca "R$" (MockBRL não tem lastro).
- **Fotos**: `src/lib/negociar/ofertaAssets.ts` (`getOfertaAssetPaths()`,
  server-only via `fs.existsSync`) resolve `public/negociar/pmes/<slug>/
  banner.jpg` + `logo.png` quando existem, `null` quando não — soltar os
  arquivos reais nessas pastas troca o placeholder sem nenhuma mudança de
  código (só um novo commit/deploy, já que `public/` é empacotado no
  build). `OfertaBanner.tsx` (`src/components/negociar/`) renderiza a
  foto + logo circular sobreposto, com placeholder (tokens de cor/ícone
  da própria categoria, mesmos de `CategoryChip`/`CategoryBadge`) — usado
  tanto no card da grade (`size="card"`) quanto no topo da página de
  detalhe (`size="hero"`, todas as categorias, não só PMEs).
- **Card unificado**: `PmesOnChainCard.tsx` substituiu tanto o antigo
  `RealOnChainCard.tsx` (card único genérico, removido) quanto o
  `ShowcaseCard` fictício na categoria/vitrine do hub PMEs — mesmo
  padrão visual de selo sólido + anel salmão de `RealOfferCard.tsx`.
- **Painel de investir reaproveitado**: `RealOnChainInvestPanel.tsx`
  (`src/components/investir-onchain/`, extraído de `OnChainInvestPage.tsx`
  — ver "Uma ou várias ofertas" acima) é montado direto dentro de
  `OfertaDetailPage.tsx` quando o slug resolve um `onChainIndex`,
  substituindo a seção estática "Termos da oferta" e o botão "Negociar
  (simulação)"/`OrderTicket` (não faz sentido oferecer uma simulação de
  compra ao lado de uma compra real na mesma página). Para as outras 4
  categorias, `OfertaDetailPage.tsx` continua idêntica a antes — só
  ganhou o mesmo `OfertaBanner` no topo, com placeholder (nenhuma foto
  real é buscada fora da categoria PMEs).

**Uma ou várias ofertas**, cada uma criada por um script administrativo
fora do frontend (`niara-contracts-PMEs/script/DemoNiaraPMEsOnChain.s.sol`
— ver aquele repositório) — este projeto nunca cria ofertas on-chain
dinamicamente, só lê/escreve nas ofertas já existentes. `MockBRL` é
compartilhado (`NEXT_PUBLIC_MOCKBRL_ADDRESS`, um endereço só);
`ParticipacaoToken`/`OfertaCaptacao` de cada oferta vêm de
`NEXT_PUBLIC_OFERTAS_ONCHAIN` — lista no formato
`token1:oferta1;token2:oferta2;...` (ver `.env.example`), pensada para
demo presencial: o apresentador troca de oferta entre um visitante e
outro sem precisar de novo deploy. O miolo de investimento (termos,
faucet, investir, posição, encerrar, resgatar) vive em
`RealOnChainInvestPanel.tsx` (`{ ofertaIndex }`, ver "Unificação com
empresas fictícias de PME" abaixo) — `OnChainInvestPage.tsx` ficou um
host fino: título, o seletor (`<select>`, só aparece com mais de uma
oferta configurada — com uma só, comportamento idêntico a antes desta
mudança) e `<RealOnChainInvestPanel key={ofertaIndex} ofertaIndex=
{ofertaIndex} />`. Trocar de oferta no seletor remonta o painel inteiro
via esse `key` — reseta de graça todo o estado local (formulário de
investir, status de invest/encerrar/resgatar, campo do faucet), sem
precisar de resets manuais. Sem `MockBRL` nem ao menos 1 oferta
preenchidos, a tela mostra "contrato não configurado" em vez de quebrar
(`getOnChainAddresses()`/`getOnChainContracts()` retornam `null`, nunca
lançam). `RealPositionCard.tsx` (`/ativos`) sempre mostra a posição na
primeira oferta da lista (índice 0) — simplificação deliberada, não
tenta adivinhar qual oferta está "em demonstração" no momento.

**Organização** (`src/lib/web3/`, estendendo a estrutura que já existia
só para a conexão de carteira — nenhuma segunda camada Web3 paralela foi
criada):
- `abis/{mockBrl,ofertaCaptacao,participacaoToken}.ts` — ABIs extraídas
  direto de `niara-contracts-PMEs/out/*.sol/*.json` (`forge build`), nunca
  escritas à mão — nomes de função conferidos contra o `.sol` fonte antes
  de qualquer parâmetro ser fixado (ver histórico desta parte).
- `addresses.ts` / `contracts.ts` — únicos pontos que sabem os 3
  endereços; nenhum componente React tem endereço de contrato hardcoded.
- `errors.ts` — `describeOnChainError()` traduz `UserRejectedRequestError`,
  reverts customizados (`AporteNaoMultiploDoPreco`, `OfertaNaoAberta`,
  `ExcedeMetaMaxima`, `ExcedeTetoInvestidor`, etc. — nomes batidos contra
  `OfertaCaptacao.sol`) e falhas de RPC/gas para pt-BR.
- `hooks/useOfertaOnChain.ts` — leituras (`useReadContracts`, multicall):
  termos da oferta (não depende de carteira) + posição do investidor
  conectado (aportado, cotas resgatadas, saldo/allowance de `MockBRL`,
  saldo de `ParticipacaoToken`).
- `hooks/useOnChainActions.ts` — escritas: `useMintMockBrl` (faucet
  auto-serviço — `MockBRL.mint` é público e irrestrito, então nenhuma
  carteira administrativa é necessária para abastecer a demo),
  `useInvestirOnChain` (checa allowance; só chama `approve` quando
  insuficiente, depois `aportar` — nunca pede aprovação de novo à toa),
  `useEncerrarOferta`, `useResgatarCotas`. Cada um expõe um status
  explícito por etapa (`assinando` → `confirmando` → `sucesso`/`erro`) —
  nunca mostra sucesso antes da confirmação on-chain (`publicClient.
  waitForTransactionReceipt`), e nunca exige refresh manual (os hooks de
  leitura são re-chamados depois de cada confirmação).

**UI** (`src/components/investir-onchain/OnChainInvestPage.tsx`):
reaproveita `<ConnectWallet />` (mesmo componente da seção Carteira de
`/perfil` — não duplicado) para conectar/trocar de rede, depois mostra
termos da oferta lidos do contrato, faucet de `MockBRL`, formulário de
investir (input é **quantidade de cotas**, não valor em R$ — o valor em
`MockBRL` é derivado como `quantidade * precoPorCota`, sempre múltiplo
exato do preço por cota; resolve de propósito o gap documentado no
`CLAUDE.md` de `niara-contracts-PMEs`, "UX real precisaria calcular/
sugerir o múltiplo mais próximo"), posição do investidor, botão de
encerrar (permissionless — qualquer carteira pode chamar) e botão de
resgatar cotas.

**Pré-requisito manual, não automatizável pela UI**: a carteira do
investidor precisa de Sepolia ETH para pagar gas (`aportar`/`encerrar`/
`resgatarCotas` são transações reais) — texto explícito na tela
apontando para um faucet público de Sepolia; a Niara PMEs não tem, e não
deveria ter, um faucet de ETH próprio.

**Posição real dentro de `/ativos`**: `RealPositionCard.tsx`
(`src/components/ativos/`) — único cartão real da tela, no topo da aba
"Minha carteira" (antes de `PortfolioSummary`), mesmos hooks de leitura
de `/investir/onchain`. Visualmente distinto de propósito (`ring-2
ring-salmon` + selo sólido salmão com `BadgeCheck`), mesmo padrão já
usado em `RealOfferCard.tsx` (`/negociar`) para diferenciar oferta real
de fictícia — aqui adaptado ao cartão escuro (`bg-panel`) do resto de
`/ativos`. **Nunca entra em `computeTotals`/`PortfolioSummary` nem nas
linhas de `PositionsTable`** — mock e real ficam sempre separados, nunca
somados juntos. O banner de demonstração do topo da página
(`ptBr.ativos.demoBanner`) foi ajustado para citar essa exceção
explicitamente, mesmo padrão já usado no banner de `/perfil` (que também
carve-outs partes reais dentro de uma tela majoritariamente mock).

`forge build` confirmado limpo no repositório de contratos após
adicionar o script administrativo; a suíte completa de `forge test`
(266+ testes/invariantes) rodou de novo depois — **266/266 passando**,
sem regressão (nenhum contrato/teste foi alterado, só scripts novos).

---

## Tela `/socios` (painel interno, restrito aos sócios)

Área administrativa separada do resto do site — nunca voltada ao
investidor/emissor final. Mostra transações e totais combinando dado
real (Sepolia, via eventos on-chain) e dado demo/mock (Supabase,
`/investir`), **sempre em seções/tabelas separadas**, nunca misturados
numa linha só — mesma regra de honestidade do resto do projeto, aplicada
ao contrário aqui (o risco não é mock parecer real, é os dois se
confundirem num painel administrativo).

🔴 **Controle de acesso é só uma allowlist de e-mail, não um "role"
novo** — `src/lib/auth/resolveSocio.ts` (`resolveSocio()`) é totalmente
separado de `resolveAccount()` (`resolveInvestor.ts`, investor/issuer);
os dois nunca se misturam. Login continua sendo o mesmo Supabase Auth de
sempre (`signInWithPassword`, client do navegador — mesmo mecanismo de
`/entrar`, formulário próprio, não redireciona pra lá nem mexe naquela
tela). A allowlist vem de `NIARA_SOCIOS_EMAILS` (env var, e-mails
separados por vírgula) — **nunca hardcodada no código**, porque o
repositório é público. Autenticado mas fora da allowlist não é
redirecionado — fica na própria página com "Acesso restrito" + botão de
sair. As contas do Supabase Auth dos sócios precisam existir antes
(criadas direto no painel do Supabase, Authentication → Add User — não
há fluxo de cadastro para isso, seria sistema paralelo).

**Dados reais** (`src/lib/web3/events.ts`) — leitura de eventos via
`viem getLogs` **direto no servidor**, sem carteira conectada nem wagmi
(diferente dos hooks de `/investir/onchain`, que são client-side e
dependem de MetaMask). Eventos lidos, nomes conferidos direto no `.sol`
antes de escrever qualquer código (não presumidos): `Aporte`,
`OfertaEncerrada`, `OfertaCancelada`, `CotasResgatadas`,
`RecursosLiberados`, `Reembolso`. `FROM_BLOCK` é um bloco fixo (o do
redeploy da infra em 2026-08-15) — evita escanear a chain desde o
genesis; **precisa ser atualizado se a infra for redeployada nesta
sessão** (ver `niara-contracts-PMEs/CLAUDE.md`, "Chave do deployer da
Fase 4 perdida"). `getResumoOnChain()` lê `taxaBps` **direto do
contrato** de cada oferta configurada (nunca hardcoda 0, mesmo sendo
esse o valor real hoje, confirmado via `cast call` antes de escrever
qualquer texto sobre taxa na tela).

**Dados mock** (`src/lib/socios/mockTransacoes.ts`) — `investments` do
Supabase, mesma REGRA DE OURO de `investments.ts` (lista branca de
colunas, nunca `select('*')`). Este schema **não tem nenhum campo de
taxa** — a tela não inventa um, só explica que o conceito não existe
nesse fluxo (`ptBr.socios.resumoMock.semTaxaNota`).

**Taxa exibida**: hoje `taxaBps = 0` em todas as ofertas (confirmado via
`cast call`, não assumido) → mostra "R$ 0,00" com nota explícita "taxaBps
= 0 nesta demo, lido direto do contrato — nenhuma taxa é cobrada hoje".
Se um dia uma oferta tiver `taxaBps > 0`, o painel mostra o percentual
real lido do contrato, nunca um valor simulado/projetado apresentado
como se fosse cobrança de verdade.

---

## Tela `/empresa/ofertas` (criação e gestão de oferta pelo emissor)

Só acessível a `role==='issuer'`. `OfertasPage.tsx`: formulário de criação
(`createOffering()` — tamanho da captação, meta mínima, lote adicional
0–25%, janela 1–180 dias, valor por cota, categoria) + lista "Minhas
ofertas" com ação "Ativar" (`activateOffering()`, `draft→active`, única
transição possível) e, depois de aberta, "Fechar captação"
(`closeOffering()` — roda o fechamento all-or-nothing e emite os tokens
mock). Ver "Backend (Supabase)" → "Ciclo de captação" acima para a
mecânica completa (cálculo do hard cap, proteção contra corrida na
ativação, tradução de erro por constraint). Esta é a mesma lista que
`MyOffersSection.tsx` resume, só de leitura, dentro de `/perfil` (ver
"Tela `/perfil`", seção "2. Minhas ofertas").

---

## Organização

```
src/
  proxy.ts             Next 16 (era middleware.ts) — só revalida sessão
                       Supabase a cada navegação, ver "Backend (Supabase)"
  app/                 rotas (App Router)
    layout.tsx         layout raiz, async (Next 16) — monta <Providers>
                       (wagmi/react-query) com initialState via cookie
    providers.tsx      Providers (WagmiProvider + QueryClientProvider) —
                       ver "Tela /perfil", seção "4. Carteira"
    cadastro/          criação de conta (3 passos), ver "Tela /cadastro"
                       acima — actions.ts: createAccount()
    entrar/page.tsx    login (overlay tela cheia, ver "Tela /entrar"
                       abaixo); searchParams assíncrono (Next 16) para o
                       parâmetro ?intent=captacao
    conta/page.tsx     shim de redirect para /perfil (preserva ?aviso=/
                       ?onboarding=), ver "Backend (Supabase)" →
                       "Autenticação"
    perfil/            tela de perfil (ver "Tela /perfil" abaixo) —
                       actions.ts: loadProfile/updateProfile/
                       loadMyOfferingsSummary/saveWallet/unlinkWallet/
                       uploadIssuerLogo/removeIssuerLogo
    investir/          listagem + reserva real (ver "Telas /investir"
                       acima) — actions.ts: reserveInvestment/
                       confirmInvestment/loadPublicOffering;
                       kyc-actions.ts: submitKyc; [offeringId]/ é rota
                       dinâmica com not-found.tsx próprio
    investir/onchain/  investimento REAL em Sepolia (blockchain de
                       verdade, não Supabase) — ver "Tela /investir/
                       onchain" acima; sem gate de login/role, dirigido
                       pela carteira conectada
    empresa/ofertas/   criação/ativação/fechamento de oferta pelo emissor
                       (ver "Tela /empresa/ofertas" acima) — actions.ts:
                       createOffering/activateOffering/closeOffering
    socios/page.tsx    painel interno restrito (ver "Tela /socios" acima)
                       — allowlist de e-mail, nunca voltado ao investidor
    ativos/page.tsx    dashboard de portfólio mock (ver "Tela /ativos"
                       abaixo) — não confundir com /investir (real)
    sobre/documentos/  documentação + FAQ (ver "Telas /sobre/documentos e
                       /sobre/contato" abaixo)
    sobre/contato/     formulário de contato via mailto (idem acima)
    negociar/          hub + 5 categorias + detalhe de oferta fictícia
                       (ver "Telas /negociar" abaixo); oferta/[slug]/ é
                       rota dinâmica com not-found.tsx próprio
  components/
    cadastro/          CadastroPage (fluxo de 3 passos), ver "Tela
                       /cadastro" acima
    investir/          InvestirPage (listagem + minhas reservas),
                       OfferingDetailPage (+ ReserveTicket), ver "Telas
                       /investir" acima
    investir-onchain/  OnChainInvestPage (host fino: título + seletor) +
                       RealOnChainInvestPanel (miolo reutilizável do
                       investimento real em Sepolia, também montado
                       dentro de OfertaDetailPage/negociar) — ver "Tela
                       /investir/onchain" acima
    empresa/           OfertasPage (criar/ativar/fechar oferta), ver
                       "Tela /empresa/ofertas" acima
    socios/            SociosLoginForm + SociosDashboard, ver "Tela
                       /socios" acima
    conta/             SignOutButton (reaproveitado também por /socios)
    ativos/            AtivosPage (abas + banner demo), PortfolioSummary
                       (KPIs), PortfolioEvolutionChart e AllocationDonut
                       (recharts), PositionsTable, AssetCatalog
    perfil/            PerfilPage (sidebar + badges + banners),
                       PerfilContext (perfil de investidor, em memória —
                       único pedaço desta tela que continua só em
                       memória, ver "Tela /perfil"),
                       PersonalDataSection (dados reais no banco) +
                       AvatarUpload (simulado) + LogoUpload (upload real
                       de logo do emissor), MyOffersSection (resumo
                       real, só leitura), InvestorProfileSection +
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
    negociar/          HubPage, CategoryPage (template das 5 categorias,
                       inclui RealOfferCard ao lado do catálogo
                       fictício), CategoryChip (CategoryChip +
                       CategoryBadge), CategoryCard, ShowcaseCard,
                       PmesOnChainCard (as 10 ofertas PMEs unificadas —
                       real em Sepolia + empresa fictícia, ver "Tela
                       /investir/onchain" → "Unificação com empresas
                       fictícias de PME"), OfertaBanner (foto + logo,
                       com placeholder), OfertaDetailPage, FinanceiroChart
                       (recharts), FundamentalIndicators + IndicatorHelp
                       (indicadores fundamentalistas + popover "?"),
                       OrderTicket (boleta simulada, só para ofertas sem
                       oferta real por trás) — ver "Telas /negociar"
                       abaixo
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
    supabase/          client.ts (browser) / server.ts (Server
                       Components/Actions) / admin.ts (service role,
                       bypassa RLS, server-only) — ver "Backend
                       (Supabase)" acima
    auth/resolveInvestor.ts  resolveAccount() — fonte única de
                       userId/role/accountId, ver "Backend (Supabase)"
                       → "Autenticação"
    auth/resolveSocio.ts  resolveSocio() — allowlist de e-mail para
                       /socios, separado por completo de resolveAccount()
    socios/mockTransacoes.ts  leitura de investments (Supabase) para o
                       painel /socios, ver "Tela /socios"
    web3/events.ts     leitura de eventos on-chain (viem getLogs,
                       servidor) para /socios — ver "Tela /socios"
    ports.ts           interfaces PaymentGateway/KycProvider/ChainRegistry
    adapters.ts        escolhe implementação por env var, default mock
    mocks.ts           implementação mock de pagamento/KYC/emissão —
                       todo ref prefixado "MOCK-", ver "Backend
                       (Supabase)" → "Ports & adapters"
    investments.ts     leituras de oferta/investimento com lista branca
                       explícita (nunca select('*')), ver "Backend
                       (Supabase)" → "Ciclo de captação"
    money.ts           MONEY_FORMAT (regex) / reaisToCents — parsing do
                       campo de valor em reais dos formulários reais
    storage/issuer-logo.ts  upload/URL versionada da logo do emissor no
                       Supabase Storage, ver "Backend (Supabase)"
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
    web3/addresses.ts  endereços dos 3 contratos da oferta on-chain real
                       (env vars NEXT_PUBLIC_*, nunca hardcoded), ver
                       "Tela /investir/onchain"
    web3/contracts.ts  pareia addresses.ts com os ABIs de web3/abis/
    web3/abis/         ABIs de MockBRL/OfertaCaptacao/ParticipacaoToken,
                       extraídas de niara-contracts-PMEs/out/ (forge build)
    web3/errors.ts     describeOnChainError() — reverts/erros wagmi -> pt-BR
    web3/hooks/        useOfertaOnChain (leituras) + useOnChainActions
                       (mint/investir/encerrar/resgatar), ver "Tela
                       /investir/onchain"
    web3/format.ts     formatToken/formatPrazo — formatação compartilhada
                       de valores on-chain (bigint), usada por
                       RealOnChainInvestPanel e RealPositionCard
    web3/demoConstants.ts  meta/preço/teto/cotas/prazo fixos das 10
                       ofertas reais em Sepolia, espelhados do script
                       Solidity — fonte única para nunca a UI mostrar um
                       número que discorda da chain, ver "Tela
                       /investir/onchain" → "Unificação com empresas
                       fictícias de PME"
    negociar/ofertaAssets.ts  getOfertaAssetPaths() (server-only, fs) —
                       resolve banner.jpg/logo.png reais em
                       public/negociar/pmes/<slug>/ ou null (placeholder)
    i18n/              dicionário de textos (pt-br.ts)
    mock/ativos.ts     dados fictícios tipados da tela /ativos (posições,
                       evolução mensal, catálogo) — nunca dado real
    mock/ofertasOnChain.ts  ONCHAIN_PMES_SLUGS_EM_ORDEM — mapeia slug →
                       índice em NEXT_PUBLIC_OFERTAS_ONCHAIN (posição na
                       lista É o índice), ver "Tela /investir/onchain" →
                       "Unificação com empresas fictícias de PME"
    mock/ofertas.ts    categorias + 18 ofertas fictícias tipadas das
                       telas /negociar (dados públicos, financeiro,
                       indicadores fundamentalistas, termos, documentos)
                       — nunca dado real; as 10 da categoria pmes têm
                       `termos` derivados de web3/demoConstants.ts e
                       ligação com oferta real via mock/ofertasOnChain.ts
    nav-items.ts        itens de navegação compartilhados (Header/Footer)
public/
  niara-pme-logo.png   logo oficial (globo + anel + "NIARA", PNG com fundo
                       transparente, preto — só funciona sobre fundo claro)
scripts/
  seed-demo.ts         `npm run seed:demo` — conta emissor + oferta ativa +
                       conta investidor prontas para pitch, ver "Backend
                       (Supabase)" → "Seed de demonstração"
supabase/
  migrations/          0001–0010, schema + invariantes da Res. CVM 88 em
                       triggers/CHECKs, ver "Backend (Supabase)" →
                       "Schema e invariantes"
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
- Envio real de formulário de contato continua fora de escopo (hoje via
  `mailto`, sem backend, ver "Telas `/sobre/documentos` e `/sobre/contato`"
  acima) — diferente de autenticação/backend, que **já existem** desde o
  backend Supabase (ver "Backend (Supabase)" acima), mas só para o ciclo
  cadastro → perfil → oferta → investimento. Não estender o backend real
  para `/ativos` ou a boleta simulada de `/negociar` sem alinhar antes —
  continuam demonstração 100% mock por decisão deliberada, não por
  limitação técnica.
- Conexão de carteira (`/perfil`, ver "4. Carteira" acima) é real, mas só
  leitura (endereço/rede/saldo nativo em Sepolia) — sem assinatura de
  transação, sem leitura de token ERC-20 (a Niara PMEs não tem contrato
  próprio implantado, diferente do `niara-site`, que lê mUSDT/outros
  tokens de teste reais). `NEXT_PUBLIC_SEPOLIA_RPC_URL` é opcional (cai no
  RPC público padrão do `wagmi/chains` se ausente) — não commitar em
  `.env*` se for definida localmente. A **vinculação** desse endereço à
  conta no banco (`wallet_address`) é real desde o backend Supabase, mas é
  uma camada de persistência separada da conexão MetaMask em si — ver
  "Backend (Supabase)" → "Carteira vinculada ao banco".
- RLS das tabelas de domínio (`issuers`, `offerings`, `investors`,
  `investments`, `payment_events`) é **default-deny sem nenhuma policy**
  (ver "Backend (Supabase)" → "Schema e invariantes") — todo acesso passa
  pelo client `admin` no servidor, controlado só pelo código do Server
  Action via `resolveAccount()`. Não existe ainda policy de self-read para
  o próprio usuário ler seus dados diretamente do client browser; se um
  dia isso for adicionado, revisar com cuidado para não abrir leitura de
  campo sensível (CNPJ, telefone, wallet) além do que as listas brancas
  já expõem hoje.
- Banner "Não verificado" de `/perfil` e o `kyc_status` real gravado no
  banco (aprovado via `/investir`) não estão ligados um ao outro — ver
  "Backend (Supabase)" → "Gate de KYC" para o porquê e para não "corrigir"
  um lado sem entender o outro.
- `npm run seed:demo` (`scripts/seed-demo.ts`, ver "Backend (Supabase)" →
  "Seed de demonstração") cobre conta emissor + oferta ativa + conta
  investidor prontas para um pitch — mas ainda é preciso rodar na mão
  antes de cada demonstração (não é seed automático de CI/deploy).
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
- `/investir/onchain` (ver seção própria acima) depende de uma oferta já
  criada em Sepolia via script administrativo fora do frontend — sem os
  3 `NEXT_PUBLIC_*` preenchidos, a tela mostra "contrato não configurado",
  nunca quebra. **Já configurada e ativa em `.env.local`** desde
  2026-08-15 (`niara-contracts-PMEs/script/DemoNiaraPMEsOnChain.s.sol`,
  rodado com sucesso — token `0xAD14...eE3A`, oferta `0x8390...C57c6`). 🔴
  A chave do deployer original da infraestrutura da Fase 4 foi perdida no
  meio desta parte — toda a infra (10 contratos) precisou ser redeployada
  com uma carteira nova; ver `niara-contracts-PMEs/CLAUDE.md`, "Chave do
  deployer da Fase 4 perdida" para o histórico completo e os endereços
  novos. **Ciclo completo testado pela UI de verdade em 2026-08-15**
  (mint → approve → aportar 2x, 100+100 mBRL → encerrar → resgatar) —
  estado final `EncerradaSucesso`, `totalArrecadado=200 mBRL`, 20 `nPME`
  resgatadas, tudo conferido também via `cast call` direto na chain, não
  só pela tela. Essa oferta específica **já está encerrada**.
  🔴 **Suporte a várias ofertas simultâneas adicionado em 2026-08-15**,
  para uma demonstração presencial (Startup Summit) — ver seção acima
  ("Uma ou várias ofertas"). Foram criadas **10 ofertas de reserva**
  rodando `DemoNiaraPMEsOnChain.s.sol` 10x em sequência (todas `Aberta`,
  confirmadas via `cast call`) — endereços completos das 10 em
  `niara-contracts-PMEs/CLAUDE.md`, "10 ofertas de reserva para o Startup
  Summit". Todas já estão em `NEXT_PUBLIC_OFERTAS_ONCHAIN` no
  `.env.local` deste projeto. A posição real também aparece dentro do dashboard
  `/ativos` desde então, via `RealPositionCard`
  (ver "Tela `/investir/onchain`" acima) — cartão isolado, nunca somado ao
  restante 100% mock daquela tela. Mercado secundário (`LiquidacaoSecundaria`, já
  implantado em Sepolia do lado dos contratos) não foi integrado nesta
  rodada — prioridade foi o ciclo primário completo (aportar → encerrar
  → resgatar), conforme pedido.
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
