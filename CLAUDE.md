# CLAUDE.md — niara-PMEs

Standing instructions for Claude Code in this repository.
Read this file before writing any code.

---

## The project

**Niara PMEs**: a platform that helps small and medium-sized enterprises (SMEs,
*PMEs* in Portuguese) structure investment fundraising and split their capital
through tokenization (the Niara group's "revenue product"; the global exchange,
sibling repository `niara-site`, is the long-term "vision").

**Current stage: an institutional site with a real backend (Supabase) for the
fundraising cycle, plus an interface prototype for the rest.** Since the
backend foundation (see "Backend (Supabase)" below), account sign-up
(`/cadastro`), sign-in (`/entrar`), profile data, offering registration and
publication by the issuer (`/empresa/ofertas`) and investment
reservation/payment by the investor (`/investir`) **are actually written** to a
Postgres database, with the Res. CVM 88 invariants enforced in the database itself
(investor annual cap, offering hard cap, KYC gate, all-or-nothing closing); it
is no longer only UI. Even so, none of this is a real regulated operation: Niara
PMEs is not a CVM-authorized platform, payment (escrow) and token issuance are
**explicit mocks** (every ref is written with a `MOCK-` prefix), and "KYC (demo)"
is a button that always approves; see "Backend (Supabase)" for the full map of
what is real vs. simulated. The MetaMask wallet (Sepolia testnet) in the Wallet
section of `/perfil` is still the only real blockchain connection (see "`/perfil`
screen" below), and it can now also be **linked** (persisted) to the account in
the database. The rest of the exploration screens (`/ativos`, the simulated order
ticket in `/negociar`, fundamental indicators, etc.) remain 100% demo/mock,
without any real transaction.

---

## ⚠️ Next.js 16 (keep this)

This project uses **Next.js 16**, which has breaking changes compared to earlier
versions.

- `params`, `searchParams`, `cookies` and `headers` are **async**: always
  `await` them.
- `next/image` defaults changed.
- React 19 runs effects twice in dev (StrictMode), so every `useEffect` with a
  canvas, WebGL or listener needs a correct cleanup.

---

## 🔴 Main rule: nothing simulated may look real

- Don't offer real securities, don't promise return/yield, don't make up
  companies, offerings, partnerships, licenses, audits, institutions' logos or
  user counts.
- Wherever there is fictitious data, label it as a demo.
- **Never** promise a tax exemption (no "no income tax/IOF"). Capital gains are
  taxable.
- Buttons without a backend stay **disabled and labeled** (e.g. "Coming soon"),
  they never fake success.
- An on-chain record (when it exists) does not replace a notary (cartório) or
  the corporate books of Law 6.404; never suggest otherwise.
- Never label anything as "live" or "real time".

## 🔴 Sensitive data (LGPD)

- **Never** persist CPF, document, date of birth or address in
  `localStorage`/`sessionStorage`/cookies (client-side); this applies to any
  purely local UI state. That doesn't mean this data is never persisted: since
  the Supabase backend (see "Backend (Supabase)" below), CPF/CNPJ, date of birth,
  phone and address from the real sign-up/profile flow **are** actually written
  to Postgres, but always through a Server Action on the server, never through a
  direct `fetch` from the browser nor browser storage. It is fictitious demo
  data for now, but it is already treated as real PII as to where and how it
  travels.
- Never commit `.env`, API keys or secrets. The repository is **public**.

---

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind **v4**
- Tailwind v4 is **CSS-first**: there is no `tailwind.config.js`; tokens live in
  `@theme` inside `src/app/globals.css`
- `next/font/google` (not a CDN) for fonts
- Scroll animation: `gsap` + `ScrollTrigger` (pinned sections, light parallax)
  and `lenis` (smooth scroll, integrated with ScrollTrigger)
- Micro-reveals (simple fade/slide/stagger): `framer-motion`
- Icons: `lucide-react`
- Charts (`/ativos` dashboard): `recharts` (stacked `BarChart` for portfolio
  evolution, `PieChart`/donut for allocation); see "`/ativos` screen" below
- State: React (`useState`, Context). No external state libraries.
- Real wallet (Wallet section of `/perfil`, Sepolia testnet): `wagmi` v3 +
  `viem` v2 + `@tanstack/react-query` v5, the same stack and structure as
  `niara-site`'s `ConnectWallet`/`ConnectionPanel` (sibling repository, originally
  from its `/pilot` route), reused here. See "`/perfil` screen" below, section
  "4. Wallet".
- Real backend: `@supabase/supabase-js` v2 + `@supabase/ssr` v0.12
  (Postgres + Auth + Storage) and `zod` v4 for format validation in the Server
  Actions; the real business rules are locked in the database. See "Backend
  (Supabase)" below.
- Solana Devnet: `@solana/web3.js` v1 + `@anchor-lang/core` (Phantom/Solflare);
  see "Solana Devnet" below.

Removed: `three` / `@react-three/fiber` / `@react-three/drei` (nothing in the
project used them anymore) and, later, the 2D astronaut itself; see "Astronaut
(removed)" below.

---

## Design system

Use **only** `@theme` tokens (`src/app/globals.css`). Never hardcoded colors in
components.

**Light** theme (unlike `niara-site`, which is dark). Official palette:
**palette E (sage + peach)**.

**Base / neutrals:** `bg` #FAF8F5 · `surface` #FFFFFF · `surface-alt` #F1EEE6
(neutral chrome tint: dropdowns, icons, footer; **don't** use it to alternate
section backgrounds) · `border` #E7E2D9 · `ink` #23271F (main text) · `ink-muted`
#5C6152 (secondary text)

**Sage green (primary):** `military` **#3E4835 / rgb(62,72,53)**, the official
value, measured from the "Quer estruturar a captação" CTA band and the single
source of truth for any green on the site · `military-600` #4E5A42 (hover) ·
`military-100` #E6EBDD, the **"sage" section background**

**Peach (accent / CTA):** `salmon` **#F0A487 / rgb(240,164,135)**, the official
value, measured from the "Contate-nos" button and the single source of truth for
any salmon on the site · `salmon-600` #E08E6F (hover) · `salmon-100` #FBE9DF,
the **"peach" section background**

**Section accents:** `ink-peach` #8A5A47 (earthy subtitle on the `salmon-100`
**tint**; never `ink-muted`/gray there; don't use it on full salmon, see the
contrast rule below) · `chip-sage` #DCE3CF (badge/label behind a card title)

### 🔴 Full section backgrounds + contrast rule

Since Part 6, the content sections (except "How it works") alternate **full**
backgrounds, `bg-military` (#3E4835, dark) or `bg-salmon` (#F0A487, light),
instead of the `-100` tints used before. The Hero also uses full `bg-military`
now (it used to sit on the neutral `bg`). The tints (`military-100`/`salmon-100`)
still exist as tokens (used in chips, hero glows, outline button hover, etc.);
they just stopped being the background of a whole section.

Text that sits **directly on the section background** (title/subtitle, outside
any white card) needs the semantic tokens below, checked for AA (4.5:1) against
the exact hex values above; don't improvise another shade:

- On `bg-military` (dark): `text-on-military` (#FAF8F5, light; the same tone as
  `--color-bg`, already used this way in the final CTA band) for the title; for a
  subtitle, if there is one, reuse the CTA pattern (`text-on-military/80`) instead
  of creating a new shade.
- On `bg-salmon` (light): `text-on-salmon` (#23271F, dark; the same tone as
  `--color-ink`) for the title; `text-on-salmon-muted` (#5A3325) for the
  subtitle. **Don't** use `ink-peach` here: it was calibrated for the much lighter
  `salmon-100` tint and doesn't reach 4.5:1 on full salmon.

Cards stay white (`bg-surface`) inside any full background, with unchanged inner
text (`text-ink`/`text-ink-muted`); the contrast rule above only applies to loose
text directly on the section color. Borderless cards (`SectionCard`) need no
adjustment on a dark background (they never had a border); bordered cards
(`border-border`, e.g. `AudiencesSection`) should only keep the border when the
background behind them is light (salmon); on `bg-military` it disappears visually
and should be removed, keeping only the shadow.

The token names (`military`, `salmon`, etc.) were kept for code compatibility
even after the military→sage palette change; only the hex values and the visual
meaning changed.

### `/ativos` dashboard tokens

Besides the section tokens above, the `/ativos` screen (see "`/ativos` screen"
below) introduced its own `@theme` tokens, all meant to be used **on full
`bg-military`**:

- `on-military-muted` #C3CBB3: secondary text for data density (KPI labels,
  legends, notes), softer than plain `on-military`. Different from
  `on-military/80` (used in the Hero/CTA subtitle): this is its own tone, designed
  for dense data screens, not marketing; don't reuse `on-military/80` here nor the
  other way around.
- `panel` / `panel-border`: background and border of the dashboard cards (KPI,
  chart, table, catalog). `panel` is `color-mix(military 90%, black)`, **darker**
  than the section, not lighter. The border is a subtle light overlay
  (`on-military` at low opacity).
  🔴 **This was a real bug, not an arbitrary aesthetic choice**: the first
  version used a *light* overlay (`color-mix(on-military 6%, transparent)`),
  which raises the card background's luminance and therefore **reduces** the
  contrast of any light text inside it. With that lighter background,
  `value-negative` dropped to ~3.98:1 against the panel (below the 4.5:1 AA
  minimum for small text, e.g. the positions table's "Change" column) even after
  being chosen to pass 4.5:1 against plain `bg-military`. Darkening the card
  background fixes it in the right direction: it increases the contrast margin of
  every light text token used inside it instead of reducing it. When creating any
  new light text tone for use inside a card on a dark background, **always check
  contrast against the card's real background (`panel`), not only against the
  section background**; they are not the same color and the card can be the more
  demanding surface of the two.
- `value-positive` #9BD1A0 / `value-negative` #EDA492: gain/loss (KPI, the
  table's % change). `value-negative` was adjusted from a darker coral (#E67C63,
  ~3.4:1 against `bg-military`) to #EDA492 (~4.73:1 against `bg-military`,
  ~5.25:1 against `panel`) for the same reason as above. It is inevitably close
  to the `salmon` tone: reds/corals only reach AA against this green by being
  light enough to approach peach; the project already reuses `salmon` in
  different roles elsewhere (the "Token PMEs" category chip *is* literally
  `salmon`), so this closeness is consistent with the existing pattern, not a new
  inconsistency.
- `chart-pmes` #F0A487 (= `salmon`) · `chart-agro` #B7C29E ·
  `chart-imobiliario` #E4C07A · `chart-auto` #7FA9A3 · `chart-divida` #B49FC0:
  the fixed categorical chart palette (5 token classes), used both in the donut
  and in the category indicator of the table and the catalog. Passed to Recharts
  as `fill="var(--color-chart-*)"` (an attribute the SVG reads at render time,
  which works normally with `var()`); don't hardcode the hex values in
  components.

Whenever you need to check AA contrast (4.5:1) when adding a new tone, use the
WCAG 2.x relative luminance formula against the exact hex of the background
**where the text will actually sit** (section vs. card vs. floating tooltip; each
can have a different effective background).

### 🔴 `h1`–`h6` and `@layer base`

The default heading color/font is defined in `globals.css` **inside
`@layer base`**; don't move it out. CSS rules outside any `@layer`
unconditionally beat anything inside a layer (including Tailwind's utilities,
which live in `@layer utilities`), regardless of specificity. Without
`@layer base` here, a class like `text-bg` on an `<h2>` (e.g. a title on the
solid green CTA band) has no effect at all; this was a real bug found and fixed
in Part 3. Any other loose CSS added to `globals.css` that must coexist with
Tailwind's utilities needs the same treatment.

**Typography:** Space Grotesk (`--font-display`, headings) · Inter
(`--font-sans`, body)

**Radius:** sm 8px · md 12px · lg 20px · full (generous, airy aesthetic)

**Shadows:** `shadow-soft` / `shadow-soft-lg`, soft, for cards and elevated
elements on a light background.

Background alternation pattern on the home sections: sage (`bg-military`) and
peach (`bg-salmon`), **full** (see "Full section backgrounds" above; the `-100`
tints are no longer used as a whole section background), alternate between
content sections. Cards stay white (`bg-surface`) on either one, with the chip
(`bg-chip-sage`) behind the card's title/icon.

Living visual reference: `/styleguide`.

Aesthetic: light, clean, modern, airy. We adapt the **structure** of external
references (e.g. the MetaMask home), never their dark look or their copy.

---

## Language

- **English is the standard for everything in this repo:** identifiers, file
  names, comments, docs, commit messages and PR descriptions. This applies to
  every Niara repository.
- **Names that stay in Portuguese, on purpose** (they mirror external data or
  public interfaces; renaming them would break something that already exists):
  - the contracts' and the Solana program's names (functions, events, errors,
    struct and account fields: `aportar`, `OfertaCaptacao`, `metaMinima`,
    `ParametrosOferta`, ...), the hooks/getters that mirror them one to one, and
    the ABI file names in `src/lib/web3/abis/` (named after the contracts);
  - Supabase column names and stored values (`rede`, `sync_status =
    'nao_onchain' | 'pendente' | 'confirmada' | 'divergente'`,
    `expected_emissor_wallet`, `onchain_events_cache.tipo`, ...), and the
    `raise exception` messages in the migrations (the `translate*DbError()`
    functions match them by substring: "teto anual do investidor", "estoura o
    hard_cap", "KYC nao aprovado", ...);
  - category codes (`pmes`, `agro`, `imobiliario`, `auto`, `divida`), investor
    profile categories (`conservador`/`moderado`/`arrojado`), regions, `pf`/`pj`;
  - env var names (`NEXT_PUBLIC_OFERTAS_ONCHAIN`, `NIARA_SOCIOS_EMAILS`, ...);
  - **routes** (`/negociar`, `/investir`, `/empresa/ofertas`, `/perfil`, ...),
    URL query params (`?intent=captacao`, `?aviso=`, `?rede=solana`,
    `?onboarding=1`) and the fixed demo slugs. The component folders in
    `src/components/` keep the route segment's name (`components/negociar/`
    belongs to `/negociar`); the files inside them are English.
  New names you create are always English; when you touch a Portuguese name,
  document its English meaning in a comment. The on-chain/database names get
  renamed together with the mainnet deploy, never piecemeal.
- **Interface: Portuguese and English.** All interface copy lives in
  `src/lib/i18n/`: `pt-br.ts` (Portuguese) and `en.ts` (English), with the same
  keys — `en.ts` is declared `satisfies Dictionary` (the widened type of
  `pt-br.ts`), so a missing or extra key fails `tsc`. Components never import a
  dictionary directly:
  - Server Components / Server Actions: `const dict = await getDictionary()`
    (`src/lib/i18n/server.ts`, reads the cookie); `getLocale()` when only the
    locale is needed.
  - Client Components: `const dict = useDictionary()` / `useLocale()`
    (`src/lib/i18n/client.tsx`, from the `<I18nProvider>` mounted in the root
    layout).
  - The language comes from the `niara_locale` cookie; without it, the first
    visit follows the browser's `Accept-Language` (Portuguese → `pt`, anything
    else → `en`). The `EN · PT` switcher in the header (`LanguageSwitcher.tsx`)
    calls the `switchLocale` Server Action (`src/app/actions/set-locale.ts`),
    which sets the cookie. Routes don't change with the language.
  - `<html lang>` follows the language (`htmlLang()`: `pt-BR` or `en`), and so
    does the page metadata (`generateMetadata` in the root layout).
  - Server Action error messages also come from the dictionary
    (`serverErrors`), and so do the on-chain error translations
    (`chainErrors.evm` for `describeOnChainError()`, `chainErrors.solana` for
    `describeSolanaError()`): those functions receive the messages as a
    parameter instead of importing a dictionary.
  - Fictitious demo content (companies, sectors, summaries in
    `src/lib/mock/`) is a `LocalizedText` (`{ pt, en }`) in the mock itself, read
    with `localize(text, locale)`. Data typed by real users (offering and issuer
    fields in Supabase) is shown as typed, never translated.
  - **Numbers, money and dates stay in pt-BR format in both languages**
    (`R$ 5.000.000,00`, `19/07/2026`): it's a BRL product, and the money inputs
    parse pt-BR (`reaisToCents`). `intlLocale()` exists for language-dependent
    text formatting only (month names, sorting with `localeCompare`).
  - `offerings.onchain_last_error` stores the reason in the language of whoever
    triggered the check — an accepted limitation of a stored, human-readable
    reason.
- Don't hardcode interface strings in JSX; add the key to **both** dictionaries.

## No AI attribution (hard rule)

Nothing in this repository credits an AI tool, anywhere:

- no `Co-Authored-By: Claude` or `Claude-Session:` trailers, and no "Generated with Claude Code"
  line, in commit messages;
- no AI tool as a commit author or committer: commits use the project identity
  (`git config user.name`/`user.email` = `Niara <niaragaed@gmail.com>`, set in every clone and
  environment before the first commit — some environments default to `Claude <noreply@anthropic.com>`);
- no "Generated with/by Claude Code" footer in pull request descriptions, comments, issues or files.

It's enforced in two layers: the versioned `.claude/settings.json` turns Claude Code's commit
and PR attribution off (`"attribution": {"commit": "", "pr": ""}`), and the `No AI attribution`
GitHub Actions check (`.github/workflows/no-ai-attribution.yml`) fails on any commit or pull
request description that carries it. Some hosted environments append a footer to PR
descriptions by themselves; if the check flags one, delete that line in the GitHub UI. The rule
applies to every Niara repository, including new ones: copy both files when creating a repo.

---
## Backend (Supabase)

Foundation added in 6 commits (`chore: fundação backend` through
`feat(oferta): ...`): Postgres + Auth + Storage via Supabase, following ports &
adapters: the UI and Server Actions never decide a Res. CVM 88 business rule on
their own, they only call the database and translate the error it raises. None of
these parts makes Niara PMEs a CVM-authorized platform; explicit disclaimer in
`supabase/migrations/0001_core.sql:3-8`.

### Clients and environment variables

Three clients in `src/lib/supabase/`, each with a different access scope:
- `client.ts`: browser (`createBrowserClient`), anon key, respects RLS.
- `server.ts`: Server Components/Actions (`createServerClient`), anon key +
  request cookies, respects RLS.
- `admin.ts`: 🔴 uses `SUPABASE_SERVICE_ROLE_KEY`, **ignores RLS completely**.
  Protected by `import "server-only"` at the top; importing it in a client
  component breaks the build. It is the client used by almost every business
  Server Action (the domain tables have default-deny RLS, see below, so access
  control is done in the action's code via `resolveAccount()`, not in a policy).

`src/proxy.ts`: in Next.js 16 `middleware.ts` became `proxy.ts`. It only
revalidates the session on every navigation via `supabase.auth.getUser()` (not
`getSession()`: `getUser()` revalidates against the Supabase server,
`getSession()` only reads the cookie with no guarantee at all). No business rule
lives here.

Environment variables (`.env.example`, never commit real values):
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, RLS
protects them), `SUPABASE_SERVICE_ROLE_KEY` (secret, bypasses RLS),
`DATABASE_URL` / `DIRECT_URL` (Postgres via the pooler), `NIARA_ENV=demo` (marks
`is_demo=true` on written rows), `NIARA_PAYMENT_ADAPTER` / `NIARA_KYC_ADAPTER` /
`NIARA_CHAIN_ADAPTER` (only `"mock"` exists today; see "Ports & adapters"
below). `NEXT_PUBLIC_SEPOLIA_RPC_URL` (optional, for the wagmi connection; see
"`/perfil` screen") predates this backend and is independent of it.

### Ports & adapters: payment, KYC and on-chain issuance are mocks

`src/lib/ports.ts` defines pure interfaces (`PaymentGateway`, `KycProvider`,
`ChainRegistry`); `src/lib/adapters.ts` picks the implementation by the
matching env var, **falling back to the mock by default** if the var is missing
or has an unknown value; it never silently falls into a real implementation by
mistake. Only the mock implementation exists today (`src/lib/mocks.ts`), with an
explicit disclaimer: nothing there moves real money, really verifies identity or
really issues a token on-chain. Every generated ref starts with `"MOCK-"`
(`mockRef()`, e.g. `MOCK-ESCROW-<uuid>`, `MOCK-KYC-<uuid>`, `MOCK-TX-<uuid>`);
**never present a `MOCK-*` ref in the UI as if it were a real operation.**
`mockKycProvider.submit` always returns `status: "approved"` (see "KYC gate"
below).

### Schema and Res. CVM 88 invariants (`supabase/migrations/`)

Money is always `bigint` in cents, never float (`0001_core.sql:10`).
Concurrency is handled with `SELECT ... FOR UPDATE` on the parent row (offering
or investor) before summing, never in JS.

- **`0001_core.sql`**: tables `issuers`, `offerings`, `investors`,
  `investments`, `payment_events`, with **default-deny RLS on all of them** (no
  policy at all; access is 100% via the `admin` client on the server). Rules
  locked by triggers, all raising `SQLSTATE 23514` (the code the app's
  `translate*DbError()` functions match):
  - `issuer_is_sep`: issuer revenue ≤ R$40M (SEP cap).
  - `cap_le_15m`: offering hard cap ≤ R$15M.
  - `additional_lot`: additional lot ≤ 25% of the base cap.
  - `window_le_180d`: fundraising window ≤ 180 days.
  - `enforce_investor_annual_limit`: the **investor annual cap** (default
    R$20k/year; `NULL` = qualified investor, no cap). 🔴 It only sums what went
    through Niara; the real Res. 88 rule is cross-platform (summed across every
    CVM platform at once; SDM proposal 05/2025, not yet in force). It's a
    deliberate approximation, not full compliance; don't treat it as such.
  - `enforce_offering_hard_cap`: blocks a reservation that would exceed the
    offering's hard cap.
  - `enforce_investment_transition`: only allows legal status transitions
    (`reserved→{paid,cancelled}`, `paid→{settled,refunded}`) and is the **KYC
    gate**: `reserved→paid` requires `investors.kyc_status = 'approved'`.
- **`0002_settlement.sql`**: `settle_offering()` (closes the window: if raised ≥
  minimum target → `funded` + cancels unpaid reservations; otherwise → `failed` +
  refunds paid ones) and `mark_offering_settled()` (called by the app **after**
  issuing the mock tokens, marks `settled`): an **all-or-nothing closing** in two
  pure-state steps in the database; external effects (token issuance) are up to
  the app between one call and the other.
- **`0003`/`0004`**: link `investors.user_id`/`issuers.user_id` to `auth.users`,
  `unique` + nullable + `on delete set null` (deleting the login doesn't delete
  the financial history, it only unlinks it).
- **`0005_confirm_investment.sql`**: the `confirm_investment()` RPC, an atomic
  `reserved→paid` transition, idempotent twice over (by status **and** by
  `idempotency_key` in `payment_events`). If 0001's KYC gate fires midway, the
  whole function rolls back, including the `payment_events` row already
  inserted in the same transaction.
- **`0006`/`0007`**: phone/address/`wallet_address` in `investors` and
  `issuers` (nullable), then `unique` on `wallet_address` per table. 🔴
  Documented gap: uniqueness is *per table*; the same wallet on an investor and
  an issuer at the same time is not blocked; accepted for now.
- **`0008`/`0009`/`0010`**: `share_price_cents` (the share count is never a
  column, always derived from `base_cap_cents / share_price_cents`), public
  `sector`/`business_summary`, `category`, `publish_cnpj` (opt-in; the CNPJ
  disappears from the database read on the public side when `false`, not only
  from the UI) and `logo_path` (the file lives in Storage, only the path is a
  column).

### Authentication (`src/lib/auth/resolveInvestor.ts`)

`resolveAccount()` is the single source of truth for "who is signed in and as
what": it reads the user via `getUser()`, then checks (with the `admin` client,
because there is no self-read policy yet) whether there is a row in
`investors.user_id` or `issuers.user_id`. It returns `{ userId,
role: 'investor'|'issuer'|null, accountId }`: **an account is an investor OR an
issuer, never both** (the check is sequential, the first match wins).
`accountId` is the id of the domain row (`investors.id`/`issuers.id`); never
compare it across roles; only `userId` (the login id) is comparable between them.
Every business Server Action calls `resolveAccount()` and never accepts an
`investor_id`/`issuer_id` coming from the client.

`/entrar` became **sign-in only** (`signInWithPassword`); account creation moved
entirely to `/cadastro` (see its own section below). After completing sign-up,
the app redirects to `/conta?onboarding=1`, a flag that automatically opens the
investor profile quiz on the first visit to `/perfil` (see "`/perfil` screen",
section "3. Investor profile"). `/conta` is now just a redirect shim to
`/perfil` (it keeps `?aviso=`/`?onboarding=`), kept so old links don't break.

### KYC gate: what "KYC (demo)" means here

There is no real identity verification anywhere. `kyc_status`
(`pending|approved|rejected`, default `pending`) only changes when the investor
clicks "Do KYC (demo)" in `/investir` (`submitKyc()`,
`src/app/investir/kyc-actions.ts`); that calls the mock adapter, which
**always** returns `approved`, and the action writes exactly the status the
adapter returned (it doesn't hardcode `'approved'`, so the adapter can be swapped
in the future without changing this code). That button only shows up after an
attempt to confirm payment fails with `kycRequired: true`.

🔴 **This is different from the fixed "Not verified" banner in `/perfil`**
(`ProfilePage.tsx`): that banner is static and never reads `investors.kyc_status`.
An investor can actually have `kyc_status='approved'` in the database (after
confirming a payment in `/investir`) while `/perfil` keeps showing "Not
verified"; a known inconsistency, not handled in this round. Whoever touches
either side needs to decide whether to tie the banner to the real data or
document the intentional difference between them.

### Fundraising cycle: investor (`/investir`) and issuer (`/empresa/ofertas`)

Investor: lists active offerings (`loadActiveOfferingsByCategory`/
`loadPublicOffering`, in `src/lib/investments.ts` and
`src/app/investir/actions.ts`) → `reserveInvestment()` writes `investments`
with `status='reserved'` (the database decides cap/hard cap/window; the action
only translates the error) → `confirmInvestment()` calls the mock payment
adapter and the `confirm_investment` RPC (`reserved→paid`, KYC gate) → the
offering owner calls `closeOffering()` when the window closes, which runs
`settle_offering`, issues a mock token per paid investment (idempotent via
`payment_events`) and finally `mark_offering_settled`. See "`/investir`
screen" and "`/empresa/ofertas` screen" below for each side's UI.

🔴 **GOLDEN RULE for reads**: `loadActiveOfferingsByCategory` and
`loadPublicOffering` always use an explicit allowlist of columns, **never
`select('*')`**: CNPJ, phone, full address, revenue and wallet never leave the
database in these reads (it's not just "hidden in the JSX"; the field isn't even
fetched, so it never shows up in the server-rendered HTML / view-source). Apply
the same pattern to any new read that exposes offering/issuer data.

Issuer: `createOffering()` always writes `status='draft'`; `activateOffering()`
is the only `draft→active` transition. Since `offerings` has no transition
trigger (unlike `investments`), protection against a double click/race is an
atomic `UPDATE ... WHERE id=? AND issuer_id=? AND status='draft'` in the Server
Action itself, not the database. `hardCapCents` is always computed as
`base + floor(base * lot% / 100)`; the validated lot range (0–25%) is
chosen mathematically so it can never violate the database's `additional_lot`
CHECK.

🔴 **Fragile coupling, watch out when touching any migration**: every
`translate*DbError()` (in `cadastro/actions.ts`, `investir/actions.ts`,
`empresa/ofertas/actions.ts`, `perfil/actions.ts`) matches `error.code`
(`23514`/`23505`) **plus a substring of the error text** (the constraint name or
the `RAISE EXCEPTION` message), not a stable code. Renaming a CHECK constraint
or editing a `RAISE EXCEPTION` message in a migration silently breaks that match
(it falls into the generic "Could not..." fallback, with no compile error). When
touching a migration, `grep` the constraint name inside `src/app/**/actions.ts`
first.

### Wallet linked to the database (besides the real MetaMask connection)

`0006`/`0007` add `wallet_address` (nullable, unique per table) to
`investors`/`issuers`. `saveWallet()`/`unlinkWallet()`
(`src/app/perfil/actions.ts`) persist the address currently connected via wagmi;
the MetaMask connection itself is still real and client-side, unchanged (see
"`/perfil` screen", section "4. Wallet"); only the persistence layer is new.
`WalletSection.tsx` compares the address connected in wagmi against the
`walletAddress` coming from the database and shows Link/Switch/Unlink
accordingly. A uniqueness error (`23505`) is translated to "This wallet is
already linked to another account."

### Demo seed (`scripts/seed-demo.ts`)

`npm run seed:demo` creates an issuer account + an active offering + an investor
account ready to sign in (credentials printed in the terminal at the end),
designed so nobody has to type a sign-up live during a pitch. It runs outside
Next via `tsx` (a devDependency that resolves the `tsconfig.json` `@/...` path
aliases by itself) because the real Server Actions assume an authenticated HTTP
request (`resolveAccount()` via cookies), which doesn't exist when running a
loose script; the script creates the auth users directly through Supabase's
admin API and writes the domain rows through an admin client local to the
script.

🔴 **It does not reuse `createAdminClient()` from `src/lib/supabase/admin.ts`**:
an initial attempt that broke in practice. `import "server-only"` throws
unconditionally under plain Node (a direct `throw` in
`node_modules/server-only/index.js`), not only when bundled for the browser as
the module's own comment suggests; the no-op only exists through the package's
`"browser"` field in `package.json`, which only bundlers (webpack/turbopack)
honor, not the standard Node module resolution used by `tsx`. The script
duplicates the same two lines that build the client instead of importing the
guarded module.

Idempotent **per account** (lookup by `user_id` before creating; running it again
doesn't duplicate nor change credentials), **not per offering** (each run
creates a new active offering, even if the previous one was already closed in a
rehearsal; there is currently no way to "reset" an offering that already changed
state without touching the investment history). The demo investor is born with
`kyc_status='pending'` (not pre-approved) and without an annual cap
(`annual_limit_cents=null`) on purpose: it leaves the KYC gate available to be
demonstrated live, with no risk of a round demo amount hitting the R$20k/year
retail cap in the middle of the pitch. It requires `NIARA_ENV=demo` (refuses to
run without it) and marks `is_demo: true` on every row it creates, the same
pattern as the rest of the app.

### Issuer logo upload (`src/lib/storage/issuer-logo.ts`)

Real (Supabase Storage, public bucket `issuer-logos`,
`${accountId}/logo.<ext>`), unlike `AvatarUpload.tsx` in the "Registration data"
section (which is still 100% local/simulated, never uploaded; see "`/perfil`
screen"). MIME/size validation (2MB) runs on the server, not only on the client.
🔴 Changing the extension between uploads (png→jpg) leaves the old file orphaned
in the bucket unless it is explicitly removed; the code already handles that, but
it is an easy detail to reintroduce as a bug (the bucket is a failure domain
separate from the database row). The public URL uses `?v=<version>` for cache
busting, read from the Storage object's own `updated_at` (there is no
`updated_at` in `issuers`); without it, overwriting the same path would keep the
old image cached in the browser/CDN.

---

## Astronaut (removed)

The astronaut (a 2D scroll guide that followed the cursor and traveled through
each section's anchors) was **removed completely**; it didn't look good. Gone:
`src/components/astronaut/` (`AstronautGuide.tsx` + `anchors.ts`), the
`<AstronautGuide />` in `src/app/page.tsx`, `public/astronaut.png` and the
fade-out hook that existed in the Credits section (a section also removed later;
see "Current state").

In its place, the hero was rebalanced to be centered on the text (headline +
subtitle + CTAs), with a subtle decorative element behind the content: the ringed
planet motif of `<Logo />` (circle + tilted ellipse) drawn in SVG inside
`HeroParallaxLayers.tsx`, with light scroll parallax (GSAP `ScrollTrigger`,
respecting `prefers-reduced-motion`), together with the soft glows (`blur` +
palette colors) that were already there. Don't reintroduce a persistent central
3D/2D element without aligning with the user first.

### Planet ring: stronger salmon + slow rotation

The ellipse (ring) stroke uses `--color-salmon` at high opacity (`0.9`),
separate from the circle's (planet body's) opacity (`0.3`); before, both shared a
single container opacity (`0.2`), which washed out the salmon on `bg-military`.
Same logic for the salmon glow (`layer2Ref`): slightly larger opacity and area
(`bg-salmon/35`, `h-80 w-80`) so the glow is more present without muddying the
background. No new token was created; solved only with opacity/usage over the
existing official tokens.

The ring rotates slowly and continuously (`hero-orbit-ring-spin`, `globals.css`,
56s linear infinite) around the center of its own stroke: the `<g>` wrapping the
`<ellipse>` gets `transform-box: fill-box; transform-origin: center;` so the
rotation axis is the planet's center, not the SVG's corner. The original static
tilt (-18°) was built into the animation (`from { rotate(-18deg) }` → `to {
rotate(342deg) }`, i.e. a full turn from -18° to -18°+360°) instead of staying in
a loose `transform` attribute on the `<ellipse>`: a CSS `transform` completely
replaces (doesn't combine with) the SVG `transform` attribute on the same
element, so the two couldn't coexist. Because of that choice of end angle (342° ≡
-18° mod 360), the existing global `prefers-reduced-motion: reduce` rule in
`globals.css` (which reduces every animation to a single ~0.01ms iteration) locks
the ring exactly at the original static tilt, without a media query of its own
for this element, as long as the animation has `forwards` in its fill-mode
(`animation: hero-orbit-ring-spin 56s linear infinite forwards`): without it, at
the end of the single iteration the browser discards the "to" and the transform
goes back to `none` (an "untilted" ring that loses its tilt completely) instead of
staying at 342°. Verified with Playwright: the `<g>`'s `getComputedStyle` changes
angle every few seconds in normal mode and stays locked at the same transform
under `reducedMotion: 'reduce'`. The scroll parallax (GSAP `ScrollTrigger`, on the
outer `<div>` wrapping the SVG) keeps working alongside it with no conflict; it
acts on a different HTML element from the `<g>` the CSS animation controls.

---

## Smooth scroll (Lenis) + GSAP ScrollTrigger

`src/components/scroll/LenisProvider.tsx`, mounted in the root layout (wrapping
`Header` + content + `Footer`, global to the site).

- Lenis runs in `root` mode (no wrapper/content; it hooks the `window`'s native
  scroll), with `autoRaf: false`: the `gsap.ticker` drives the tick, and
  `lenis.on('scroll', ScrollTrigger.update)` keeps ScrollTrigger in sync. The
  pattern GSAP itself recommends for integrating with Lenis.
- With `prefers-reduced-motion`, Lenis **isn't even mounted**: the component
  renders `children` directly, without the `<ReactLenis>` wrapper. Since
  `ReactLenis` in `root` mode inserts no DOM element (only a `Context.Provider`),
  both paths produce exactly the same markup; no hydration mismatch risk from
  this.
- Keyboard (Page Up/Down, arrows, Space) and anchors (`#hash`) keep working with
  Lenis active; tested with Playwright.

### 🔴 The pin-inside-flex-`<main>` gotcha (`pinSpacing`)

Any `ScrollTrigger.create({ pin: true, ... })` on a section whose parent is
`display: flex` (the home's `<main className="flex flex-1 flex-col">` is)
**needs** an explicit `pinSpacing: true`. By default, GSAP detects a
`display:flex` parent and turns `pinSpacing` off automatically (assuming flex
already handles the spacing); without it, the pin-spacer doesn't reserve the
extra scroll space and the section "lets go" too early, revealing the content
below in the middle of the sequence. See `HowItWorksSection.tsx` for the right
pattern. This applies to any future pinned section inside the home's `<main>`.

---
## `/ativos` screen (portfolio dashboard)

Replaced the old stub ("Ativos — em construção"). A tokenized portfolio dashboard
in the style of `niara-site`'s "Assets" dashboard (sibling repository, the
exchange), but adapted: a **full sage green** background (`bg-military`, not
`niara-site`'s dark/black dashboard), **R$ (BRL)** instead of USDT. See
`AssetsPage.tsx` (orchestrator) and the components in `src/components/ativos/`.

**Page structure** (`AssetsPage.tsx`, `"use client"` because of the tab state):

- A fixed demo banner at the top (`bg-panel`, required by the "nothing simulated
  may look real" rule; text: "Demo: simulated portfolio and data. Doesn't reflect
  real positions or values.")
- Two tabs (`role="tablist"`/`role="tab"`/`role="tabpanel"`, without roving
  tabindex; focus via the `<button>`'s native Tab, activation via
  click/Enter/Space, enough for the accessibility level already used across the
  project): **"My portfolio"** (default) and **"Available assets"**.
- "My portfolio" tab: `PortfolioSummary` (4 KPIs) → a grid with
  `PortfolioEvolutionChart` (7 columns) + `AllocationDonut` (5 columns) →
  `PositionsTable`.
- "Available assets" tab: `AssetCatalog`, a grid of demo catalog cards, each with
  a **disabled** "Invest (Coming soon)" button (`disabled aria-disabled="true"`,
  the same pattern as the Hero CTA).

**Data**: everything in `src/lib/mock/assets.ts` (typed: `Position`,
`MonthlyEvolution`, `CatalogAsset`): 5 positions (one per token category: SMEs,
Agro, Real estate, Auto, Debt securities), 12 months of evolution, 6 catalog
items. No value is real; the numbers were chosen only to be internally
consistent (the KPIs add up from the positions, the last evolution month matches
the totals). Derivations (portfolio totals, allocation grouping) live in
`src/lib/assets/derive.ts` as pure functions; components don't keep derived
values in state, they recompute from the mock on every render (the same pattern
as `niara-site`'s dashboard).

**Allocation (donut)**: three switchable views (`AllocationView`: `class` |
`asset` | `sector`). "By class" groups by token category (a fixed color per
category, `CATEGORY_COLOR_VAR` in `derive.ts`), "By asset" shows one slice per
position (color = the position's category color), "By sector/region" groups by
region (`Region`: sudeste/sul/nordeste/centro-oeste, a fixed color per region).
The chart's SVG is `aria-hidden`; the accessible alternative is the legend list
next to it (real text, not decorative) with label + % + value in R$, the same
accessibility pattern as `niara-site`'s donut.

**Evolution chart (stacked bars)**: `recharts` `BarChart`, a single `stackId`
for both series ("Invested amount" + "Capital gain"). Colors via
`fill="var(--color-chart-*)"` / `var(--color-value-positive)`, an SVG attribute
read at runtime, so `var()` works normally here (unlike a static build-time
value). Below the chart, a text description (`dict.assets.evolution.description`)
is the accessibility alternative to the `aria-hidden` SVG, pointing out that the
same data appears in the positions table.

**Recharts tooltips**: their own type (`ChartTooltipProps`/`DonutTooltipProps`)
instead of Recharts' generics (`TooltipProps<...>`), which avoids variance
conflicts between the type expected by the `content` prop and the custom
component (the same pattern as `niara-site`).

See "`/ativos` dashboard tokens" (in the Design system section above) for this
screen's specific color tokens and the contrast gotcha that was already fixed
(the card background darker than the section, not lighter).

---

## `/perfil` screen (registration data, my offerings, investor profile, wallet)

Replaced the old stub ("Perfil — em construção"). Inspired by `niara-site`'s
Profile page (sibling repository): the same sidebar + sections structure and the
same investor profile questionnaire logic (but with its own content), adapted to
the full sage green theme (`bg-military`, like `/ativos`, not `niara-site`'s dark
dashboard). See `ProfilePage.tsx` (orchestrator) and the components in
`src/components/perfil/`.

🔴 **Different from the original version of this screen**: the registration data
and the offerings section now actually read/write the database (see "Backend
(Supabase)" above); they are no longer a 100% in-memory form. Only the investor
profile questionnaire result (section 3) and the avatar (inside section 1) are
still simulated/local; see each one below. The old concept of "a single account
with a CPF **or** a CNPJ, plus companies registered separately with an investing
or tokenized purpose" also no longer exists: since the real backend, an
**account** is born as an investor (individual) OR an issuer (company) at
`/cadastro` time, never both, and it is `profile.role` (from `resolveAccount()`)
that decides what the screen shows, no longer a manual toggle inside the
profile.

**Page structure** (`ProfilePage.tsx`, `"use client"` because of the investor
profile context state):

- A fixed demo banner at the top (the same pattern as `/ativos`'s banner)
- A KYC notice strip (`bg-panel`): "Not verified" + text explaining that full
  identity verification will be required when the product goes live. 🔴 This
  banner is **static**: it doesn't read `investors.kyc_status` from the
  database; see "Backend (Supabase)" → "KYC gate" for the real approval (via
  `/investir`) that it doesn't reflect.
- Status badges (`ShieldAlert` "Not verified", the same static banner above, +
  `TrendingUp` "Profile: {current category}")
- An anchor navigation sidebar (`ProfileNav.tsx`; sticky on desktop, horizontally
  scrollable tabs on mobile, the same pattern as `niara-site`'s `ProfileNav`) +
  stacked sections, in this order: **Registration data** → **My offerings** (only
  for `role==='issuer'`) → **Investor profile** → **Wallet**.

**Color tokens**: the screen reuses the tokens already created for `/ativos`
(`panel`/`panel-border` for cards, `on-military`/`on-military-muted` for text,
`value-negative` for validation errors, `salmon`/`on-salmon` for CTAs and the
active state); **no new token was created**. Form fields use `bg-military`
(lighter than the `panel` of the card containing them, so they stand out
visually) with a `panel-border` border and a `ring-salmon` focus ring; validation
errors use a `value-negative` border and text (already calibrated for AA against
`military`/`panel`, see "`/ativos` dashboard tokens" above).

### 1. Registration data (`PersonalDataSection.tsx`)

The person type (`PersonType`, `"pf"`/`"pj"`) is no longer a manual toggle: it
comes fixed from `profile.role` (investor→pf, issuer→pj) and decides the
exclusive fields (Full name + Date of birth for an individual; Legal name + Trade
name + Annual revenue + Sector + Business summary + the "Publish CNPJ" opt-in for
a company) and the document mask (`maskDocument`/`isValidDocument`,
`src/lib/masks.ts`). Shared fields (document, phone with a fixed "+55" prefix in
display only, address via CEP) complete the form. `updateProfile()`
(`src/app/perfil/actions.ts`) actually writes all of it to Postgres; see
"Backend (Supabase)" above. For issuers, `LogoUpload.tsx` is embedded in this
section and does a real upload to Supabase Storage (see "Issuer logo upload" in
the Backend above), **unlike** `AvatarUpload.tsx` (profile photo, individual
**and** company), which stays 100% local/simulated: an object URL via
`URL.createObjectURL`, revoked in the `useEffect` cleanup and when the image
changes, **never uploaded**.

🔴 **LGPD**: at this stage the data written (name/CPF-CNPJ/date of
birth/phone/address/sector/business summary) is fictitious demo data, but it is
already **really persisted PII** in Postgres, no longer only ephemeral React
state as before this backend. The rule of never persisting any of it in
`localStorage`/`sessionStorage` (client-side) still holds; persistence only
happens on the server, via a Server Action, never in the browser. If the data
ever stops being fictitious, the LGPD responsibility moves to the Supabase
database, no longer a "nothing leaves the browser" guarantee.

### 2. My offerings (`MyOffersSection.tsx`, only for `role==='issuer'`)

Replaced the old "Companies"/"My companies" section (registering a company with
a purpose choice inside the profile no longer exists; see the 🔴 note at the top
of this screen). A **read-only** panel: it lists the signed-in issuer's real
offerings (`loadMyOfferingsSummary()`, filtered by `accountId` on the server,
never `select('*')`) with the cap value, status (labels in
`dict.companyOfferings.status`) and minimum target; the "Manage offerings" button
links to `/empresa/ofertas`, where creation/activation/closing actually happen
(see its own section below). An empty state when the issuer has no offering
yet.

### 3. Investor profile (`InvestorProfileSection.tsx` + `InvestorProfileQuiz.tsx` + `InvestorProfileResultCard.tsx`)

Explains that the section is equivalent to CVM's API (Análise do Perfil do
Investidor) and that, in production, the questionnaire would be mandatory before
the sign-up could be completed; "here, being a demo, the rest of the site stays
accessible" (nothing blocks navigation). A default result
(`DEFAULT_INVESTOR_PROFILE` in `src/lib/investor-profile.ts`, category
"Aggressive", evaluated on 2026-07-19) comes prefilled, unlike `niara-site`,
where the profile starts "pending" until the user answers, because here there is
no persistence across sessions to rehydrate a real result, so starting empty
would leave the demo always in the "pending" state. "Retake assessment" opens the
questionnaire (5 questions, content in `dict.profile.investor.quiz.questions`)
and, when finished, recomputes the category (`categorizeScore`, the same tercile
logic as `niara-site`) and goes back to the result card. The result (category +
score + date) lives only in `ProfileContext` (React, in memory), **never** in
`localStorage`, unlike `niara-site` (which persists it there); a deliberate
decision to keep the same "nothing persists beyond the session" guarantee the
rest of the profile screen already promises. **This is the only part of the
profile screen that still works this way** even after the real backend (see the
🔴 note at the top of this screen): the other sections started persisting, this
one didn't, on purpose.

The section receives `openAutomatically` (from `ProfilePage.tsx`, coming from
`openInvestorQuiz`), `true` only on the first visit to `/perfil` right after
creating an account at `/cadastro` (via `?onboarding=1`, see "Backend
(Supabase)" → "Authentication"). In that case the quiz opens directly, skipping
the default result card, and the URL is cleaned via
`window.history.replaceState` right afterwards; without that, an F5 on the same
URL would reopen the quiz from scratch, since the prop is recomputed on every
mount.

The Conservative–Moderate–Aggressive scale is a gradient bar (`aria-hidden`,
decorative) with an indicator at the score's position; the accessible
alternative is the three text labels above the bar (not the bar itself), the
same accessibility pattern as `/ativos`'s donut (decorative SVG + a real
list/text next to it). The "What this profile means"/"Reaction to risk and
volatility"/"Most suitable asset classes" blocks and the disclaimer
("illustrative result, it isn't a recommendation...") come from
`dict.profile.investor.categoryDetails`.

### 4. Wallet (`WalletSection.tsx`)

🔴 **Real connection**: it reads the address, network and test balance of a real
MetaMask wallet via EIP-1193 (`window.ethereum`); no transaction is sent and no
private key is ever touched by the app (that is entirely up to MetaMask). The
connection itself is always client-side, directly between the browser and
MetaMask; that didn't change. What changed with the real backend (see "Backend
(Supabase)" → "Wallet linked to the database" above): the connected address can
now be **saved** (persisted in `investors.wallet_address`/
`issuers.wallet_address`) through `saveWallet()`/`unlinkWallet()`, which are
real Server Actions; the old sentence "nothing is sent to a server" only applies
to the MetaMask connection itself, no longer to the link button. It reuses the
same stack and structure as `niara-site`'s `ConnectWallet`/`ConnectionPanel`
(sibling repository, `src/components/web3/` there, originally built for its
`/pilot` route): the same hooks (`useConnection`, `useConnect`, `useDisconnect`,
`useSwitchChain`, `useBalance`), the same connector (`injected()`) and the same
single network (`sepolia` from `wagmi/chains`), only adapted to this site's
copy and the sage green theme (`panel`/`on-military`/`salmon` instead of
`niara-site`'s dark theme tokens).

**Structure** (`src/lib/web3/config.ts` + `src/app/providers.tsx` +
`src/components/web3/ConnectWallet.tsx` + `ConnectionPanel.tsx`, all
copied/adapted from `niara-site`):

- `config.ts`: wagmi's `createConfig` with `chains: [sepolia]`,
  `connectors: [injected()]`, `storage: createStorage({ storage: cookieStorage })`
  and `ssr: true`, which lets the connection state hydrate on the server via a
  cookie (avoids a "disconnected" flash on the first render). `transports` uses
  `http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL)`; without that env var (not
  committed, `.env*` is already in `.gitignore`), it falls back to the default
  public RPC of the `sepolia` definition in `wagmi/chains`; there is no hardcoded
  secret anywhere.
- `providers.tsx` (`"use client"`): `WagmiProvider` + `QueryClientProvider`
  (`@tanstack/react-query`, required internally by wagmi to cache the read
  hooks). Mounted in the root layout (`src/app/layout.tsx`, which is `async` for
  that reason: it uses `cookieToInitialState(config, (await
  headers()).get("cookie"))`, the Next 16/wagmi SSR pattern), so the connection
  is available on any route, not only `/perfil`.
- `ConnectWallet.tsx`: injected-provider detection via `useSyncExternalStore`
  (there is no event to subscribe to, only a post-hydration read; the server
  assumes it's present so the happy path isn't penalized with a negative flash);
  three states: not detected (a link to `metamask.io/download`), wrong network
  (any `chainId !== sepolia.id`, including mainnet; a "Switch to Sepolia" button
  via `useSwitchChain`, which also adds the network automatically if the wallet
  doesn't know it yet, via wagmi's internal `wallet_addEthereumChain`) and
  connected (truncated address + a button to copy the full address, "Copied"
  feedback for 2s + a disconnect button). `accountsChanged`/`chainChanged`/
  disconnect events are handled automatically by wagmi internally (there is no
  manual listener in the code); the UI simply re-renders because the hooks are
  reactive to the connector state.
- `ConnectionPanel.tsx`: a panel with status/address/network/test ETH balance
  (`useBalance`, only enabled when connected **and** on Sepolia). Unlike
  `niara-site` (which also reads real ERC-20 token balances via
  `useReadContracts`, e.g. mUSDT), there is no token read here: Niara PMEs had no
  ERC-20 contract of its own deployed when this was built, so making up contract
  addresses to read would be inventing data that would look real (violating the
  "nothing simulated may look real" rule at the top of this file). Only the
  native balance (Sepolia ETH) is read.
- "Disconnect" only clears the site's connection session (wagmi's
  `useDisconnect`); the wallet itself stays connected in MetaMask; the UI copy
  makes that explicit, since MetaMask historically doesn't expose a programmatic
  way to revoke the site's permission (that is done in MetaMask's own connections
  settings, outside the app's control).

The copy in `dict.profile.wallet` (`src/lib/i18n/pt-br.ts`) makes it clear that
the connection is real but the rest of the platform isn't: "Real connection to
your wallet: only the address and network are read. No transaction is made." +
a note stressing that buying/selling/any operation with securities doesn't go
through here. The pool of fictitious wallets that existed before
(`DEMO_WALLET_POOL`, `src/lib/mock/perfil.ts`) was removed completely; it no
longer makes sense with a real connection.

---

## `/sobre/documentos` (Docs) and `/sobre/contato` (Contact us) screens

Replaced the old stubs ("Documentos e FAQs" / "Contate-nos"). Inspired by
`niara-site`'s `docs` and `contact` pages (sibling repository): the same
structure (a sidebar with section/anchor navigation + content, an FAQ accordion,
a contact form via `mailto`), but on the full sage green theme (`bg-military`,
like `/ativos` and `/perfil`) and with SME-specific content (tokenized
fundraising under Resolution CVM 88, not the exchange). **No new token was
created**: they reuse `panel`/`panel-border`, `on-military`/`on-military-muted`,
`salmon`/`on-salmon` and `value-negative`, which already existed since `/ativos`.

### `/sobre/documentos` (`DocsPage.tsx`, components in `src/components/documentacao/`)

A "Current stage" strip at the top (`bg-panel`, label in `salmon`): the text says
the contracts are a prototype/testnet, with no mainnet or published audit, and
that all of the site's content is a demo. Below, a centered header (title +
subtitle) and then `DocsNav.tsx` (sticky sidebar on desktop /
horizontally scrollable tabs on mobile, the same pattern as `ProfileNav.tsx`)
next to the content, with anchored sections (`scroll-mt-24`, the same convention
as `/perfil`): What Niara PMEs is → How tokenization works (a numbered list 01–04)
→ Regulatory framework → Revenue model → Technology → FAQ (`FaqAccordion.tsx`,
adapted from `niara-site`'s `FaqAccordion`; keyboard + `aria-expanded`/
`aria-controls`, the same accessibility pattern).

🔴 **Legal review pending before go-live**: texts approved for display at this
stage, but not yet legally validated:
- The "Regulatory framework" section (`dict.docs.framework`): it
  mentions Resolution CVM 88 and the need for a CVM-authorized/registered
  platform for a public offering.
- The claim that the on-chain record is "evidence of integrity and precedence" and
  doesn't replace the corporate books of Law 6.404 nor a notary record (the same
  rule already applies to `/perfil`, see "Main rule" at the top of this file).
- The "Revenue model" section (`dict.docs.revenueModel`): deliberately
  **without percentages** ("being defined"); don't fill in fee numbers without
  legal/product validation.

### `/sobre/contato` (`ContactPage.tsx` + `ContactForm.tsx`, in `src/components/contato/`)

A form (Name, Email, Subject, a select with 6 options, Message) next to a "Talk to
us directly" panel with the email as a `mailto` link. It reuses
`TextField`/`SelectField` from `src/components/perfil/FormField.tsx` (labeled
"shared" since the `/perfil` screen) plus a new `TextareaField` added to the same
file. `SelectField` got an optional `placeholder`: it used to be required and
always rendered a blank `<option>` (which made sense in `CompaniesSection`, where
the field starts empty); here the Subject field is born with a selected value,
and an extra blank option would just be noise.

**Honest sending via `mailto`, without a backend** (the same pattern as
`niara-site`'s `ContactForm`): after validating (name, email with a valid format
via `isValidEmail` from `src/lib/masks.ts`, a non-empty message), clicking "Open
email" builds `mailto:niaragaed@gmail.com` with a prefilled subject/body via
`window.location.href`; it never simulates success nor does a `POST`. LGPD: the
form fields live only in the component's `useState`; nothing is persisted in
`localStorage`/`sessionStorage` nor sent to a server.

---
## `/negociar` screens (hub, categories, offering detail and simulated order ticket)

Replaced the 6 old stubs of the `/negociar/*` routes (`ativos-e-tokens` and the 5
categories) and added a new route. Full sage green theme (`bg-military`, like
`/ativos` and `/perfil`), but with a deliberate difference: here the content
cards are **white** (`bg-surface`, `ink`/`ink-muted` text), not the dark cards
(`panel`) used in `/ativos`/`/perfil`; a decision of the approved design for this
section, replicated on all 4 screens below. `StubPage.tsx` was removed because it
had no use left after the swap.

🔴 **Trading is 100% a product simulation.** No order is sent to a server, no
real order matching (order book) exists, and the regulatory framework
(Resolution CVM 88/135, CVM authorization for the platform) depends on a legal
review before any real use; the same caveat already recorded for
`/sobre/documentos`. Unlike `niara-site`'s `/trade` terminal (sibling
repository), which is an exchange with a real-time order book, the order ticket
here has no book: each simulated order just confirms instantly, which is the
right way to simulate buying/selling an illiquid SME stake/share, unlike a liquid
asset with market depth.

**Icon + color per category** (`src/lib/categories.ts`, `CATEGORY_META`):
SME Token → `Building2` (reuses `salmon-100`/`ink-peach`, which already existed)
· Agro Token → `Wheat` (reuses `military-100`, icon in `--color-cat-agro-icon`)
· Real Estate Token → `Home` · Auto Token → `Car` · Debt securities → `Landmark`;
the last three with their own tokens (`--color-cat-{imobiliario,auto,divida}-{chip,icon}`
in `globals.css`). All designed for use on a **white** card, not on
`bg-military`, unlike `/ativos`'s `--color-chart-*` tokens, which are for the
donut/chart on a dark background. `CategoryChip` (decorative icon,
`aria-hidden`) and `CategoryBadge` (icon + category name, real visible text) live
in `src/components/negociar/CategoryChip.tsx`.

**Data**: `src/lib/mock/offerings.ts`: the 5 categories (name/description/fact
sheet/use cases live in `dict.trade.categories`, see i18n below) and the
typed fictitious offerings (`Oferta`), 2+ per category. The names reuse the same
examples already used in `/ativos`'s catalog (`src/lib/mock/assets.ts`, e.g.
"Token PME Padaria Bela Vista") for narrative consistency between the two
screens: the same fictitious demo, seen from two different angles. No
yield/projected return field exists in the `Oferta` type: the "no return
promises" rule was respected by removing the field, not by hiding it in the UI.
`common.defaultDocuments` is a generic list of disclosure material (the same "Coming
soon" placeholders for every offering, since no real document exists at this
stage), 7 items in this order: Information memorandum, Balance sheet, Financial
statements, Earnings release, Earnings presentation, Articles of association /
bylaws, Offering subscription agreement. Each `Oferta` also has `indicadores:
FundamentalIndicatorValues` (fictitious fundamental indicators in 6 groups:
valuation, efficiency, profitability, dividends, debt, growth; see "Fundamental
indicators" just below). Every offering uses the same
`DEMO_INDICATORS` object (there is no real fundamental analysis of any
company); the field is per offering in the type so values can be customized per
offering in the future without changing the model.

**Hub** (`/negociar/ativos-e-tokens`, `HubPage.tsx`): a demo banner, a grid of 5
`CategoryCard`s (colored chip + name + 1 line + "View category →", linking to the
category route) and a "Showcase (demo)" with 3 `ShowcaseCard`s
(`SHOWCASE_HUB_SLUGS` in `offerings.ts`, one offering from 3 different categories)
linking to the detail page.

**Category template** (`CategoryPage.tsx`, reused by the 5 routes through the
`categoria` prop): a link back to the hub, a header with a large `CategoryChip` +
name + description, a fact sheet in a `<dl>` (Backing per category + the shared
Audience/Framework/Stage; the last 3 are identical across categories, which is
why they live in `dict.trade.categoryTemplate` and are not duplicated per
category), 3 use cases and a showcase filtered by category
(`getOfferingsByCategory`).

**Offering detail** (`/negociar/oferta/[slug]`, a new dynamic route; async
`params`, Next.js 16; `notFound()` + its own `not-found.tsx` if the slug doesn't
exist in `OFFERINGS`). `OfferingDetailPage.tsx`: the company's public data,
financials/cash (KPIs + `FinancialChart.tsx`, a `recharts` `LineChart` of
simulated revenue/cash over the last 6 months, with a text description as the
alternative to the `aria-hidden` SVG, the same pattern as `/ativos`),
**fundamental indicators** (see its own section below), offering terms (token
type, fundraising target, value per share, quantity, deadline; a note stressing
that any estimate is illustrative), disabled placeholder documents (7 items, see
"Data" above) and CVM 88-style risks. A "Trade (simulation)" CTA in the header
opens the order ticket and disappears while it is open (avoids duplication); it
reappears when it closes.

**Fundamental indicators** (`FundamentalIndicators.tsx`, rendered right after
"Financials / cash"): a white panel inspired by Investidor10's layout: a title +
a "Simulated demo indicators: they don't reflect real values nor an analysis of
any company" notice (required by the "nothing simulated may look real" rule),
then 6 groups (Valuation, Efficiency, Profitability, Dividends, Debt, Growth),
each with a label + an accent bar on the left (`bg-salmon`, decorative) and a grid
of indicator cards (`grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))`,
which stacks by itself on mobile). Each card has the indicator name + a "?"
button (`HelpCircle` from lucide-react) + a fictitious formatted value
(`number`: 2 decimal places, pt-BR format; `percent`: the same + `%`). The names, unit and
explanation text of each indicator live in
`dict.trade.offering.indicators.groups` (i18n); the (fictitious) numeric
values themselves live in `DEMO_INDICATORS` (`src/lib/mock/offerings.ts`).
The group and indicator keys (`valuation`, `efficiency`, `pe`, `grossMargin`,
...) are shared by the dictionary and the mock and are looked up dynamically —
rename them in both places at once.

The "?" button (`IndicatorHelp.tsx`) opens an accessible popover
(`<button aria-expanded aria-controls>` + `role="tooltip"`) with the indicator's
explanation; it closes with Esc, an outside click or another click on the button
itself; the "which one is open" state lives in `FundamentalIndicators` (a single
`openKey`), which guarantees only one popover open at a time across all
groups/cards. It works by touch (`pointerdown`, not only `mousedown`) and by
keyboard (visible focus via `focus-visible:outline-salmon`, activated with the
`<button>`'s native Enter/Space). The entrance uses the same `animate-dropdown`
utility already used in the header dropdowns, reused instead of creating a new
animation, and it already respects `prefers-reduced-motion` through the existing
global rule in `globals.css` (which reduces any `animation-duration` to
~0.01ms), with no special handling.

🔴 **The popover is anchored to the right of the button (`right-0`), not
centered**: a deliberate decision, not an aesthetic one. A centered popover
(`left-1/2 -translate-x-1/2`) on a card near the grid's right edge can overflow
the viewport on mobile and create horizontal scroll on the whole page (elements
extending beyond the right edge increase `scrollWidth`; the same class of bug
doesn't exist on the left, where the excess is just clipped without scrolling).
Anchored on the right, the popover only extends leftward from the button; in the
worst case (a card in the first column) it has less room on the left, but it never
creates overflow on the right. Verified with Playwright:
`document.documentElement.scrollWidth === document.documentElement.clientWidth`
at 390px wide with the popover of the last indicator (grid corner) open.

**Simulated order ticket** (`OrderTicket.tsx`): a sticky side panel on desktop
(`lg:static`, inside the page's 12-column grid) and a bottom drawer with a
backdrop on mobile (the same component; only responsive Tailwind classes switch
`fixed inset-x-0 bottom-0` to `lg:static`; the backdrop (`bg-ink/50`) only exists
below `lg`). It closes with a click on the X, a click on the backdrop or the Esc
key (the close button gets focus when it opens). Flow: Buy/Sell → quantity + price
(prefilled with `offering.simulatedPrice`, editable) → computed total/fee → "Review
(simulation)" → summary → "Confirm (simulation)" → a result message labeled as
simulated, with a simulated balance in `useState` (not persisted) that is
debited/credited; everything resets when the ticket closes and reopens (the
component unmounts). No `fetch`/`POST` anywhere. The Buy/Sell toggle color reuses
`military`/`salmon` (not `value-positive`/`value-negative`, which are calibrated
for contrast against a **dark** `bg-military`/`panel` background and would fail
AA if used as text directly on a **white** card like the ones in this section;
the same class of gotcha already documented for `--color-panel`). Validation
errors use the new `--color-on-surface-negative` token (dark red, ~6.5:1 against
white), created specifically for error text on `bg-surface` in this section; don't
confuse it with `--color-value-negative`.

**i18n**: all of the interface copy of the 4 screens lives in `dict.trade`
(`hub`, `categories`, `categoryTemplate`, `offering`, including
`offering.indicators.groups` (names, unit and explanations of the fundamental
indicators), `orderTicket`) in `src/lib/i18n/pt-br.ts` and its English mirror in
`en.ts`; the descriptive text of the fictitious offerings (company name, business
summary, etc.) and the numeric values of the fundamental indicators live directly
in the mock (`offerings.ts`), with both languages, following the same pattern as
`mock/assets.ts`.

Verified with the dev server + Playwright (desktop 1280px and mobile 390px): hub,
category template, offering detail (expanded documents + fundamental indicators;
the "?" popover opening/closing by click, Esc, outside click and keyboard, one at
a time, no horizontal scroll on mobile) and the full order ticket flow (open →
review → confirm → new order), including the mobile drawer with the backdrop; no
console errors.

---

## `/entrar` screen (sign-in)

Replaced the disabled "Entrar" (header) and "Iniciar captação" (hero) buttons,
which are **enabled** from this part on. Header "Sign in" → `/entrar`; hero
"Start fundraising" → `/entrar?intent=captacao`; the same screen, the parameter
only swaps the title/subtitle to stress "create an account to structure
fundraising" (`SignInPage.tsx` receives `isFundraisingIntent`, computed from the
async `searchParams`, Next 16, in `src/app/entrar/page.tsx`). Structure inspired
by Ondo's sign-in screen (split: media on the left, a unified "sign in or create
an account" form on the right), adapted: the left side is the cover of a YouTube
video (not a photo) that teaches how to create a MetaMask account.

**A full-screen overlay, not a "normal" route**: since Header/Footer are mounted
in the root layout (`src/app/layout.tsx`) and wrap every route unconditionally, a
nested layout can't remove them; it can only add UI. `SignInPage.tsx`
(`"use client"`) solves this by being a `<div role="dialog" aria-modal="true">`
**`fixed inset-0 z-50`**, which visually covers the Header (`z-40`) and Footer
completely without unmounting them from the DOM. While mounted, it locks the
`<body>` scroll (`document.body.style.overflow = "hidden"` in a `useEffect`,
restored in the cleanup); without it, the page behind the overlay would keep
scrolling. It closes with a click on the X (`<Link href="/">`, top right corner,
`z-20` to stay above the video cover) or the Esc key (`router.push("/")` in a
`keydown` listener, the same keyboard-close pattern already used in `/negociar`'s
order ticket drawer).

**Left column: video cover** (`VideoCover.tsx`): the YouTube thumbnail
(`https://img.youtube.com/vi/m7lSSzq6xg4/maxresdefault.jpg`, with an automatic
fallback via the `<img>`'s own `onError` to `hqdefault.jpg`, which YouTube always
generates even when the maxres doesn't exist) as a plain `<img>` (not
`next/image`: simplicity, it avoids touching `images.remotePatterns` in
`next.config.ts` just for one external thumbnail; `eslint-disable-next-line
@next/next/no-img-element`, the same pattern already used in `AvatarUpload.tsx`).
The whole area is a single `<a target="_blank" rel="noopener noreferrer">` to
`https://youtu.be/m7lSSzq6xg4`, with a descriptive `aria-label`, not only the play
button.

🔴 **The gradient overlay was calibrated for legibility, not only aesthetics**:
the first version used `from-military` (100% opaque) `via-military/75`
`to-military/40`, meant only to "darken for text legibility", but since the
text/caption is vertically centered (`items-center justify-center`) and the
video's own palette is already a dark teal close to `military`, the average result
was a cover that looked **almost solid**, not recognizable as a video thumbnail
(verified with a Playwright screenshot with the overlay temporarily removed via
`display:none` for a side-by-side comparison). Fixed to `from-military/85
via-military/40 to-military/10` (much lighter) **plus** a background of its own
(`bg-military/70 backdrop-blur-sm`, rounded) only behind the caption paragraph:
the text's legibility comes from that dedicated pill, not from darkening the
whole image; the play button is already legible on its own (solid salmon
background). When changing this overlay in the future, always compare against the
raw image (overlay `display:none`) before assuming it got too dark or too light.

**Right column: form** (inside `SignInPage.tsx` itself): the full sage green theme
(`bg-military`, the same pattern as `/ativos`, `/perfil`, `/negociar`, not
Ondo-style light panel, to keep the same visual theme as the other internal
screens even without reusing any web3 component here).

🔴 **Since the Supabase backend, this screen became real sign-in only; it no
longer has the decorative/disabled fields it had before.** `handleSignIn()`
actually calls `supabase.auth.signInWithPassword({ email, password: senha })`; the
only error mapped by `mapAuthError()` is `invalid_credentials` (account creation
no longer happens here, only at `/cadastro`; see its own section). After a
successful sign-in, `router.push("/perfil")` (which in turn redirects by itself to
`/cadastro` if the account doesn't have investor/issuer data yet, covering whoever
created a login but didn't finish signing up). Below the "Sign in" button, a
"Create account" link goes to `/cadastro`, then an "or" divider and only then the
"Continue with Google" button (an inline `GoogleIcon`; lucide-react has no brand
logos) stays **disabled and labeled "(Coming soon)"**, the same visual pattern as
the Hero CTA; it is the only decorative element left on this screen. This screen
does **not** offer a MetaMask connection; the site's only real wallet connection
is still the Wallet section of `/perfil` (see "`/perfil` screen", section "4.
Wallet"), **intact and unrelated to this screen**.
- The terms note (`dict.signIn.termsNote`) mentions the Terms of Use and the
  Privacy Policy as "documents coming soon": plain text, **without** dead
  `href="#"` links, since those pages don't exist yet.

**Honesty and LGPD**: the email/password form actually writes (via Supabase
Auth, see "Backend (Supabase)" above); only the Google button remains decorative
(`disabled`, it neither sends nor persists anything). When `intent=captacao`, the
subtitle (`dict.signIn.fundraisingSubtitle`) already makes it explicit that
structuring the offering itself is still a demo and depends on CVM
authorizations, without mentioning a wallet, since this screen doesn't offer one.

**i18n**: `dict.signIn` in `src/lib/i18n/pt-br.ts` (and its mirror in `en.ts`).

---

## `/cadastro` screen (account creation)

A 3-step flow in `SignUpPage.tsx`: **account** (email + password,
`supabase.auth.signUp`) → **type** (investor "pf" vs. company "pj", a choice that
fixes the account's `role` forever; see "Backend (Supabase)" → "Authentication") →
**data** (the full form per type, submitted to `createAccount()`). `signUp` errors
handled: `user_already_exists`, `weak_password`; database errors (`23514`
`issuer_is_sep`, `23505` for a duplicate `user_id`) translated by
`translateDbError()`; `23505` here isn't treated as an error, it's a sign of
"already has an account", and the UI redirects instead of showing a failure
message. `createAccount()` always reads `user.id` on the server side, it never
trusts an id coming from the client. When done, it redirects to
`/conta?onboarding=1`, which automatically opens the investor profile quiz on the
first visit to `/perfil` (see "`/perfil` screen", section "3. Investor profile").

---

## `/investir` (list + reservation) and `/investir/[offeringId]` (real detail) screens

The real investment flow, different from `/ativos` (which is still the 100% mock
portfolio dashboard, unchanged; see "`/ativos` screen" above) and different from
`/negociar`'s simulated order ticket (which still doesn't touch any database; see
its own section). Access restricted to `role==='investor'` (redirects to
`/conta?aviso=apenas-investidor`), with one exception: the issuer that owns a
specific offering can see its own `/investir/[offeringId]` (without the reserve
button), via `isOfferingOwner()`.

`InvestPage.tsx`: active offering cards (linking to the detail) + "My
reservations" (the signed-in investor's `reserved`/`paid` investments), with a
"Confirm payment" button per reservation and, only when the last attempt came back
with `kycRequired: true`, an inline "Do KYC (demo)" button; see "Backend
(Supabase)" → "KYC gate" above.

`OfferingDetailPage.tsx`: the issuer's public data, terms (target/hard
cap/raised/value per share/shares/window), a list of placeholder documents (the
same 7 "Coming soon" items as `/negociar`) and CVM-style risks. `ReserveTicket` is
the reservation panel (sticky on desktop, a bottom sheet on mobile, the same
pattern as `/negociar`'s simulated `OrderTicket`); it actually calls
`reserveInvestment()`, not a simulation.

`RealOfferCard.tsx` (used inside `CategoryPage.tsx`, in the 5 `/negociar`
categories) shows real offerings from the database side by side with the
fictitious catalog of the same categories: a solid badge + a salmon ring, visually
distinct from the fictitious `ShowcaseCard`, precisely so a real and a fictitious
offering are never confused on the same screen (a direct application of the
"nothing simulated may look real" rule to this surface where real data coexists
with the old demo).

---
## `/investir/onchain` screen (real investment on Sepolia: a real blockchain)

The platform's third "investment" system, distinct from both `/ativos` (a 100%
mock dashboard) and `/investir` (which writes a *simulated* reservation/payment
to a real Postgres). There is no Supabase here: a MetaMask wallet connects
directly to real contracts deployed and verified on Sepolia
(`niara-contracts-PMEs`, see that repository's `CLAUDE.md`); `aportar`,
`encerrar`, `resgatarCotas` are real transactions, signed by the user's wallet,
confirmed on-chain. The only "mock" thing here is `MockBRL` (the escrow's test
currency, with no backing); the contract mechanics and the recorded state are
real.

🔴 **Unlike `/investir`, this route doesn't require a sign-in/account on Niara
PMEs**: it is driven entirely by the connected wallet, a deliberate decision so
anyone can demonstrate the full cycle without signing up.

**Discovery**: `/investir/onchain` **is not in the main menu**
(`src/lib/nav-items.ts` only has Trade/Assets/Profile/About; neither `/investir`
nor `/investir/onchain` appear there). Since the unification with fictitious SME
companies (see its own section below), the main discovery path is the
`/negociar/token-pmes` category, where each of the 10 real Sepolia offerings
already appears with a name, photo and a direct link to its own detail page
(`/negociar/oferta/<slug>`, which embeds the real investment);
`/investir/onchain` still exists behind that only as the presenter's
multi-offering tool (see "One or several offerings" below) and via a link inside
`/investir` (`dict.invest.linkOnChain`, which requires being signed in as an
investor to be seen). No item was added to the main menu; a deliberate decision by
the user.

### Unification with fictitious SME companies (`/negociar/token-pmes`)

The 10 real Sepolia offerings (see "One or several offerings" below) had no name
at all in the UI until this part; they only showed up as "Offering 1".."Offering
10" in `/investir/onchain`'s selector. To make the SME Token category more
attractive (the user's request, a mockup with a banner photo + logo per company),
each of the 10 real offerings got the "face" of a fictitious SME company from the
demo catalog (`src/lib/mock/offerings.ts`): the 2 that already existed (Padaria
Bela Vista, Clínica Vitalis) plus 8 new ones (Barbearia Corte & Estilo, Pet Shop
Amigo Fiel, Academia Vigor Fitness, Marcenaria Raízes, Cafeteria Grão & Arte,
Lavanderia Expressa Clean, Escola de Idiomas Global Fluente, Estúdio de Estética
Bella Pele). 🔴 **The blockchain transaction is real; the company behind it is
fictitious**: the "nothing simulated may look real" rule applies to the opposite
case here, which is why every surface repeats the notice: the grid card shows
"Fictitious demo company" next to the "Real — Sepolia" badge, the detail page's
demo banner changes text (`dict.trade.offering.demoBannerOnChain`) and an extra
notice (`mixedNotice`) sits right above the invest panel.

- **slug → on-chain index mapping**: `src/lib/mock/onChainOfferings.ts`,
  `ONCHAIN_SMES_SLUGS_IN_ORDER`, a list whose **position** of each slug is the
  index used in `NEXT_PUBLIC_OFERTAS_ONCHAIN` (`getOnChainIndexBySlug()`).
  Deliberately an ordered list, not a loose `onChainIndex` field on each `Oferta`;
  it avoids a duplicated literal that is easy to get out of sync. A dev-only check
  (10 entries, no duplicates, all with `categoria === "pmes"`) runs on module
  import, cross-checked with `OFFERINGS` in `offerings.ts`.
- **Terms without conflicting with the chain**: `src/lib/web3/demoConstants.ts`
  mirrors the contract's real fixed values (the 10 offerings are clones of the
  same script: min target 100 mBRL, max target 200 mBRL, 10 mBRL/share, cap 200
  mBRL, 20 shares). The `termos` of each of the 10 fictitious `Oferta`s
  (`buildFixedOnChainTerms()`) uses exactly these numbers; before, they were made
  up and different per company (e.g. the bakery had a R$500k target), which would
  have produced two conflicting numbers for "the same offering" on this unified
  page. Fields that change over time (state, total raised, exact deadline) never
  come from static data; always from `useOnChainOfferingTerms()`, straight from the
  chain, and the card's preview always uses **mBRL**, never "R$" (MockBRL has no
  backing).
- **Photos**: `src/lib/trade/offeringAssets.ts` (`getOfferingAssetPaths()`,
  server-only via `fs.existsSync`) resolves `public/negociar/pmes/<slug>/banner.jpg`
  + `logo.png` when they exist, `null` when they don't; dropping the real files into
  those folders replaces the placeholder with no code change (only a new
  commit/deploy, since `public/` is bundled in the build). `OfferingBanner.tsx`
  (`src/components/negociar/`) renders the photo + an overlapping circular logo,
  with a placeholder (the category's own color/icon tokens, the same as
  `CategoryChip`/`CategoryBadge`), used both in the grid card (`size="card"`) and at
  the top of the detail page (`size="hero"`, every category, not only SMEs).
- **Unified card**: `SmesOnChainCard.tsx` replaced both the old
  `RealOnChainCard.tsx` (a single generic card, removed) and the fictitious
  `ShowcaseCard` in the SME category/hub showcase; the same visual pattern of a
  solid badge + salmon ring as `RealOfferCard.tsx`.
- **Reused invest panel**: `RealOnChainInvestPanel.tsx`
  (`src/components/investir-onchain/`, extracted from `OnChainInvestPage.tsx`; see
  "One or several offerings" above) is mounted directly inside
  `OfferingDetailPage.tsx` when the slug resolves an `onChainIndex`, replacing the
  static "Offering terms" section and the "Trade (simulation)" button/
  `OrderTicket` (it makes no sense to offer a purchase simulation next to a real
  purchase on the same page). For the other 4 categories, `OfferingDetailPage.tsx`
  stays identical to before; it only got the same `OfferingBanner` at the top, with
  a placeholder (no real photo is fetched outside the SME category).

**One or several offerings**, each created by an administrative script outside
the front end (`niara-contracts-PMEs/script/DemoNiaraPMEsOnChain.s.sol`; see that
repository); this project never creates on-chain offerings dynamically, it only
reads/writes the existing offerings. The legacy `MockBRL` is shared
(`NEXT_PUBLIC_MOCKBRL_ADDRESS`, a single address); each offering's
`ParticipacaoToken`/`OfertaCaptacao` come from `NEXT_PUBLIC_OFERTAS_ONCHAIN`, a
list in the format `token1:offering1;token2:offering2;...` (see `.env.example`),
designed for an in-person demo: the presenter switches offerings between one
visitor and the next without a new deploy. The investment core (terms, faucet,
invest, position, close, redeem) lives in `RealOnChainInvestPanel.tsx`
(`{ offeringIndex }`, see "Unification with fictitious SME companies" above);
`OnChainInvestPage.tsx` became a thin host: a title, the selector (`<select>`,
only shown with more than one configured offering; with a single one, the
behavior is identical to before this change) and `<RealOnChainInvestPanel
key={offeringIndex} offeringIndex={offeringIndex} />`. Switching offerings in the
selector remounts the whole panel through that `key`, which resets all the local
state for free (the invest form, the invest/close/redeem status, the faucet
field), with no manual resets. Without `MockBRL` and at least 1 offering filled
in, the screen shows "contract not configured" instead of breaking
(`getOnChainAddresses()`/`getOnChainContracts()` return `null`, they never
throw). `RealPositionCard.tsx` (`/ativos`) always shows the position on the first
offering in the list (index 0); a deliberate simplification, it doesn't try to
guess which offering is "being demoed" at the moment.

**Layout** (`src/lib/web3/`, extending the structure that already existed only for
the wallet connection; no second, parallel Web3 layer was created):
- `abis/{mockBrl,ofertaCaptacao,participacaoToken}.ts`: ABIs extracted directly
  from `niara-contracts-PMEs/out/*.sol/*.json` (`forge build`), never written by
  hand; function names checked against the `.sol` source before any parameter was
  fixed (see this part's history).
- `addresses.ts` / `contracts.ts`: the only places that know the addresses; no
  React component has a hardcoded contract address.
- `errors.ts`: `describeOnChainError()` translates `UserRejectedRequestError`,
  custom reverts (`AporteNaoMultiploDoPreco`, `OfertaNaoAberta`,
  `ExcedeMetaMaxima`, `ExcedeTetoInvestidor`, etc., names checked against
  `OfertaCaptacao.sol`) and RPC/gas failures into the current language.
- `hooks/useOnChainOffering.ts`: reads (`useReadContracts`, multicall): the offering
  terms (no wallet needed) + the connected investor's position (invested, redeemed
  shares, `MockBRL` balance/allowance, `ParticipacaoToken` balance).
- `hooks/useOnChainActions.ts`: writes: `useMintMockBrl` (a self-service faucet;
  `MockBRL.mint` is public and unrestricted, so no admin wallet is needed to fund
  the demo), `useInvestOnChain` (checks the allowance; only calls `approve` when
  it's insufficient, then `aportar`; it never asks for approval again for nothing),
  `useCloseOffering`, `useRedeemShares`. Each one exposes an explicit status per
  step (`signing` → `confirming` → `success`/`error`); it never shows success
  before the on-chain confirmation (`publicClient.waitForTransactionReceipt`), and
  never requires a manual refresh (the read hooks are refetched after each
  confirmation).

**UI** (`src/components/investir-onchain/OnChainInvestPage.tsx`): reuses
`<ConnectWallet />` (the same component as `/perfil`'s Wallet section, not
duplicated) to connect/switch networks, then shows the offering terms read from
the contract, the `MockBRL` faucet, the invest form (the input is a **share
quantity**, not an amount in R$; the `MockBRL` amount is derived as `quantidade *
precoPorCota`, always an exact multiple of the price per share; this deliberately
solves the gap documented in `niara-contracts-PMEs`'s `CLAUDE.md`, "real UX would
need to compute/suggest the closest multiple"), the investor's position, the close
button (permissionless: any wallet can call it) and the redeem shares button.

**A manual prerequisite the UI can't automate**: the investor's wallet needs
Sepolia ETH to pay gas (`aportar`/`encerrar`/`resgatarCotas` are real
transactions); explicit text on the screen points to a public Sepolia faucet;
Niara PMEs doesn't have, and shouldn't have, its own ETH faucet.

**Real position inside `/ativos`**: `RealPositionCard.tsx`
(`src/components/ativos/`), the screen's only real card, at the top of the "My
portfolio" tab (before `PortfolioSummary`), with the same read hooks as
`/investir/onchain`. Visually distinct on purpose (`ring-2 ring-salmon` + a solid
salmon badge with `BadgeCheck`), the same pattern already used in
`RealOfferCard.tsx` (`/negociar`) to tell a real offering from a fictitious one,
adapted here to the dark card (`bg-panel`) of the rest of `/ativos`. **It never
enters `computeTotals`/`PortfolioSummary` nor the `PositionsTable` rows**: mock and
real are always kept separate, never summed together. The demo banner at the top
of the page (`dict.assets.demoBanner`) was adjusted to call out this exception
explicitly, the same pattern already used in `/perfil`'s banner (which also carves
out real parts inside a mostly mock screen).

`forge build` confirmed clean in the contracts repository after adding the
administrative script; the full `forge test` suite (266+ tests/invariants) ran
again afterwards: **266/266 passing**, no regression (no contract/test was
changed, only new scripts).

### Phase 4: `/investir/onchain` also invests in self-service offerings

Until here, `/investir/onchain` only knew how to invest in the 10 legacy offerings
(`NEXT_PUBLIC_OFERTAS_ONCHAIN`, created by an administrative script). Phase 3
(self-service publication by the issuer, see "`/empresa/ofertas` screen") started
creating real offerings on Sepolia with no investment UI pointing at them; Phase 4
closes that gap, in two sub-steps.

🔴 **There is no "mixing real with fictitious" here**: both sources have the same
status. The whole platform is a demo, without CVM authorization, with
backing-less `MockBRL` for both. The only difference is the **provenance of the
content** (a company made up by hand in `mock/offerings.ts` vs. data the issuer
itself filled in), which is why the solution is a line of text in the selector,
not a structural separation like `/socios`.

🔴 **Retroactive correction**: this section originally claimed that both sources,
"confirmed by an on-chain read before coding", shared the same `MockBRL`
(`0xEC377e00e022675B67Da6ab1966Bc0764bF792A4`). That check was never done line by
line against a real transaction (it was a misread isolated read) and it was
**false**: the 10 legacy offerings do share one `MockBRL` (`0xb99dda4e...`,
`NEXT_PUBLIC_MOCKBRL_ADDRESS`), but each self-service offering has its own,
different one (`OfertaCaptacao.moeda()`, fixed at creation). That caused a real
investment incident (an approve against the wrong MockBRL; see "Real incident,
root cause found: MockBRL resolved as a global constant..." further below). Since
the fix, no code reads MockBRL from a constant; always from `moeda()`, per
offering.

**5.1: read** (`src/lib/web3/confirmedOfferings.ts`,
`loadConfirmedOnChainOfferings()`): offerings with `sync_status='confirmada'`,
bringing `contract_address`/`token_address`/the issuer name. The same GOLDEN RULE
as `investments.ts`: an explicit allowlist, never `select('*')`. It filters by
`sync_status`, not by `status` (which always stays `'draft'` for these rows, by
Phase 3's design); none of the existing reads (`loadActiveOfferingsByCategory`,
`/investir`) filters by `sync_status`, so none of them would ever show these
offerings; there was nothing to "relax", only a new read to write.

**5.2: identity by address, not by index**: before, `offeringIndex: number` (the
position in the env var list) was the identity unit passed through
`getOnChainContracts` and the six hooks of
`useOnChainOffering.ts`/`useOnChainActions.ts`; there was no way to point at a
Supabase offering, which has no "index" at all. `getOnChainContracts` now receives
the already resolved `{token, oferta}` pair (the `OnChainOfferingAddresses` type).
🔴 In this sub-step, a `getMockBrlContract()` resolved `MockBRL` as a global
constant (`NEXT_PUBLIC_MOCKBRL_ADDRESS`), **removed later** in a fixed real
incident (see "Real incident, root cause found: MockBRL resolved as a global
constant..." further below): MockBRL isn't global, it's `OfertaCaptacao.moeda()`
per offering. `RealOnChainInvestPanel` receives `tokenAddress`/`offeringAddress`
directly (memoized into a single object via `useMemo`, so the six hooks don't
recreate callbacks on every render because of a new object).
`OnChainInvestPage.tsx` builds the joined list (legacy + `confirmedOfferings`, a
prop coming from `page.tsx` via 5.1) and shows each option's provenance:
"Fictitious demo company" for the old ones, "Data provided by the issuer itself
(demo)" for the new ones.

A necessary side effect of the refactor (not new scope, just keeping it
compiling): `RealPositionCard.tsx` (`/ativos`) and `OfferingDetailPage.tsx`
(`/negociar`) called the hooks with an index; both keep resolving against the
LEGACY list exactly as before (`RealPositionCard` always at index 0;
`OfferingDetailPage` via `getOnChainIndexBySlug`), only converting to the address
pair before calling. **`/negociar/token-pmes` and `/socios` are left out of this
phase**: no self-service offering gets the showcase with photo/logo nor shows up in
the internal dashboard's events; only `/investir/onchain` sees both sources. 🔴
**Later update**: `/negociar/token-pmes` also started seeing both sources; see
"`/negociar/token-pmes` showcase unified with self-service" further below.
`/socios` is still left out of the showcase (not requested).

### 🔴 Real incident: an investment skipped the `approve` because an unreliable read was treated as data

In the first end-to-end investment test on a self-service offering, the
transaction failed with `eth_sendRawTransaction: transaction gas limit too high
(cap: 16777216, tx: 21000000)`. Investigated thoroughly before fixing (never
assume the first explanation):

- **The 21 million gas was a symptom, not the cause.** `cast call`/`cast estimate`
  against the offering itself reproduced the real revert:
  `ERC20InsufficientAllowance(spender=<offering>, allowance=0, needed=<value>)`;
  the MockBRL `allowance` for that wallet/offering pair really was **zero**. A
  reverting call has no gas for `eth_estimateGas` to return; the "21,000,000" is
  MetaMask improvising a value when it can't estimate, not something this code
  defines (checked: no write hook in `useOnChainActions.ts` ever set an explicit
  `gas`, before or after the 5.2 refactor; the project's only fixed `gas` is
  `PUBLICATION_GAS_LIMIT`, from the publication flow, unrelated).
- **It wasn't the 5.2 refactor**: `useMyOnChainPosition` (the `allowance` read)
  and `useInvestOnChain` (the `aportar` write) always read the same
  `addresses` object, never different addresses; there is no (and there never was,
  even before the refactor) place in the code where the two could diverge.
- **The real cause**: `handleInvest()` passed `posicao.allowanceMockBrl` to the
  invest flow without checking whether that read had actually finished
  successfully. `useReadContracts` returned `0` both for "the chain answered:
  allowance is zero" and for "the read hasn't come back yet" and for "the read
  failed"; the three cases were indistinguishable by the return type, and only the
  first should have triggered the approve (the other two should have blocked the
  click, not let it through). The same defect had shown up minutes earlier as
  `metaMaxima=0` being displayed as the offering's "zero capacity": the same class
  of bug, two symptoms.
- **Why the read failed/lagged**: `NEXT_PUBLIC_SEPOLIA_RPC_URL` wasn't
  configured; every read in this app (client and server, the same variable, see
  `config.ts`/`eventsCore.ts`) fell back to `viem/chains`' default public Sepolia
  RPC (`https://11155111.rpc.thirdweb.com`), subject to rate limits, completely
  unrelated to `niara-contracts-PMEs`'s `SEPOLIA_RPC_URL` (without
  `NEXT_PUBLIC_`): a different variable, file and purpose, despite the similar
  name.

**Fix, on three fronts**:

1. **`NEXT_PUBLIC_SEPOLIA_RPC_URL` configured** (`.env.local`/`.env.example`, see
   the comment there); it fixes the root cause of slow/unstable reads. Still
   optional in code (it never breaks without it), but it must never be missing in
   production.
2. **A strict gate, the same principle as `useAuthorizedIssuer`** (which since
   sub-step 1 of Phase 3 already separates "the chain said no" from "I couldn't
   ask", see "`/empresa/ofertas` screen" above): `useOnChainOfferingTerms` and
   `useMyOnChainPosition` got a `ready: boolean` field, `true` only when
   **every** read in the multicall finished with `status: "success"` (not only the
   absence of an error in the query as a whole; an individual call inside a
   multicall can fail without the whole query being marked as an error), plus an
   `errorMessage: string | null`, translated via `describeOnChainError`.
   `RealOnChainInvestPanel.tsx` computes `leiturasProntas = termos.pronto &&
   posicao.pronto` and requires it in `investDisabled`; while not ready, the
   invest section shows "loading" or the error reason instead of the form, never
   the form with fallback numbers.
3. **A fallback never becomes data**: the individual fields (`metaMaxima`,
   `allowanceMockBrl`, etc.) still return `0`/`false` when their read fails; that
   didn't change and doesn't need to, because `ready` is now checked **before**
   any decision uses those fields. The defect was never the fallback value
   existing; it was someone deciding with it without checking whether it was real.

`RealPositionCard.tsx` (`/ativos`) uses the same two hooks but wasn't updated to
consume `ready`; it's a pure read with no invest button, a much smaller risk; it
stays as a known gap, not fixed in this round.

### 🔴 Real incident: a second investment attempt skipped the `approve` with a stale allowance

After the strict gate above, the same symptom (absurd gas because
`eth_estimateGas` failed on a reverting call) came back, this time with
confirmation that **none of the three test offerings had an approved allowance**
(`cast call` on all of them, allowance = 0). The real sequence: first click →
`approve` failed with "nonce too low" (the wallet's own error when signing, before
mining); second click → the revert already came from `aportar`, not `approve`; in
other words, the second attempt skipped the `approve` entirely.

**Cause**: `useInvestOnChain.investir()` decided whether to call `approve` by
comparing `valor` against an `currentAllowance` received **from outside**, as a
parameter (`posicao.allowanceMockBrl`, from the `useMyOnChainPosition` read
hook). After an attempt fails, `handleInvest()` triggers `posicao.refetch()`,
but that is async and **not awaited** before the button is re-enabled
(`invest.status` goes back to `"erro"`, which already re-enables the button,
before the refetch even starts). A fast enough second click inherited the
`currentAllowance` from BEFORE the previous attempt (in this case, luckily still
`0`, but the decision itself never rechecked the chain, so any delayed refetch
timing (a slow RPC, etc.) could produce the same skipped `approve` even with a
genuinely insufficient allowance). `investir()` also never checked
`approveReceipt.status`: if an `approve` was mined and reverted (instead of
failing at signing), the code went on to `aportar` anyway, the same class of bug
`confirmPublication()` had already had on the server side (a receipt existing ≠
the receipt succeeding).

**Fix**: `investir()` no longer receives `currentAllowance` from outside; it reads
`allowance` **straight from the chain, right then**, inside the function itself
(`publicClient.readContract`), immediately before deciding. No React state value
enters that decision. And `approveReceipt.status` is now checked explicitly:
`"reverted"` stops the sequence with its own message ("the approval reverted: the
investment wasn't attempted"), it never falls through to `aportar`.

The `simulateContract` above really ran and caught a real revert, but the
translated message lied about the cause (see "`describeOnChainError` never again
classifies a revert as an RPC outage" just below): the real revert was
`ERC20InsufficientAllowance` (selector `0xfb8f41b2`), not an RPC failure. Fixed
there; `0xfb8f41b2` also got its own entry in `chainErrors.evm.custom`
(`errors.ts`): the error belongs to the ERC20 (MockBRL), not to `OfertaCaptacao`,
so decoding the `aportar()` simulation against `ofertaCaptacaoAbi` never resolves
the error's NAME (it isn't declared in that ABI) and viem falls back to the raw
selector as `errorName`; the `ERC20InsufficientAllowance` entry (by name) still
exists for when decoding IS against `mockBrlAbi` directly (e.g. a reverting
`approve`).

### 🔴 Real incident, root cause found: MockBRL resolved as a global constant, but each offering has its own

After the two incidents above (stale allowance and a misclassified revert), the
symptom persisted only on self-service offerings, and only on them: "investing
works on the 10 legacy offerings (approve and aportar in the right order,
'Investment confirmed on-chain') but keeps failing on the offerings created via
`OfertaOrquestrador`", with `useInvestOnChain.investir()` being **exactly the
same code** for both sources; there is no branching by provenance once `addresses`
is resolved (see "Phase 4" above). The initial suspicion (an inverted order between
`simulateContract` and the allowance check) was ruled out by reading the code
directly; both blocks were already in the right order.

**Root cause, found by the user via Etherscan + `cast call`, not by a log**:
`cast call <self-service-offering> "moeda()"` returned
`0xEC377e00e022675B67Da6ab1966Bc0764bF792A4`, but the `approve` transaction the
screen sent (checked on Etherscan) had `to =
0xb99dda4e4d89f40324A7831970b8f37dBc35668F`, a **different** MockBRL. The screen
approved and checked the allowance against one token; `aportar()` spent from
another. The `approve` was mined with `Success` (the wrong address exists and
accepts the call normally); the allowance on the real offering stayed zero;
`aportar` reverted with `ERC20InsufficientAllowance`, the same symptom as the two
previous incidents, but from a cause neither of those fixes touched.

The root: `getMockBrlContract()` (introduced in sub-step 5.2's refactor, see
"Phase 4" above) resolved MockBRL as a **global constant**
(`NEXT_PUBLIC_MOCKBRL_ADDRESS`); a comment from that time even claimed
("confirmed by an on-chain read before coding") that a self-service offering's
`OfertaCaptacao.moeda()` "returned exactly" the same MockBRL as the legacy ones.
That check **was never done line by line against a real transaction**; it was only
assumed from an isolated read that, by coincidence or mistake, seemed to confirm
the wrong premise. `moeda()` **is not** a system constant: it is each
`OfertaCaptacao`'s own value, fixed when it was created. Confirmed later by `cast
call` on 3 sampled legacy offerings (`0xd4AC69a4c7Bfdc5E85c0e0da76ce12a1552b2704`,
`0xa60119428905fDf66BF967DE90A2F892985d99b2`,
`0x7EA155F38ACb1B7C119769A21988feEb21388e57`): all return
`0xb99dda4e4d89f40324A7831970b8f37dBc35668F`, matching
`NEXT_PUBLIC_MOCKBRL_ADDRESS`; the 10 legacy offerings do share one MockBRL (all
created by the same administrative script, which always uses the same fixed
address), and that's the only reason the old code "worked" there. Self-service
offerings, created via `OfertaOrquestrador.criarOfertaCompleta`, get the
orchestrator's own MockBRL, different from the env var, which is why they always
broke.

**Fix**: no code in this project reads MockBRL from a constant anymore:
`getMockBrlContract()`/`contracts.mockBrl` were removed from
`src/lib/web3/contracts.ts`, replaced by `getMockBrlContractAt(address)` (it only
pairs an ALREADY resolved address with the ABI; it does no read at all) and
`OnChainContracts` no longer has the `mockBrl` field. Every consumer now reads
`OfertaCaptacao.moeda()` **on-chain, from the selected offering itself**, before
deciding anything about MockBRL:
- `useOnChainOfferingTerms`/`useMyOnChainPosition` (`useOnChainOffering.ts`)
  became TWO-STAGE reads: the 1st `useReadContracts` reads everything that doesn't
  depend on MockBRL, including `moeda()`; the 2nd (`enabled` only after the 1st
  resolves) reads decimals/symbol/balance/allowance from the address returned by
  `moeda()`. `ready` requires both stages to succeed: the same strict gate as
  before, now also covering the resolution of MockBRL itself.
- `useInvestOnChain.investir()` reads `moeda()` fresh (`publicClient.readContract`)
  right at the start, before reading the allowance; the same "straight from the
  chain, now" read that has applied to the allowance since the previous incident
  now applies to the MockBRL address too.
- `useMintMockBrl` got an `addresses` parameter (it used to receive none) and
  resolves the offering's `moeda()` before minting; without it, the faucet would
  mint balance on the wrong MockBRL for any self-service offering.

Each hook resolves `moeda()` **independently**: none receives the address from
another hook as a prop/shared state, the same principle already applied to the
allowance ("never decide with a read that isn't your own"): a value resolved by
`useOnChainOfferingTerms` is never passed on to `useInvestOnChain`, for example.

🔴 **Old comments and texts claiming a single/shared MockBRL between the two
sources were corrected** (`contracts.ts`, `OnChainInvestPage.tsx`): the claim
"the same MockBRL as the 10 legacy ones" was the root of this incident, not a
cosmetic detail; leaving it in the code or the docs would have made someone
reintroduce the same bug later.

The temporary diagnostic (`console.log("[useInvestOnChain] decisão de
approve:", ...)`) added to investigate this incident was removed; the cause is
identified and fixed.

### `/negociar/token-pmes` showcase unified with self-service

The SME Token showcase, until then only with the 10 legacy offerings (fictitious
company + real Sepolia offering, see "Unification with fictitious SME companies"
above), now also shows the self-service offerings already confirmed on-chain
(`sync_status='confirmada'`, published by the issuer itself via
`OfertaOrquestrador`, see "`/empresa/ofertas` screen" → Phase 3) side by side, in
the same grid with the sector filter.

🔴 **No new upload was created**: the issuer's logo and banner already existed
(migrations `0010`/`0011`, `LogoUpload.tsx`/`BannerUpload.tsx` in `/perfil`'s
"Registration data", public buckets `issuer-logos`/`issuer-banners`) and were
already read by `loadActiveOfferingsByCategory()` (`src/lib/investments.ts`, used
by `RealOfferCard`/`MyOfferCard` on the same page). This change only extends
`loadConfirmedOnChainOfferings()` (`src/lib/web3/confirmedOfferings.ts`), until
then used only by `/investir/onchain` and without any of these fields, to also
select `category` and `issuers(sector, business_summary, logo_path, banner_path)`
and resolve `logoUrl`/`bannerUrl` with the same cache-busting technique
(`issuerLogoUrl`/`issuerBannerUrl` + `getIssuer*Version`) already used there.
`category` also already existed (`offerings.category`, migration `0009`, the same
5-value enum as the rest of the project) and is already required in the offering
creation form (`createOfferingSchema`, `empresa/ofertas/actions.ts`); none of this
needed a new migration.

**No photo sent by the issuer**: handled exactly like a legacy SME without a file
in `public/negociar/pmes/<slug>/`: `OfferingBanner.tsx` already silently shows the
category icon on the colored chip, with no "missing" text. A deliberate decision
(not an oversight): a "photo not sent" text notice would create a visual
inconsistency with the legacy ones and would read like an error in a public
showcase; the generic icon already says "no photo" without needing text.

**Slug**: self-service offerings have no readable slug column (only
`offerings.id`, a uuid); the URL uses the uuid itself as the segment:
`/negociar/oferta/<uuid>`. `loadConfirmedOnChainOfferingById()` (new, in the same
module) validates the uuid format before querying (`z.string().uuid()`, the same
pattern as `loadPublicOffering`), and never throws for a slug that isn't a valid
uuid; it just returns `null`, treated as "not found" by the route.
`src/app/negociar/oferta/[slug]/page.tsx` tries the mock list first (synchronous,
as before); it only queries Supabase when the slug matches no fictitious offering.

🔴 **The detail page is a new, separate component
(`SelfServiceOfferingDetailPage.tsx`), not a generalization of
`OfferingDetailPage.tsx` with conditionals**: a deliberate decision, central to the
"nothing simulated may look real" rule at the top of this file.
`OfferingDetailPage.tsx` is built entirely around the mock `Oferta` type: simulated
financials (`FinancialChart`), fictitious fundamental indicators
(`FundamentalIndicators`, `DEMO_INDICATORS`) and fixed terms. A
self-service offering is a REAL company; forcing it to fit the `Oferta` type would
require making up fictitious indicators/financials for a real company, the exact
inverse of what the rule forbids (normally the concern is "don't pretend the
fictitious is real"; here it would be the opposite, "don't invent fictitious data
about something real"). That's why `SelfServiceOfferingDetailPage.tsx` only shows:
the real banner/logo (`OfferingBanner`), terms + live investment from the chain
(`RealOnChainInvestPanel`, already 100% real, reused with no change at all), the
real sector/business summary (when the issuer filled them in), generic placeholder
documents (the same "Coming soon" `common.defaultDocuments` list as every offering; it
neither makes up nor omits anything company-specific) and the generic Res. CVM 88
risks (text identical to `OfferingDetailPage.tsx`'s, never specific to any company).

**Provenance**: the same distinction already used in `/investir/onchain`'s
selector (`dict.investOnChain.offeringSelector.provenance`): "Fictitious demo
company" (legacy) vs. "Data provided by the issuer itself (demo)"
(self-service), repeated as `dict.trade.smesOnChain.issuerData` on the
showcase card and `dict.trade.offering.selfServiceNotice`/
`.demoBannerSelfService` on the detail page; strings of their own in this area for
simplicity (two lines of text don't justify importing across dictionary areas).

**Showcase card**: `SelfServiceSmesCard.tsx` (new), a sibling of
`SmesOnChainCard.tsx` (legacy) instead of generalizing it: the same 3-column
layout (fundraising target/price per share/shares), but the numbers come from
`offerings.hard_cap_cents`/`share_price_cents` (never from the fixed
`ONCHAIN_SMES_*` constants, which only apply to the clone of the 10 legacy ones; a
self-service offering's terms vary by offering). 🔴 Showing these values without
re-reading the chain per card is safe, not a risky shortcut: for any offering with
`sync_status='confirmada'`, that same column was already checked against the
on-chain mined `metaMaxima`/`precoPorCota` by `confirmPublication()` (at
confirmation time) and keeps being rechecked on every "Verify consistency" call
(`checkConsistency()`, see "Continuous reconciliation" below); never a number
that only exists in Supabase without a check against the chain. The cents→mBRL
conversion is the same as `checkConsistency()`'s (`UNIT_ON_CHAIN`,
`src/lib/web3/gates.ts`: "1 MockBRL unit = 1 real equivalent"), only labeled
**mBRL, never R$** here (public showcase text), unlike that function's diff
messages, which are only for the issuer itself on the publication screen and use
`formatBRL` because they are an internal technical log, not a public surface. The
share count is derived (`hardCapCents / sharePriceCents`, the same formula as
`ActiveOfferingSummary` in `investments.ts`); safe because the contract would
already have reverted with `PrecoNaoDivideMetaMaxima` at publication if it didn't
divide exactly. `SmesSectorFilter.tsx` now accepts a discriminated union
(`SmesCardData`, an `origin: "legacy" | "selfService"` field) instead of only the
mock `Oferta` type, and picks the right card per item; the sector filter
(client-side, few items) extracts the sector from either source via a small
helper, ignoring self-service items without a filled-in sector (they don't create
an empty filter button, but they still show up when no filter is selected).

`CategoryPage.tsx` only fetches the self-service offerings when
`categoria === "pmes"`; `loadConfirmedOnChainOfferings()` doesn't filter by
category in the query (it's reused by `/investir/onchain`, which lists every
category), so the `category === "pmes"` filter happens after reading, in
`CategoryPage.tsx` itself.

---
## `/socios` screen (internal dashboard, restricted to the partners)

An administrative area separate from the rest of the site, never aimed at the end
investor/issuer. It shows transactions and totals combining real data (Sepolia,
via on-chain events) and demo/mock data (Supabase, `/investir`), **always in
separate sections/tables**, never mixed in a single row; the same honesty rule as
the rest of the project, applied in reverse here (the risk isn't mock looking
real, it's the two getting confused in an administrative dashboard).

🔴 **Access control is just an email allowlist, not a new "role"**:
`src/lib/auth/resolvePartner.ts` (`resolvePartner()`) is completely separate from
`resolveAccount()` (`resolveInvestor.ts`, investor/issuer); the two never mix.
Sign-in is still the same Supabase Auth as always (`signInWithPassword`, the
browser client, the same mechanism as `/entrar`, with its own form; it doesn't
redirect there nor touch that screen). The allowlist comes from
`NIARA_SOCIOS_EMAILS` (an env var, comma-separated emails), **never hardcoded in
the code**, because the repository is public. Signed in but outside the
allowlist is not redirected: it stays on the page with "Restricted access" + a
sign-out button. The partners' Supabase Auth accounts must exist beforehand
(created directly in the Supabase dashboard, Authentication → Add User; there is no
sign-up flow for this, it would be a parallel system).

**Real data** (`src/lib/web3/events.ts`): reads events with `viem getLogs`
**directly on the server**, with no connected wallet nor wagmi (unlike
`/investir/onchain`'s hooks, which are client-side and depend on MetaMask). Events
read, names checked directly in the `.sol` before writing any code (not assumed):
`Aporte`, `OfertaEncerrada`, `OfertaCancelada`, `CotasResgatadas`,
`RecursosLiberados`, `Reembolso`. The starting block is found automatically and
cached incrementally (`onchain_events_cache`/`onchain_sync_state`, migrations
0012–0014): if the saved MockBRL address doesn't match the current one, the code
understands there was a redeploy and recomputes the starting point (see
`findDeployBlock` in `eventsCore.ts`). `getSummaryOnChain()` reads `taxaBps`
**directly from the contract** of each configured offering (it never hardcodes 0,
even though that's the real value today, confirmed via `cast call` before writing
any text about fees on the screen).

**Mock data** (`investments` from Supabase), the same GOLDEN RULE as
`investments.ts` (a column allowlist, never `select('*')`). That schema **has no
fee field at all**; the screen doesn't invent one, it only explains that the
concept doesn't exist in that flow (`dict.partners.mockSummary.noFeeNote`).

**Fee shown**: today `taxaBps = 0` on every legacy offering (confirmed via `cast
call`, not assumed) → it shows "R$ 0.00" with an explicit note "taxaBps = 0 in this
demo, read directly from the contract: no fee is charged today". If an offering
ever has `taxaBps > 0`, the dashboard shows the real percentage read from the
contract, never a simulated/projected value presented as if it were a real
charge.

**Confirmed self-service offerings in the timeline**: when an offering reaches
`sync_status='confirmada'`, it shows up as one more row in the single timeline
(`TransactionsTable`, not a new section; reused on purpose, see the original
request): `listConfirmedSelfServiceOfferings()` (`src/lib/partners/transactions.ts`)
reuses `loadConfirmedOnChainOfferings()` without any new read (the same function
already used by `/investir/onchain` and the `/negociar/token-pmes` showcase).
Display only, no action: the issuer's name (`ator`), min–max target + price per
share + deadline condensed into a single string (`valor`; the table only has one
value column, the same pattern as any other timeline row), a link to the contract
on Etherscan. `origem: "onchain"` (the "Real — Sepolia" badge) even though the
read itself comes from Supabase: the referent (the offering/contract) is real on
Sepolia, only mirrored in the database, and that mirror is already checked against
the chain at confirmation and on every reconciliation (see "Continuous
reconciliation" below), never a made-up value. Values in **mBRL, never R$**: the
same rule already applied in `SelfServiceSmesCard.tsx`, and consistent with the
OTHER rows of this same table (real on-chain events already use
`mockBrlSymbol`/mBRL in the "Value" column; mixing R$ in there would clash within
the column itself). `loadConfirmedOnChainOfferings()` got
`issuerAccountId`/`targetMinCents`/`opensAt`/`closesAt`/`onchainConfirmedAt` in
this change (before it only had `hardCapCents`/`sharePriceCents`);
`issuerAccountId` is also used in `/negociar/oferta/[slug]` to decide `isIssuer`
(see "Close offering" unlocked for the issuing company, just below).

### 🔴 "Close offering" also unlocked for the issuing company, not only the partners

Until here, `RealOnChainInvestPanel.tsx` only unlocked the "Close offering" button
for `isPartner` (the Niara team). It now also unlocks it for `isIssuer`, `true` only
when the signed-in issuer (`resolveAccount()`) owns the self-service offering
being shown (`accountId === offerings.issuer_id`, resolved in
`/negociar/oferta/[slug]/page.tsx` and passed down by
`SelfServiceOfferingDetailPage.tsx`). 🔴 **Only applies to self-service
offerings**: the 10 legacy ones have no `issuer_id` in this app (they were created
by an administrative script, a fictitious company in `mock/offerings.ts`, with no real
issuer account behind them), so `isIssuer` can never be computed for them and the
button stays restricted to `isPartner` there (`OfferingDetailPage.tsx` didn't get this
prop). `/investir/onchain` (`OnChainInvestPage.tsx`, the presenter's
multi-offering tool) was also left out on purpose: it doesn't require a sign-in,
so there is no issuer account to compare with, and its real use is an in-person
demo, not the company managing its own offering (which already has
`/negociar/oferta/<id>` for that; see the link below).

🔴 **The button's copy keeps the explanation in the right direction**:
`encerrar()` was already permissionless in the contract before this change (any
wallet can call it directly on the network once eligible); that didn't change now,
and the copy (`dict.investOnChain.close.description`/`.restricted`) was
reinforced to make that even more explicit: the contract's permissionless design
is intentional, so no investor is held hostage by the platform or the issuing
company to recover their investment in a fundraising that didn't close. The
button in this UI never controls who CAN close on-chain; it only decides who sees
a convenient shortcut for it.

**Discovery**: `OfferingsPage.tsx` (`/empresa/ofertas`) got a "View public offering
→" link in the `confirmada` status block, pointing to `/negociar/oferta/<id>`;
without it, the issuer had no way to find its own detail page (and therefore the
"Close offering" button) after publishing; the `confirmada` block used to show
only the contract/token addresses with Etherscan links, no link back into the app.

---

## `/empresa/ofertas` screen (offering creation and management by the issuer)

Only accessible to `role==='issuer'`. `OfferingsPage.tsx`: a creation form
(`createOffering()`: fundraising size, minimum target, additional lot 0–25%, a
1–180 day window, value per share, category) + a "My offerings" list with an
"Activate" action (`activateOffering()`, `draft→active`, the only possible
transition) and, once open, "Close fundraising" (`closeOffering()`, which runs the
all-or-nothing closing and issues the mock tokens). See "Backend (Supabase)" →
"Fundraising cycle" above for the full mechanics (the hard cap computation, race
protection on activation, error translation by constraint). This is the same list
`MyOffersSection.tsx` summarizes, read-only, inside `/perfil` (see "`/perfil`
screen", section "2. My offerings").

Phase 3 (self-service publication on Sepolia, see
`PLANO_FASE_3_PUBLICACAO_ONCHAIN.md`, the full plan, not repeated here) adds
`/empresa/ofertas/[id]/publicar`: the issuer itself signs
`OfertaOrquestrador.criarOfertaCompleta` with its own wallet.
`src/app/empresa/ofertas/onchain-actions.ts` (`registerAttempt`/
`confirmPublication`) and `src/lib/web3/hooks/usePublishOfferingOnChain.ts`. The
route is already linked from `OfferingsPage.tsx`: a `draft` offering with
`sync_status='nao_onchain'` shows the "Publish on-chain →" link in place of the old
"Activate" button (disabled since before this phase, see section 1.1 of the plan);
`pendente`/`divergente` show the state + a link to the same route; `confirmada`
only shows the state (contract/token addresses with Etherscan links), never a
button; the publication already happened.

**End-to-end test validated after the `expected_emissor_wallet` fix below**: a
new offering, issuer `0x21443ADa1d36e5DCAadD62896Ca2c21aDFE396E1` (a clean wallet,
never used to sign anything before, authorized via `autorizarEmissor` only for this
test), hash
[`0x8f3010c9a2287848bfcf351dfdbcb73b0203e22d707b3a32954a2c89be07866a`](https://sepolia.etherscan.io/tx/0x8f3010c9a2287848bfcf351dfdbcb73b0203e22d707b3a32954a2c89be07866a).
This time MetaMask did **not** rewrite the transaction into an EIP-7702 envelope:
`to` went directly to `OfertaOrquestrador`, with no delegation involved (not every
account becomes EIP-7702; the first time was MetaMask's choice for that account
specifically, not something this project controls or can prevent from the dApp
side; that's why log-based validation stays the only correct approach, regardless
of which of the two formats shows up). `sync_status` reached `confirmada` by
itself, with no need for "Reprocess": offering
`0xE340Bb941E3FADfEbe2454dFd17a10F35b4A5EF6`, token
`0x0dB0FaB0a41891f023aF58C9AE9C271575590F56`, both read from the
`OfertaCompletaCriada` event, both confirmed as registered in the factories
(`isOferta`/`isCaptacao`).

The old "Empresa Teste" offering (the one left `divergente` by the original
EIP-7702 incident) was **successfully reprocessed** through the same path (a click
on "Reprocess" on the screen itself, no manual UPDATE) and also reached
`confirmada`, using the `expected_emissor_wallet` value recovered by migration
0016's backfill (`0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6`, the same wallet
that actually signed that transaction). Both test offerings in this repository are
`confirmada` today.

### 🔴 EIP-7702: MetaMask may rewrite the transaction; never validate by `receipt.to`

A real incident, not a hypothetical one: in the first end-to-end test (issuer
`0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6` signing `criarOfertaCompleta` through
MetaMask), the mined transaction (`0x533a5bc4…`) had `type: 4`, an **EIP-7702**
transaction ("Set Code Transaction", part of Pectra, which Sepolia already
supports), with `to = 0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`, an
infrastructure contract of MetaMask itself (23KB of bytecode, unrelated to this
project), **not** the `OfertaOrquestrador` (`0xde9cC84d…796e5`) that MetaMask
showed on the confirmation screen and that `writeContractAsync` actually received
as the target. The transaction's `authorizationList` contained an authorization
signed by the issuer itself delegating its account to a MetaMask implementation
contract (`0x63c0c19a…`); confirmed by reading `cast code` of the issuer's account
**after** the transaction: `0xef010063c0c19a282a1b52b07dd5a65b58948a07dae32b`.
`0xef0100` is the standard prefix of the EIP-7702 "delegation designator": from
that transaction on, **the issuer's account stopped being a pure EOA,
permanently** (it stays that way until a new EIP-7702 authorization changes it),
and started having bytecode. Any future logic assuming "user wallet = EOA without
code" needs to know this, including outside this publication flow.

The call itself worked perfectly (checked, not assumed): the real
`OfertaOrquestrador` emitted `OfertaCompletaCriada` with the right issuer, the
token/offering exist on-chain and are registered in both factories
(`isOferta`/`isCaptacao` = `true`). The problem was only that
`confirmPublication()` validated by comparing `receipt.to ===
orquestrador.address`, a check MetaMask itself can invalidate by rewriting the
transaction behind the scenes, after the dApp already requested the original call.
`receipt.to` **never proves what the transaction did**; only the log emitted by
the contract itself proves it (only `OfertaOrquestrador` can emit a log with
`log.address` equal to its own; that is unforgeable in the way `to` isn't).

**Rule locked from this phase on**: no on-chain write verification in this project
compares `receipt.to` against the expected address. The correct validation is
always: (1) there is a log whose `address` is the expected contract and that
decodes as the expected event; (2) the event's indexed/decoded parameters match
what Supabase expected (including the issuer, compared against the value frozen in
`offerings.expected_emissor_wallet`; see "expected_emissor_wallet" just below; not
against `receipt.from`/`to` nor against a live re-read of
`issuers.wallet_address`); (3), when applicable, the resulting addresses (clones)
are actually registered in the source contract (`isOferta`/`isCaptacao`), not just
"some contract exists at that address". `confirmPublication()` in
`onchain-actions.ts` is the reference implementation of this.

### 🔴 `expected_emissor_wallet`: never compare the event against a live read of `issuers.wallet_address`

A second real bug, found while adding the "Reprocess" button that fixed the
EIP-7702 incident above. `confirmPublication()` compared the event's `emissor`
against `issuers.wallet_address` read **at confirmation time**, which answers a
different question from the one that needs answering. The right question is "who
had authority **at the moment they signed**?"; the old version answered "who is
linked **now**?". The two only coincide by chance while `confirmPublication` runs
right after the signature (the original happy path), but "Reprocess" exists
precisely to run that function at any distance in time from the signature, and
`issuers.wallet_address` may have changed in that interval (e.g. the company links
a new wallet in `/perfil` months later). Reconfirming an old offering would compare
the event against the **wrong** wallet, silently.

Fixed with `offerings.expected_emissor_wallet`
(`supabase/migrations/0016_offering_expected_emissor_wallet.sql`):
`registerAttempt()` reads `issuers.wallet_address` **on the server itself**, at
the moment of the attempt (the same moment it already froze
`opens_at`/`closes_at`), and writes that frozen value, never accepted from the
client, for the same reason `accountId` never comes from the client in any Server
Action of this project: a malicious client could simply declare the very wallet
that is going to sign as the "expected" one, and the whole check would become
theater. `confirmPublication()` compares the event's `emissor` only against this
column; it never reads `issuers` directly anymore. Fail-closed:
`registerAttempt()` refuses to register the attempt if `issuers.wallet_address`
is null (gate 5 on the client should already have prevented getting here; this is
the same check, on the server).

The column is cleared together with `tx_hash` when a reverted transaction is reset
(`sync_status: pendente/divergente → nao_onchain`): both belong to the same
attempt, and a new attempt via `registerAttempt()` must be able to refreeze both
from scratch. That's why it stays **out** of 0015's immutability trigger
(`enforce_onchain_publish_immutable`, the same treatment `tx_hash` already gets)
and gets its own conditional trigger (`enforce_expected_wallet_locked`, 0016): it
locks the column when the change would take the row **to**
`confirmada`/`divergente` (the two states in which the value has done its job as a
comparison and becomes a historical fact), and allows it when the target is
`nao_onchain` or `pendente`; checked on `NEW.sync_status`, not `OLD`, because the
legitimate reset after a revert can start from either `pendente` or `divergente`.

🔴 **A migration with a backfill, checked by hand**: the only row affected when
0016 ran (the "Empresa Teste" test offering, then in `sync_status='divergente'`
because of the EIP-7702 incident itself) had no `expected_emissor_wallet`; the
migration does a general backfill (a join with `issuers.wallet_address`, not
hardcoded) for any row in `pendente`/`divergente`/`confirmada` without the frozen
value, and prints a final SELECT comparing "before"/"after" for a manual check in
Studio before moving on. That is only safe **as long as the linked wallet hasn't
been switched** since the original signature, which is why the migration was run
and checked (`0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6` on both sides) before any
change of linked wallet for the affected accounts.

### Continuous reconciliation (`checkConsistency`): sub-step 5 of the plan

The on-chain offering is **immutable** once created, but the `offerings` row isn't:
nothing prevents a manual `UPDATE` (or a future bug) on `hard_cap_cents`/
`share_price_cents`/`target_min_cents`/`closes_at` after confirmation.
`checkConsistency(offeringId)` (`onchain-actions.ts`) reads live, directly
from the already written `contract_address`, the `metaMinima`/`metaMaxima`/
`precoPorCota`/`prazo` getters of the `OfertaCaptacao` clone (truly `immutable`
values, written only once in `initialize`, never changed afterwards, so a read now
is as good as the original event) and compares them against the **current** values
of the Supabase row. **It never fixes either side**: it only marks `sync_status`
and writes the reason in `onchain_last_error`; the fix, when there is one, is always
human (the chain never changes, so only Supabase can be wrong).

🔴 **`divergente` now covers TWO distinct causes, told apart by
`contract_address`, not by a new column**: without an address written, it is a
`confirmPublication()` failure that never got to confirm (a missing log, the wrong
event, an unregistered clone), fixed only by "Reprocess". With an address written,
it can only be a post-confirmation consistency drift, fixed by "Verify consistency"
(`checkConsistency`), never by "Reprocess" (which would depend on re-decoding
the original event, unnecessary here). `PublishOnChainPage.tsx` decides which of
the two buttons to show by checking `displayContract`.

**When it runs**: automatically, once, when opening `/empresa/ofertas/[id]/publicar`
for a `confirmada` offering (or a `divergente` one that already has
`contract_address`), the same pattern already used for `confirmPublication` on
`pendente` offerings. Also on demand, through the "Verify consistency" button in the
`confirmada` and drift-`divergente` panels. **Never** on the `/empresa/ofertas`
list (a card per offering there only shows the last known `sync_status`, with no new
read) nor in polling: every call is a real RPC read (`eth_call`, no gas, but still a
request against the configured RPC), and its cost must stay proportional to how many
times a human actually opens that specific offering, not to how many offerings exist
nor how much time passes.

`SyncStatusBadge.tsx` (`src/components/empresa/publicar/`): a small reusable
`sync_status` indicator, used on `OfferingsPage.tsx`'s card (replacing the ad hoc
titles each panel had before) and in the `MyOffersSection.tsx` summary (`/perfil`,
which used to show only `offerings.status`, never `sync_status`).
`PublishOnChainPage.tsx` doesn't use the badge: it already communicates each status
with its own, more detailed panel; the badge exists for the two places that only
have room for a compact indicator.

**Proof that it works (pending the user's confirmation in the browser; see the
instructions given outside this file)**: `hard_cap_cents` of one of the two
`confirmada` offerings is edited directly in Supabase (±1 cent: small enough to
never violate the `additional_lot` CHECK, big enough for the exact `bigint`
equality comparison to flag it), the screen must turn `divergente` with the reason
citing both values (Supabase vs. on-chain), and with the original value restored,
"Verify consistency" must bring `confirmada` back by itself, without touching any
transaction in either direction. Update this paragraph once confirmed.

### 🔴 Real incident: a revert for a Res. 88 violation showed a generic message and the wrong advice

An old test offering (min target R$1,000, cap R$5,000,000: an additional lot of
~500,000% against the 25% limit of Res. 88) was published on purpose to test the
error path. The contract correctly reverted (`LoteAdicionalExcedeLimite`), but the
screen only showed "The transaction reverted on-chain: try publishing again", which
is **wrong** advice: the offering's values are permanent, so publishing again would
revert exactly the same way.

**Cause, investigated before fixing**: the custom error mapping
(`chainErrors.evm.custom`/`describeOnChainError`, `errors.ts`) already covered
`LoteAdicionalExcedeLimite` since sub-step 4; the message existed. The problem is
that this mapping **was never consulted** on the path that transaction took.
`criarOfertaCompleta` is signed with a **fixed** `gas` (`PUBLICATION_GAS_LIMIT`,
see `usePublishOfferingOnChain.ts`) on purpose (to avoid false reverts due to gas
price volatility, see the section above); that means MetaMask never runs
`eth_estimateGas` before signing, so a call that reverts because of a business
rule **throws no exception at all on the client**: it is mined normally, just with
`status: "reverted"`. Only the server (`confirmPublication`, in the
`receipt.status === "reverted"` branch) saw that transaction, and that branch had
never tried to decode the reason; it just wrote the generic sentence directly.

**Fix**: a transaction's receipt doesn't store the revert reason (the EVM doesn't
record it there); the only reliable way to find out is to **re-simulate the same
already-mined calldata** against the chain. `describeRevertReason()`
(`onchain-actions.ts`) reads the original transaction (`client.getTransaction`),
decodes the arguments back with `decodeFunctionData` (never rebuilt from Supabase,
which may have changed already), and calls `client.simulateContract` with those
same arguments, which decodes the custom error the way `describeOnChainError`
already knows how to translate, the same function used in the client-side catch.
No new translation logic: only the missing path that calls the existing one.

The error messages that describe the offering's own permanent values
(`PrecoInvalido`, `PrazoInvalido`, `PrazoExcedeLimite`, `MetaMaximaExcedeTeto`,
`LoteAdicionalExcedeLimite`, `PrecoNaoDivideMetaMaxima`) were rewritten to never
again suggest "try again": they all now end with "this offering needs to be
recreated... publishing again will revert the same way", because trying again with
the SAME numbers always reverts the same way (the chain is deterministic).

**A pre-validation gate, before spending gas**: the three numeric limits of Res. 88
(cap ≤ R$15,000,000, additional lot ≤ 25% of the base amount, deadline ≤ 180 days)
are known directly from Supabase, with no on-chain read at all;
`/empresa/ofertas/[id]/publicar/page.tsx` checks all three **before** rendering any
gate/button, the same pattern already used for `status !== 'draft'` and
`share_price_cents === null` (both in the same file). It only blocks when
`sync_status === 'nao_onchain'`: an offering already `pendente`/`divergente` still
reaches `PublishOnChainPage.tsx` normally, because that is where the
reconciliation (`confirmPublication`, already fixed above) needs to run and write
the decoded reason; blocking statically there would leave those offerings stuck
forever, never reconciling. The message explains which limit failed (with the real
values formatted in R$) and makes it explicit that the offering must be **recreated**
in "My offerings", not republished.

---

## Solana Devnet (multichain, Oct 2026)

The SME on-chain cycle also runs on **Solana Devnet**, through the Anchor program
`niara-pmes-solana` (repository `niaragaed/niara-pmes-solana`, program ID
`FKefGFhUmgXBM1xCtSFBWpoNnp3wuPJs6Yddpsp67J2y`), a port of the same rules as
`OfertaOrquestrador`/`OfertaCaptacao` (Res. CVM 88 limits, escrow, a 1% fee, one
open offering per issuer). Built during the Colosseum hackathon (Crypto World's
Fair).

- **Client** in `src/lib/solana/`: `config.ts` (program ID, RPC, units; the SPL
  MockBRL has **6 decimals**, so cents × 10^4, never Sepolia's `UNIT_ON_CHAIN`),
  `program.ts` (PDAs and reads with Anchor's coder from the IDL copied into `idl/`),
  `instructions.ts`, `phantom.ts` (the wallet only signs; sending always goes through
  the devnet RPC), `errors.ts` (messages from the IDL itself) and `server.ts`
  (server-only: an `OfertaCriada` event is only accepted when emitted by our program
  + an offering account owned by the program).
- **Investor**: `/investir/onchain` also lists the program's offerings
  (`?rede=solana` opens straight on them) and `SolanaInvestPanel` does faucet →
  invest → close → redeem (shares in a **frozen**, non-transferable SPL account) /
  refund → release. No `approve`.
- **Issuer**: `/empresa/ofertas/[id]/publicar` lets them choose the network while
  `sync_status='nao_onchain'`; `PublishSolanaPage` + `solana-actions.ts` follow the
  same golden rules as Sepolia. Difference: the transaction signature is known before
  sending, so the attempt is registered **before** going to the network; an attempt
  that never reaches the network goes back to `nao_onchain` by itself (expired
  blockhash).
- **Database** (migration 0017): `offerings.rede` (`sepolia`/`solana-devnet`),
  per-network format CHECKs (base58 on Solana), `chain_id` only on Sepolia, `rede`
  immutable once there is an attempt or a written address, and
  `solana_wallet_address` on `issuers`/`investors`.
- **Linking the Solana wallet** (`/perfil`, `src/app/perfil/solana-actions.ts`)
  requires proof of ownership: Phantom signs (signMessage, free) a message issued by
  the server with the account and the time; the server checks the ed25519 signature
  before writing.
- `ConfirmedOnChainOffering` became a discriminated union by `rede`: code that uses
  viem/wagmi must check `rede === "sepolia"` before using `contractAddress` as
  `0x${string}`.
- Admin (authorizing issuers, demo offerings, pausing/canceling) is done by the
  `scripts/admin.ts` script in the `niara-pmes-solana` repository, with the wallet
  that is the program's upgrade authority.

## Organization

```
src/
  proxy.ts             Next 16 (was middleware.ts) — only refreshes the
                       Supabase session on each navigation, see "Backend
                       (Supabase)"
  app/                 routes (App Router) — route segments stay Portuguese,
                       see "Language"
    layout.tsx         async root layout (Next 16): reads the locale, sets
                       <html lang>/metadata, mounts <I18nProvider> and
                       <Providers> (wagmi/react-query) with initialState
                       from the cookie
    providers.tsx      Providers (WagmiProvider + QueryClientProvider) —
                       see "/perfil screen", section "4. Wallet"
    actions/set-locale.ts  switchLocale() — sets the niara_locale cookie
    cadastro/          account creation (3 steps), see "/cadastro screen" —
                       actions.ts: createAccount()
    entrar/            sign-in (full-screen overlay, see "/entrar screen");
                       async searchParams (Next 16) for ?intent=captacao
    conta/page.tsx     redirect shim to /perfil (keeps ?aviso=/?onboarding=),
                       see "Backend (Supabase)" → "Authentication"
    perfil/            profile screen (see "/perfil screen") — actions.ts:
                       loadProfile/updateProfile/loadMyOfferingsSummary/
                       saveWallet/unlinkWallet/uploadIssuerLogo/...;
                       solana-actions.ts: Solana wallet linking (signed proof)
    investir/          list + real reservation (see "/investir screens") —
                       actions.ts: reserveInvestment/confirmInvestment/
                       loadPublicOffering; kyc-actions.ts: submitKyc;
                       [offeringId]/ is a dynamic route with its own
                       not-found.tsx
    investir/onchain/  REAL investment on Sepolia/Solana Devnet (a real
                       blockchain, not Supabase) — see "/investir/onchain
                       screen"; no login/role gate, driven by the wallet
    empresa/ofertas/   offering creation/activation/closing by the issuer
                       (see "/empresa/ofertas screen") — actions.ts:
                       createOffering/activateOffering/closeOffering;
                       onchain-actions.ts (Sepolia) and solana-actions.ts
                       (Solana): registerAttempt/confirmPublication/
                       checkConsistency; [id]/publicar/ is the publication
                       screen; diagnostico/ is the internal read-only tool
    socios/page.tsx    restricted internal dashboard (see "/socios screen")
                       — email allowlist, never facing the investor
    api/cron/sync-onchain/  cron that advances the on-chain event cache
    ativos/page.tsx    mock portfolio dashboard (see "/ativos screen") — not
                       to be confused with /investir (real)
    sobre/documentos/  docs + FAQ (see "/sobre/documentos and /sobre/contato")
    sobre/contato/     contact form via mailto (same)
    negociar/          hub + 5 categories + offering detail (see "/negociar
                       screens"); oferta/[slug]/ is a dynamic route with its
                       own not-found.tsx
  components/          folders named after the route they serve
    cadastro/          SignUpPage (3-step flow)
    investir/          InvestPage (list + my reservations),
                       OfferingDetailPage (+ ReserveTicket)
    investir-onchain/  OnChainInvestPage (thin host: title + selector) +
                       RealOnChainInvestPanel (reusable core of the real
                       Sepolia investment, also mounted inside
                       negociar/OfferingDetailPage) + SolanaInvestPanel
    empresa/           OfferingsPage (create/activate/close offering),
                       OnChainDiagnostics (internal read-only tool);
                       publicar/: PublishOnChainPage, PublishSolanaPage,
                       PublicationNetworkChoice, GateChecklist,
                       PublicationTerms, SyncStatusBadge
    socios/            PartnersLoginForm + PartnersDashboard,
                       TransactionsSection/Table/Skeleton, SummaryCards
    conta/             SignOutButton (also reused by /socios)
    ativos/            AssetsPage (tabs + demo banner), PortfolioSummary
                       (KPIs), PortfolioEvolutionChart and AllocationDonut
                       (recharts), PositionsTable, AssetCatalog,
                       RealPositionCard
    perfil/            ProfilePage (sidebar + badges + banners),
                       ProfileContext (investor profile, in memory — the
                       only part of this screen that stays in memory, see
                       "/perfil screen"), ProfileNav, PersonalDataSection
                       (real data in the database) + AvatarUpload
                       (simulated) + LogoUpload/BannerUpload (real issuer
                       uploads), MyOffersSection (real summary, read-only),
                       InvestorProfileSection + InvestorProfileQuiz +
                       InvestorProfileResultCard, WalletSection +
                       SolanaWalletSection, FormField (shared
                       TextField/SelectField/TextareaField/ReadField)
    web3/              ConnectWallet + ConnectionPanel — real wallet
                       connection (MetaMask/Sepolia), adapted from
                       niara-site (see "/perfil screen", "4. Wallet")
    solana/            ConnectPhantom, NetworkBadge
    documentacao/      DocsPage (sidebar by section + current stage banner),
                       DocsNav, FaqAccordion
    contato/           ContactPage (form + direct contact panel),
                       ContactForm (sent via mailto)
    negociar/          HubPage, CategoryPage (template of the 5 categories,
                       includes RealOfferCard next to the fictitious
                       catalog), CategoryChip (CategoryChip + CategoryBadge),
                       CategoryCard, ShowcaseCard, SmesOnChainCard (the 10
                       legacy SME offerings — real on Sepolia + fictitious
                       company) + SelfServiceSmesCard (self-service SME
                       offerings confirmed on-chain), SmesSectorFilter
                       (joins both origins, discriminated union
                       SmesCardData), OfferingBanner (photo + logo, with a
                       placeholder), OfferingDetailPage (+ FinancialChart +
                       FundamentalIndicators + IndicatorHelp, only for
                       legacy/fictitious offerings) +
                       SelfServiceOfferingDetailPage (lean sibling, no
                       fictitious sections), OrderTicket (simulated order
                       ticket, only for offerings with no real offering
                       behind them), MyOfferCard
    entrar/            SignInPage (full-screen overlay, split + form),
                       VideoCover (YouTube video cover)
    hero/              hero (headline, CTAs), HeroParallaxLayers (glow +
                       ringed planet motif, decorative)
    nav/               Header/HeaderClient, NavDropdown, AccountMenu,
                       LanguageSwitcher, Footer
    motion/            Reveal/RevealGroup (framer-motion micro-reveals)
    scroll/            LenisProvider (smooth scroll + ScrollTrigger sync)
    sections/          home scroll narrative, incl. the "How it works" pin
    ui/                shared (Logo, SectionGlow)
  lib/
    i18n/              pt-br.ts + en.ts (dictionaries, same keys),
                       dictionaries.ts (Dictionary type), locale.ts (Locale,
                       cookie, Accept-Language, htmlLang/intlLocale,
                       LocalizedText/localize), server.ts (getDictionary/
                       getLocale), client.tsx (I18nProvider/useDictionary/
                       useLocale) — see "Language"
    supabase/          client.ts (browser) / server.ts (Server
                       Components/Actions) / admin.ts (service role,
                       bypasses RLS, server-only) — see "Backend (Supabase)"
    auth/resolveInvestor.ts  resolveAccount() — the single source of
                       userId/role/accountId
    auth/resolvePartner.ts  resolvePartner() — email allowlist for /socios,
                       entirely separate from resolveAccount()
    partners/transactions.ts  the /socios timeline (Supabase investments +
                       on-chain events + confirmed self-service offerings)
    registration-schemas.ts  zod field schemas shared by the registration
                       and profile Server Actions (messages from the
                       dictionary)
    ports.ts           PaymentGateway/KycProvider/ChainRegistry interfaces
    adapters.ts        picks the implementation by env var, mock by default
    mocks.ts           mock payment/KYC/issuance — every ref prefixed
                       "MOCK-", see "Backend (Supabase)" → "Ports & adapters"
    investments.ts     offering/investment reads with an explicit
                       allowlist (never select('*'))
    money.ts           MONEY_FORMAT (regex) / reaisToCents / centsToReais —
                       parsing of the pt-BR money fields of the real forms
    storage/           issuer-logo.ts / issuer-banner.ts — upload and
                       versioned URL in Supabase Storage
    assets/derive.ts   pure derivation functions (totals, allocation by
                       class/asset/region) from the /ativos mock
    categories.ts      CATEGORY_META: icon + color tokens + href per token
                       category, used on the /negociar screens
    format.ts          formatBRL/formatSignedBRL/formatPercent (Intl pt-BR)
    investor-profile.ts pure investor profile scoring/categorization (the
                       questionnaire content comes from the dictionaries)
    masks.ts           format masks and checks (CPF/CNPJ/CEP/phone/date) —
                       format/length only, no check digit
    nav-items.ts       getNavItems(dict) — shared Header/Footer items
    nav/headerAccount.ts  account state for the header menu
    web3/config.ts     wagmi config (Sepolia chain, injected connector)
    web3/addresses.ts  addresses of the LEGACY offerings (NEXT_PUBLIC_* env
                       vars, never hardcoded)
    web3/contracts.ts  pairs an already resolved {token, offering} pair with
                       the ABIs; MockBRL is never a constant — always read
                       from OfertaCaptacao.moeda() per offering
                       (getMockBrlContractAt)
    web3/abis/         MockBRL/OfertaCaptacao/ParticipacaoToken/
                       OfertaOrquestrador/factories ABIs, extracted from
                       niara-contracts-PMEs/out/ (forge build)
    web3/errors.ts     describeOnChainError(error, dict.chainErrors.evm)
    web3/hooks/        useOnChainOffering (reads) + useOnChainActions
                       (mint/invest/close/redeem/release),
                       useAuthorizedIssuer, usePublishOfferingOnChain,
                       usePublishOnChainGates
    web3/gates.ts      pure evaluation of the publication gates
    web3/orchestrator.ts  OfertaOrquestrador address + network
    web3/confirmedOfferings.ts  confirmed self-service offerings (both
                       networks), allowlisted reads
    web3/events.ts + eventsCore.ts  on-chain event reads (viem getLogs,
                       server) with the Supabase incremental cache
    web3/format.ts     formatToken/formatEth/formatDeadline — on-chain value
                       formatting (bigint)
    web3/demoConstants.ts  fixed target/price/cap/shares/deadline of the 10
                       legacy Sepolia offerings, mirrored from the Solidity
                       script
    solana/            config, program (PDAs/reads), instructions, phantom,
                       errors (describeSolanaError), server (server-only
                       publication checks), hooks/, idl/
    trade/offeringAssets.ts  getOfferingAssetPaths() (server-only, fs) —
                       resolves real banner.jpg/logo.png in
                       public/negociar/pmes/<slug>/ or null (placeholder)
    mock/assets.ts     typed fictitious data of /ativos (positions, monthly
                       evolution, catalog) — never real data
    mock/onChainOfferings.ts  ONCHAIN_SMES_SLUGS_IN_ORDER — maps slug →
                       index in NEXT_PUBLIC_OFERTAS_ONCHAIN (the position in
                       the list IS the index)
    mock/offerings.ts  categories + fictitious offerings of the /negociar
                       screens (public data, financials, fundamental
                       indicators, terms) — never real data; the 10 in the
                       pmes category derive their terms from
                       web3/demoConstants.ts
public/
  niara-pme-logo.png   official logo (globe + ring + "NIARA", transparent
                       black PNG — only works on a light background)
scripts/
  seed-demo.ts         `npm run seed:demo` — see "Demo seed"
  backfill-onchain-cache.ts  `npm run backfill:onchain` — first full scan
                       of the on-chain event cache, outside Vercel's 60s cap
supabase/
  migrations/          0001–0017, schema + Res. CVM 88 invariants in
                       triggers/CHECKs, see "Backend (Supabase)"
```

---

## Conventions

- **Client components:** anything that uses canvas, WebGL, `framer-motion` with
  scroll hooks, or a mouse/keyboard listener needs `"use client"` and cleanup in
  `useEffect`.
- **Accessibility:** dropdowns with `aria-haspopup`, `aria-expanded`, proper
  roles, visible focus, closing with Esc and click outside; decorative images
  with `aria-hidden`.
- **Always responsive:** test desktop, tablet and mobile (hamburger menu +
  accordions).
- **Interface copy:** always through the dictionaries, in both languages (see
  "Language").
- **Logo:** the `<Logo />` component (`next/image`, path in the `LOGO_SRC`
  constant in `src/components/ui/Logo.tsx`), pointing to the official art
  `public/niara-pme-logo.png` (globe + ring + "NIARA", black on a transparent
  background — the art only, without "PMEs"). The "PMEs" descriptor is
  rendered as real text next to the image (`· PMEs`, `font-display`,
  `text-ink-muted`), not part of the file, because the art doesn't include it
  and it's still needed to tell it apart from the exchange product
  (`niara-site`). Black, it only works on a **light** background (Header,
  Footer) — if it's ever used on a dark background (`bg-military`, solid
  sections), it needs its own light version; don't reuse the same art there.

---

## Workflow

1. Before coding, read the files involved — don't assume.
2. Run `tsc --noEmit` and `npm run lint` at the end of each part; fix what
   shows up.
3. Run `npm run dev`/`build` to confirm it compiles and the routes respond
   without SSR/WebGL errors.
4. **Local commit at the end of each part**, message in **English** in the
   `feat:` / `fix:` / `refactor:` / `chore:` pattern.
5. 🔴 **No AI attribution** in commits, PRs or files, and commits use the project
   identity — see "No AI attribution (hard rule)" above.
6. Never `--force`, never rewrite pushed history, never push without being
   asked.
7. If something breaks or gets ambiguous: **stop and explain**, don't
   improvise.

---

## Current state

Homepage (`src/app/page.tsx`), in this order: Hero (**solid military**, light
text — centered text + decorative ringed planet/glow motif, no astronaut —
see "Astronaut (removed)") → Tokenization benefits (**solid salmon**, dark
text) → How it works (pinned sequence, neutral `bg-surface-alt` background,
unchanged) → When can I use tokenization? (**solid military**, light text) →
Meet the tokens (**solid salmon**, cards link to the `/negociar` category
routes, see "/negociar screens") → For companies × investors (**solid salmon**
— not green: it would be green→[neutral notice]→green right next to the green
CTA band after it; salmon here keeps the alternating rhythm) → Demo/CVM notice
(`bg-surface-alt`, neutral) → Final CTA band (solid military, light text —
already like this before Part 6) → Footer. See "Full section backgrounds +
contrast rule" above for the text tokens (`on-military`/`on-salmon`/
`on-salmon-muted`) used in each one.

In the "Tokenization benefits" (3 cards) and "When can I use tokenization?"
(4 cards) sections, the cards use `SectionCard` with `h-full` inside an
`items-stretch` grid — guarantees identical width and height between the
cards of the same row, regardless of each one's text length.

Smooth scroll via Lenis synced with GSAP ScrollTrigger. Header + navigation
(with the `EN · PT` language switcher), `/styleguide`. Every nav route responds
without a 404 — none is a `StubPage` anymore (see "Known open items" below).
Tested with `tsc`, `eslint`, `build` and visual checks via Playwright
(desktop, mobile, keyboard, reduced-motion) at each part.

The 5 parts of the redesign (palette E, 2D astronaut, Lenis + pin, approved
content sections, credits) are complete. The astronaut was removed later (see
its own section) and the hero rebalanced. The "Credits" section (an "Equipe
Niara" placeholder + generic areas) was also removed entirely later — it
wasn't needed before the site had real contributors to credit.

The whole repository was moved to English (identifiers, file names, comments,
docs) and the interface became bilingual (pt/en) after the Colosseum hackathon
submission — see "Language" for what deliberately stayed in Portuguese.

## Known open items

- The final logo (`public/niara-pme-logo.png`, globe + ring + "NIARA", black on
  a transparent background) is already in the Header and Footer via
  `<Logo />`. It only works on a **light** background — a light version of the
  art is still missing for dark backgrounds (`bg-military`/solid sections), in
  case the logo ever needs to appear there.
- Pending legal review of the copy of the "Tokenization benefits" (Tax
  advantage, Cheaper and fairer credit/Peer-to-peer) and "When can I use
  tokenization?" (Cash advance) sections — copy approved for display, but not
  yet legally validated. Don't change or expand that copy without instruction
  (in either language — the English version is a translation of the approved
  Portuguese copy, not new copy).
- Real contact form sending is still out of scope (today via `mailto`, no
  backend, see "/sobre/documentos and /sobre/contato screens") — unlike
  authentication/backend, which **already exist** since the Supabase backend,
  but only for the sign-up → profile → offering → investment cycle. Don't extend
  the real backend to `/ativos` or the simulated order ticket of `/negociar`
  without aligning first — they stay 100% mock demos by deliberate decision,
  not a technical limitation.
- The wallet connection (`/perfil`, see "4. Wallet") is real, but read-only
  (address/network/native balance on Sepolia). `NEXT_PUBLIC_SEPOLIA_RPC_URL` is
  optional in code (falls back to `wagmi/chains`' default public RPC), but must
  never be missing in production (see the `/investir/onchain` incidents).
  **Linking** that address to the account in the database (`wallet_address`) is
  real since the Supabase backend, but it's a persistence layer separate from
  the MetaMask connection itself.
- RLS on the domain tables (`issuers`, `offerings`, `investors`,
  `investments`, `payment_events`) is **default-deny with no policy at all** —
  every access goes through the `admin` client on the server, controlled only by
  the Server Action code via `resolveAccount()`. There's no self-read policy for
  the user to read their own data straight from the browser client yet; if one
  is ever added, review it carefully so it doesn't open reads of sensitive
  fields (CNPJ, phone, wallet) beyond what the allowlists already expose today.
- The "Not verified" banner on `/perfil` and the real `kyc_status` stored in the
  database (approved via `/investir`) aren't connected — see "Backend
  (Supabase)" → "KYC gate" for why, and don't "fix" one side without
  understanding the other.
- `npm run seed:demo` (see "Demo seed") still has to be run by hand before each
  demo (it's not an automatic CI/deploy seed).
- No site route is a `StubPage` anymore. `StubPage.tsx` was removed from the
  project for being unused — don't recreate it for new routes without aligning
  with the user first.
- Pending legal review of the regulatory framing cited on the `/negociar`
  screens (CVM Resolution 88, CVM-style risks) and of the simulated order
  ticket itself.
- `/investir/onchain` depends on offerings already created on Sepolia by an
  admin script outside the frontend (or self-service publications) — without
  the `NEXT_PUBLIC_*` vars filled in, the screen shows "contract not
  configured", it never breaks. The 10 backup offerings for the Startup Summit
  are in `NEXT_PUBLIC_OFERTAS_ONCHAIN` (full addresses in
  `niara-contracts-PMEs/CLAUDE.md`). The secondary market
  (`LiquidacaoSecundaria`, already deployed on Sepolia on the contracts side)
  isn't integrated.
- `RealPositionCard.tsx` (`/ativos`) doesn't consume the `ready` gate of the
  on-chain read hooks yet (read-only, no invest button — lower risk).
- **Known bug (pre-existing, not fixed):** `Reveal.tsx`/`RevealGroup.tsx` use
  framer-motion's `useReducedMotion()`, which reads `window.matchMedia`
  synchronously on the first client render — on a device with
  `prefers-reduced-motion: reduce`, this diverges from the server-rendered HTML
  and React logs a hydration error. No visual impact observed, but the console
  error is real. Fixing it means changing how `reducedMotion` is initialized in
  those two components (e.g. always start `false` and update it in a
  post-mount `useEffect`) — left for its own task.
- On-chain and database names that are still Portuguese (see "Language") get
  renamed together with the mainnet deploy.
