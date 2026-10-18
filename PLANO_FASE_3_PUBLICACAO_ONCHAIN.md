# Plan — Phase 3: self-service on-chain publication by the issuer (Step 0: inspection)

> **Historical document.** Written before the codebase moved to English: the file paths,
> identifiers and line numbers below are the ones of that time (e.g. `confirmarPublicacao()`
> is today's `confirmPublication()`, `registrarTentativa()` is `registerAttempt()`,
> `OfertasPage.tsx` is `OfferingsPage.tsx`, `src/lib/i18n/pt-br.ts` held the only
> dictionary). Contract and database names (`criarOfertaCompleta`, `sync_status`,
> `'divergente'`...) are unchanged. See `CLAUDE.md` for the current state.

Document produced without changing any code file, with no migration, no commit — only
reading the repository (`niara-PMEs`) and the `niara-contracts-PMEs` build artifact
(`out/OfertaOrquestrador.sol/OfertaOrquestrador.json`), as requested.

**Revision 3 — no pending decision.** Revision 2 settled points 1/2/4 of the original
section 1 and proposed, for point 3 (RLS/ownership), an option with no pre-registered
column. This revision incorporates your four decisions on that proposal: (1) the ownership
recommendation accepted, with the requested report on `saveWallet()` (section 2.3.1); (2)
the immutability of `onchain_emissor_wallet` enforced by a database trigger, not only by an
application guard (section 3.1); (3) `divergente` kept, but redirected to cover parameter
drift (`metaMaxima`/`precoPorCota`/`metaMinima`/`prazo`) between Supabase and the chain,
not ownership (sections 4.2/5); (4) the column name confirmed, `onchain_emissor_wallet`.
Nothing pending — see "Consolidated decisions" and "Sub-steps to unlock Step 1" at the end
of the document.

---

## 1. Decisions in this revision

### 1.1 There is no "off-chain approval (KYB)" in the code today — and the button that would be its equivalent was already turned off on purpose

Decision 1 assumes a flow `form → Supabase → triggers → approval (KYB) → on-chain
publication`. Inspecting `src/app/empresa/ofertas/actions.ts` and
`supabase/migrations/0001_core.sql`:

- The only state between "draft" and "live" today is `offerings.status`, with the values
  `draft | active | funded | failed | settled | cancelled` (`0001_core.sql:43-44`). There is
  no `pending_review`, no `approved`, nor any column for approval by a Niara human.
- The `draft → active` transition is made by the **issuer itself**, alone, clicking
  "Activate" (`activateOffering()`, `src/app/empresa/ofertas/actions.ts:161-227`) — there is
  not, and never was, a staff review in between.
- **The "Activate" button is disabled now** (`src/components/empresa/OfertasPage.tsx:234-244`,
  `disabled aria-disabled="true"`, label "Coming soon"), and the text next to it says why:
  *"Activation of new offerings paused in this demo — fundraising is moving to run directly
  on real Sepolia, without going through this simulated flow."*
  (`src/lib/i18n/pt-br.ts:1318-1319`). That was done in the repository's most recent commit
  (`10790e7`, "feat: taxa real da plataforma (Sepolia) + ajustes de UI"), that is: **someone
  already started preparing the ground for this very Phase 3**, turning off the old mock path
  before the real path existed.

So "an already approved offering" doesn't correspond to any writable state today. The
closest thing to an "approval gate" that exists is, coincidentally, one of your own six
gates: **gate 4, "address in the orchestrator's `emissoresAutorizados`"** — whoever puts an
issuer on that allowlist is the Niara AGENT (`autorizarEmissor`, see
`niara-contracts-PMEs/CLAUDE.md`), a human step, off-chain in the sense of "someone at Niara
decided", only recorded on-chain instead of in a Supabase column.

**Decision (accepted by you): approval = `emissoresAutorizados` on-chain.** I don't build a
new staff approval screen/table in this phase. I treat `status = 'draft'` (which has already
passed the Res. 88 CHECKs at creation) as the only precondition on the Supabase side, and the
authorization in `emissoresAutorizados` as the de facto approval gate — exactly as the
original decision 5 already listed.

**An explicit record you asked for**: `autorizarEmissor(emissor)` — the call the Niara AGENT
makes to put a wallet in `emissoresAutorizados` — is the **on-chain record of a KYB decision
made outside this system**, not the decision itself. The contract doesn't verify identity,
corporate documents or anything similar; it only records "someone with `AGENTE_ROLE`
decided to enable this wallet now". Today that decision is manual/informal (someone at
Niara decides and calls the function); a future KYB process (document verification,
corporate data, whatever) would **feed** that act — it would be the tool that informs the
decision of whom to authorize —, but it would **never replace it**: technically, authorizing
an issuer will always remain, in practice, a call to `autorizarEmissor` by whoever holds
`AGENTE_ROLE`, with manual or automated KYB behind it. I'll write that distinction down in
`niara-contracts-PMEs`' `CLAUDE.md` when the implementation gets there (I don't change that
file in this step, which is only the frontend-side plan) and replicate the same text in the
comment of any component that explains gate 4 to the issuer.

**Practical consequence**: the "Publish on-chain" button (Decision 2b) shows up on offerings
with `status = 'draft'`, not `status = 'active'` — see section 1.2 on why `active` can't be
reused.

### 1.2 `offerings.status = 'active'` already has an incompatible meaning — it can't become a synonym of "published on-chain"

`src/lib/investments.ts:78` filters `status = 'active'` to list offerings on the mock investor
screen (`/investir`, a **simulated** reservation/investment, unrelated to the chain). If I
reused `active` for "published on-chain", any real offering on Sepolia would start accepting
**fake** reservations in parallel through the old flow — the opposite of what Decision 1
exists to avoid.

**Decision (accepted by you, without reservation): orthogonal columns, `status` untouched.**
`offerings.status` stays immutable in this phase — no new transition, no new value in the
`CHECK`. The on-chain publication lives entirely in the new columns (`sync_status` and
company, section 3), orthogonal to `status`. An offering published on-chain stays
`status = 'draft'` forever from Supabase's point of view — which is correct: it should never
show up in the `/investir` mock listing anyway.

### 1.3 Wallet ownership: why the pre-registered column was dropped, and the design that replaces it

> "There's `auth.uid()` and RLS relies on it."

That's not what the code does today — RLS is default-deny on `offerings` (and on every domain
table), with no policy at all, neither for `select` nor for `update` (`0001_core.sql:230-241`,
also confirmed by the explicit comment in `0003_auth_link.sql:20-24`: *"RLS stays
default-deny; access still goes through service_role on the server (...) we are NOT enabling
[the `using (user_id = auth.uid())` policy] now so as not to loosen anything without
need."*). I had raised that correctly.

Where I went wrong was the conclusion: I proposed that the protection of `emissor_wallet`
would only be "no Server Action accepts that value from the client" — a guarantee of **code
discipline**, not of **data structure**. You're right to reject that specifically here:
`RLS default-deny` protects against someone using the `anon key` to talk straight to
Supabase's REST API (no policy = PostgREST refuses the write, with or without the key) — but
it doesn't protect against a bug or a future change in the code that runs with the
`service_role` (which ignores RLS by definition), and it isn't something the database can
enforce on its own. For an ordinary field that would be acceptable (it's the pattern of the
rest of the schema); for a field that decides **which wallet signs a real, public and
irreversible transaction**, it isn't — the consequence of a mistake differs by an order of
magnitude.

**Recommendation: option (a), refined — the "designated wallet" column doesn't exist.**
Instead of inventing `offerings.emissor_wallet` as a pre-registered value that someone (even
if only the server) needs to write and then compare, I drop that column from the design
entirely. The ownership check then works in two parts:

1. **Before signing (gate 5, live, without writing anything new)**: I compare the wallet
   connected in the browser against `issuers.wallet_address` — the column **that already
   exists** (`0006_profile_details.sql:31`), linked by the issuer itself in `/perfil`, read
   directly at every check (never copied into a second column). That already solves
   Decision 4's original problem (company A can't sign with company B's wallet): the
   comparison is always against the wallet the signed-in ACCOUNT
   (`resolveAccount().accountId`) has linked now, not against a copy someone would need to
   keep in sync. Combined with gate 4 (the same wallet also needs to be in
   `emissoresAutorizados` on-chain), the two conditions together rebuild exactly Decision 4's
   guarantee — without introducing any new column writable before the signature.
2. **After confirmation (audit, not designation)**: a new column,
   `offerings.onchain_emissor_wallet`, written **a single time**, only by the server's
   confirmation routine (`confirmarPublicacao()`, section 4.2), with the value **read
   directly from the already-mined `OfertaCompletaCriada` event** — never anyone's claim,
   always a verified read of a fact that is already public and immutable on the chain. That
   column doesn't "decide" any ownership — it only records, after the fact, what the chain
   has already proven true. See sections 3.1/4.2 for the exact design.

**Why this answers precisely "work even if the anon key leaks"**: in the pre-signature
phase, there's no new column left to attack — the only writable thing
(`issuers.wallet_address`) already existed before this phase and its write mechanism doesn't
change here. In the post-confirmation phase, even if someone managed to invoke the
confirmation routine at the wrong time (via a leaked `anon key`, via a bug, whatever), the
only value that can come out of it is **exactly what the already-mined transaction says** —
there's no way for that routine to persist a lie, because it accepts no input other than
"confirm this offering", and everything else comes from an RPC read against the chain's
public state.

I dropped option (b) ("the column exists, only written by a server route with the service
role") because it is, in practice, what I had already proposed — every Server Action in this
project already runs with the `service_role`; formalizing that as "a route" doesn't change
the risk surface you pointed out (it would still be a column whose only guardian is
server-side code discipline, not a structural property of the data). Option (a) is strictly
stronger because it **removes the risky data from the phase in which it would be a claim**,
and only admits it after it has become a verifiable fact.

### 1.4 A minor finding, but relevant for the terms text (Decision 6): the site's wallet already signs transactions today, just not on the issuer's side

> "It's the first time the site asks for a transaction signature; until today the wallet was
> read-only."

That's only true for the Wallet section of `/perfil` (`ConnectWallet.tsx` +
`ConnectionPanel.tsx` — connect/switch network/read balance, never a write). But
`src/lib/web3/hooks/useOnChainActions.ts` already exposes `useMintMockBrl`,
`useInvestirOnChain`, `useEncerrarOferta`, `useResgatarCotas` and `useLiberarParaEmissor` —
all using `useWriteContract` for real — consumed by
`src/components/investir-onchain/RealOnChainInvestPanel.tsx`, mounted both in
`/investir/onchain` and inside `OfertaDetailPage` for the real offerings of the SME Token
category. In other words, **investors have already been signing real transactions on this
site since Phase 6** (invest, redeem, etc.) — only the **issuer** has never signed anything
yet.

**Decision (accepted by you — "my mistake"): I keep the adjusted terms.** Instead of "it's
the first time the site asks for a signature", the terms say "it's the first time **you, as an
issuer**, sign a real transaction — unlike the investor, who already uses a wallet to
invest/redeem on Sepolia" (full text in section 7, unchanged in this revision). It stays
honest without claiming something an investor who has already used `/investir/onchain` would
know to be false.

---

## 2. Inspection results, item by item

### 2.1 Wallet connection today

- `wagmi@^3.7.4` + `viem@^2.55.8` + `@tanstack/react-query@^5.101.4` (`package.json`).
- A single config in `src/lib/web3/config.ts`: `createConfig({ chains: [sepolia], connectors:
  [injected()], storage: cookieStorage, ssr: true, transports: { [sepolia.id]:
  http(NEXT_PUBLIC_SEPOLIA_RPC_URL) } })`. A single network (Sepolia).
- Mounted in `src/app/providers.tsx` (`WagmiProvider` + `QueryClientProvider`), in the root
  layout — available on any route, not only `/perfil`.
- `src/components/web3/ConnectWallet.tsx`: connect/disconnect/switch network — **no call to
  `useWriteContract`** here. `src/components/web3/ConnectionPanel.tsx`: only `useBalance`
  (read). **Confirmed: the Wallet section of `/perfil` is 100% read-only.**
- But (see finding 1.4): `src/lib/web3/hooks/useOnChainActions.ts` already signs real
  transactions on other screens (`/investir/onchain`, `OfertaDetailPage` for SMEs). The write
  pattern already exists and can be reused as is — it wouldn't be the first time this
  codebase sets up a `useWriteContract` + `waitForTransactionReceipt`.

### 2.2 Authentication

- `src/proxy.ts` (Next 16, was `middleware.ts`): only calls `supabase.auth.getUser()` on each
  navigation to refresh the session cookie — no business logic.
- `src/lib/supabase/server.ts`: the client for Server Components/Actions, anon key +
  cookies, respects RLS (but RLS is default-deny — it isn't what authorizes anything in
  practice).
- `src/lib/supabase/admin.ts`: the service_role client, ignores RLS completely, `import
  "server-only"` — the client used by every business action.
- `src/lib/auth/resolveInvestor.ts:22-53` (`resolveAccount()`): reads `auth.getUser()`, then
  looks for a row in `investors.user_id` or `issuers.user_id` (in that order — the first match
  wins) via the admin client. Returns `{ userId, role, accountId }`. **This function is the
  only identity source in every existing business action** (`createOffering`,
  `activateOffering`, `closeOffering`, `saveWallet` etc.) — none of them accepts
  `issuer_id`/`investor_id` from the client.
- **The project documentation is NOT outdated about "sign-in as Coming soon".** I checked
  `src/components/entrar/EntrarPage.tsx` directly: `handleEntrar` really calls
  `supabase.auth.signInWithPassword` (line 76); only the "Continue with Google" button is
  `disabled aria-disabled="true"` with the "(Coming soon)" label (lines 201-206). Email/password
  sign-in is real and working today.
- RLS: no domain table (`issuers`, `offerings`, `investors`, `investments`,
  `payment_events`) has a policy — see finding 1.3.

### 2.3 Account ↔ wallet linking

- `issuers.wallet_address` already exists (`0006_profile_details.sql:31`), `unique`
  (`0007_wallet_unique.sql:13`), nullable.
- `saveWallet(addressInput)`/`unlinkWallet()` (`src/app/perfil/actions.ts:399-458`): the
  issuer itself changes that address **freely, at any time**, with no lock at all — it's
  literally the Wallet section of `/perfil` (`WalletSection.tsx`).
- **That led the first version of this plan to propose a "frozen snapshot"** of
  `issuers.wallet_address` in a new per-offering column (`emissor_wallet`), so gate 5
  wouldn't change meaning if the issuer swapped the wallet later. That column was dropped in
  revision 2 (see section 1.3) — not because the snapshot problem was false, but because it
  only existed *because of* the new column; without it, there's nothing to freeze.
- **Current design (after decision 3)**: there's no `offerings.emissor_wallet`. Gate 5
  compares the connected wallet against `issuers.wallet_address` **live**, at every check —
  before any signature happens, there's no "offering waiting for a specific wallet", only "the
  signed-in account must have the SAME wallet connected that it linked itself in `/perfil`".
  Implicit precondition: if `issuers.wallet_address` is `null`, the publication screen shows a
  "no linked wallet" state with a link to `/perfil`, before even reaching the six gates.
- After the transaction confirms, what gets written (`offerings.onchain_emissor_wallet`,
  section 3.1) is no longer a comparison with `issuers.wallet_address` — it's the value the
  on-chain event itself reported, period. If the issuer swaps the wallet in `/perfil` after
  that, it doesn't affect the already-confirmed offering's record (which is historical), nor
  does it need to: gate 5 only matters before signing.
- "How RLS protects it": it doesn't — see section 1.3. The real protection, after decision
  3, is structural, not only discipline: there's no pre-signature column left to protect (no
  data to attack), and the only post-confirmation column only accepts a value the chain has
  already proven publicly. Every read/write also stays scoped by
  `resolveAccount().accountId`, the same pattern as `activateOffering`.

### 2.3.1 Requested report: how `saveWallet()` writes today, and whether the client can change it freely

Read in `src/app/perfil/actions.ts:374-424`, function by function:

- **Format, not ownership.** `walletAddressSchema` (lines 379-383) only checks that the
  string looks like an address (`^0x[0-9a-fA-F]{40}$`, normalized to lowercase). There's no
  signature challenge at all — the user isn't asked to sign a message proving they control
  that address.
- **The code's own comment already admits it.** Lines 374-378: *"only the address FORMAT is
  validated here (...); uniqueness is the job of the database UNIQUE (...). The row written
  is always the one resolved by `resolveAccount()` (session on the server); the address
  itself comes from the client (wagmi/MetaMask), but never the target account."* So the
  project's already documented design guarantees **who** writes (the right account, via
  session) but has never verified **what** — the address value itself is a client claim,
  accepted as is.
- **`saveWallet(addressInput)` (lines 399-424)**: receives the address as an ordinary Server
  Action parameter — today the UI (`WalletSection.tsx`) always sends wagmi's
  `connection.address`, but the function itself would accept any string in the right format,
  from any call (it doesn't have to be through that UI — a direct request to the Server
  Action, with no MetaMask involved at all, would work the same). It writes with
  `admin.from(table).update({ wallet_address: parsed.data }).eq("id", accountId)` — without
  checking whether there was already a value, with no cooldown, no limit on swaps.
  `unlinkWallet()` (lines 430-458) is just as free.
- **The only existing brake**: Postgres' `unique` (`0007_wallet_unique.sql:12-13`) — the same
  address can't be in two `issuers` rows at the same time. If the address someone tries to
  write already belongs to another account, the write fails (`23505`,
  `translateWalletDbError`).

**Direct answer to your question — "whether gate 5 can be bypassed by changing one's own
address"**: it depends on what "bypass" means. I separate two risks, because their
consequences are very different:

1. **Forging a signature from a wallet you don't control — not possible through this.** Even
   if account A writes `wallet_address = <company B's address>` in `issuers`, that doesn't
   make A's MetaMask "become" B's wallet — for gate 5 to really pass (the **connected**
   wallet == `wallet_address`) and, above all, for the real transaction to be **signed**, A
   would need B's private key, which writing a string into a database gives no one.
   `saveWallet()` without proof of ownership is not, on its own, a path to sign as someone
   else.
2. **"Hijacking" an address its real owner hasn't linked yet — this, yes, is possible
   today**, and it's a genuine vulnerability, just of a different kind from what the
   original Decision 4 targeted. If wallet W is already authorized in `emissoresAutorizados`
   on-chain (a platform-wide allowlist, not tied to any specific Supabase account) but W's
   real owner **hasn't linked** W in `/perfil` yet, any account A could call `saveWallet(W)`
   directly (without ever really connecting W via MetaMask — just sending the string) and
   "reserve" that address for itself. When W's real owner tried to link it later, they'd get
   "This wallet is already linked to another account." — a block, not a loss of funds, but
   still a real data-integrity failure (account A would start showing, in `/perfil`, a wallet
   that was never really theirs, and no real transaction would be signable by A using W
   anyway — back to point 1).

**Conclusion for Phase 3**: gate 5, as designed (comparing the connected wallet against
`issuers.wallet_address`), **can't be bypassed to produce an improper signature** — whoever
signs always needs the real private key, and `saveWallet()` hands that to no one. What
`saveWallet()` lacks is **proof of ownership** (a signature challenge, like "sign this
message to prove you control this address", before writing), which would completely close
risk 2 (address hijacking). That flaw already exists today, independently of Phase 3 — it
belongs to Phase 6 (`/perfil`), not introduced by this plan, but gate 5 inherits that trust
assumption by reusing the column. **I recommend treating it as a separate hardening item,
off this phase's critical path** (it doesn't block Step 1, because the residual risk doesn't
allow an improper signature) — but recorded here, as requested, for you to decide whether to
solve it before, along with, or after. If you want to solve it now, the fix is localized
(`saveWallet()` starts requiring a `personal_sign` signature of a nonce before accepting the
address) and doesn't change anything in the Phase 3 design itself.

### 2.4 Supabase schema

The `offerings` table today (union of `0001`, `0008`, `0009`):

```
id, issuer_id, status, target_min_cents, base_cap_cents, hard_cap_cents,
opens_at, closes_at, is_demo, created_at, share_price_cents, category
```

No on-chain reconciliation column exists in it today. (`onchain_sync_state`, from
`0012`/`0013`, is a **completely different** table — an event cache for the `/socios`
dashboard, nothing to do with `offerings`; there's no name or purpose collision.)

Relevant CHECKs/triggers (`0001_core.sql`): `cap_le_15m` (≤ R$15M), `additional_lot`
(lot ≤ 25%), `min_le_hardcap`, `window_le_180d` (≤ 180 days), `window_valid`. All of them
match exactly the limits `OfertaOrquestrador.criarOfertaCompleta` validates again on-chain —
Res. 88 is checked twice, in two systems, by design (the chain doesn't blindly trust what
Supabase sent).

RLS: default-deny, no policies, on every domain table (confirmed, see 1.3).

### 2.5 "Start fundraising" flow

`src/components/hero/Hero.tsx:30-35`: already a real, enabled link,
`href="/entrar?intent=captacao"` — **it's no longer "Coming soon"**. `EntrarPage` receives
`isCaptacaoIntent` via `searchParams` and only swaps title/subtitle to emphasize "create an
account to structure a fundraise"; the rest of the flow (sign-in/sign-up) is the same as
always. That's already done and needs no work in this phase.

### 2.6 Demo banner

**There's no shared component.** I searched for `export function ... Banner` across `src/` —
there are only `BannerUpload` (the issuer's cover image upload) and `OfertaBanner` (an
offering's photo + logo), nothing related to the demo notice. The notice is the same JSX
snippet copied in at least 6 places (`AtivosPage.tsx`, `PerfilPage.tsx`,
`OfertaDetailPage.tsx`, `HubPage.tsx`, `CategoryPage.tsx`, `OrderTicket.tsx`), each with its
own i18n key (`ptBr.ativos.demoBanner`, etc.), but the same visual class:

```tsx
<div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
  <span className="font-semibold text-salmon">{...label}</span> — {...text}
</div>
```

For the signing terms (section 7), I can't simply import an existing component — I'll
**reuse the same visual class/structure** (consistency with the rest of the site), but as
new, longer text (the terms need much more than one line). As a low-risk, optional sub-step
(section 9), I propose extracting a shared `<DemoBanner/>` now that a fifth+ screen will need
the same pattern — but that can stay off Phase 3's critical path with no harm at all.

### 2.7 Environment variables

- `NIARA_ENV=demo` (read in `createOffering`, `.env.example:17-18`) marks `is_demo: true` on
  the rows written — no authorization logic depends on it, it's only a provenance label.
- Supabase keys: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` public (RLS would
  protect if there were a policy — today it only limits what the anon key *could* do, which is
  nothing, since there's no policy at all); `SUPABASE_SERVICE_ROLE_KEY` secret, never on the
  client, protected by `import "server-only"`.
- The pattern for a contract address **without turning it into a secret**: `NEXT_PUBLIC_*`,
  always read through a central module (`src/lib/web3/addresses.ts`), never hardcoded in a
  component — the same pattern already in use. A contract address isn't a secret (it's public
  on the blockchain); the only rule is never to invent a silent fallback — `readAddress()`
  returns `null` instead of an invalid value, and the UI treats `null` as "contract not
  configured", it never breaks.
- For the orchestrator, I only need **one** new address (`NEXT_PUBLIC_ORQUESTRADOR_ADDRESS`)
  — unlike the `addresses.ts` pattern (which lists `mockBrl` + several offerings), because the
  frontend only talks directly to `OfertaOrquestrador`; `tokenFactory`/`gateway`/
  `captacaoFactory` are the contract's internal details, never called by the frontend.

### 2.8 Orchestrator ABI

I extracted (didn't hand-write) from
`niara-contracts-PMEs/out/OfertaOrquestrador.sol/OfertaOrquestrador.json` — 85 entries in
total (it inherits `AccessControl`/`Pausable`/`TimelockedAccessControl`, most of them
irrelevant to the frontend). Proposal: **a minimal ABI**, in the same spirit as the local
interfaces `OfertaOrquestrador.sol` itself uses to talk to the other contracts — only what
the frontend really calls:

- Write function: `criarOfertaCompleta(...)`.
- Read function (gate 4): `emissoresAutorizados(address) view returns (bool)`.
- Event: `OfertaCompletaCriada(address indexed emissor, address indexed token, address
  indexed oferta, uint256 metaMinima, uint256 metaMaxima, uint256 precoPorCota, uint256
  prazo)` — used to decode the token/offering address from the transaction receipt, without
  needing a second RPC call.
- All 10 of the contract's own custom `error`s (`ZeroAddress`, `EmissorNaoAutorizado`,
  `OfertaAnteriorAindaAberta`, `PrecoInvalido`, `PrazoInvalido`, `PrazoExcedeLimite`,
  `MetaMaximaExcedeTeto`, `LoteAdicionalExcedeLimite`, `PrecoNaoDivideMetaMaxima`,
  `TaxaExcedeMaximo`) — needed for `viem` to decode a revert's **name**; without the error's
  entry in the ABI passed to the call, it only decodes the raw selector.

That gives ~15 entries instead of 85, and covers exactly the surface the issuer can reach. I
follow the same convention already used in `src/lib/web3/abis/ofertaCaptacao.ts` (a comment
citing the exact source, never written from memory) — I propose copying those ~15 entries
from the JSON by hand, the same way it's already done for this project's other three ABIs.
(If you'd rather automate — a script that reads the sister repository's JSON and generates
the `.ts` by itself — it's possible and would reduce copy errors, but it would be a
convention change relative to what exists; I can include it as an optional sub-step if you
want.)

### 2.9 Custom errors

`src/lib/web3/errors.ts` already has exactly the right mechanism: `describeOnChainError()`
decodes `ContractFunctionRevertedError` via `error.walk`, matches `errorName` against a
`CUSTOM_ERROR_MESSAGES` dictionary, falls back to a named message (`"The transaction reverted
(${errorName})."`) if the name isn't mapped, and handles user rejection, insufficient balance
and RPC failure separately. **I don't need a new decoder** — only to extend the same
dictionary (same file, with no risk of a name collision with the `OfertaCaptacao` errors
already there). Proposed mapping — see section 8.

---

## 3. Supabase migration (proposal — text for review, no file created)

### 3.1 New file: `supabase/migrations/0015_offering_onchain_publish.sql`

```sql
-- ============================================================================
-- Niara-PMEs -- 0015_offering_onchain_publish
-- Phase 3: self-service publication of the offering on Sepolia, by the
-- issuer itself. offerings.status DOES NOT CHANGE in this migration -- the
-- on-chain publication is an ORTHOGONAL set of columns, never a new value of
-- the status CHECK (see section 1.2 of the plan: 'active' already has another,
-- incompatible meaning).
--
-- There is NO pre-signature "designated issuer" column (see section 1.3 of
-- the plan): ownership before signing is checked LIVE against
-- issuers.wallet_address (an existing column, 0006_profile_details.sql) +
-- emissoresAutorizados on-chain -- neither needs a new column here.
-- onchain_emissor_wallet below is NOT a designation: it is an audit record,
-- written a single time, only by the server's confirmation routine, with the
-- value read straight from the already-mined OfertaCompletaCriada event --
-- never a claim accepted from anyone.
--
-- 'divergente' covers two DIFFERENT things (see section 5 of the plan): (a) an
-- anomaly reading the receipt (rare, should almost never happen) and (b) the
-- main expected case -- the on-chain offering is IMMUTABLE once created, but
-- the offerings row IS NOT; nothing here prevents a manual UPDATE of
-- hard_cap_cents/share_price_cents/opens_at/closes_at after publication.
-- That's why opens_at/closes_at are "frozen" at the exact deadline sent to the
-- chain at publication time (see the registrarTentativa Server Action, section
-- 4.2) -- only then does a future comparison against the immutable on-chain
-- value make sense.
-- ============================================================================

begin;

alter table offerings
  add column contract_address       text,
  add column token_address          text,
  add column onchain_emissor_wallet text,
  add column tx_hash                text,
  add column chain_id                integer,
  add column sync_status             text not null default 'nao_onchain',
  add column onchain_confirmed_at    timestamptz,
  add column onchain_last_error      text;

-- Address/hash format -- the same regex already used in the frontend
-- (src/lib/web3/addresses.ts HEX_ADDRESS_PATTERN), replicated here as the
-- last line of defense (the database never accepts garbage, the same
-- philosophy as the Res. 88 triggers in 0001_core.sql).
alter table offerings
  add constraint contract_address_format
    check (contract_address is null or contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint token_address_format
    check (token_address is null or token_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint onchain_emissor_wallet_format
    check (onchain_emissor_wallet is null or onchain_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint tx_hash_format
    check (tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$');

alter table offerings
  add constraint sync_status_valid
    check (sync_status in ('nao_onchain', 'pendente', 'confirmada', 'divergente'));

-- Consistency between sync_status and the columns it describes -- the same
-- principle already used by the Res. 88 CHECKs: the invariant lives in the
-- database, not only in the Server Action.
alter table offerings
  add constraint sync_status_pendente_tem_tx
    check (sync_status not in ('pendente', 'confirmada', 'divergente') or tx_hash is not null),
  add constraint sync_status_confirmada_tem_enderecos
    check (
      sync_status <> 'confirmada'
      or (
        contract_address is not null
        and token_address is not null
        and onchain_emissor_wallet is not null
        and chain_id is not null
      )
    );

create index on offerings (sync_status) where sync_status <> 'nao_onchain';

-- Immutability of the 4 columns that record what the chain has already
-- confirmed -- THIS IS NOT ONLY AN APPLICATION GUARD (WHERE
-- sync_status='pendente' in the Server Action, section 4.2): it is locked in
-- the database itself, the same pattern already used by the investments
-- transition triggers in 0001_core.sql. Running confirmarPublicacao() twice
-- (or any other code, present or future) NEVER overwrites a value already
-- written -- it only REVERTS (SQLSTATE 23514/check_violation, the same error
-- pattern as the Res. 88 triggers). tx_hash and sync_status are left OUT of
-- this lock on purpose: tx_hash must be clearable/replaceable in a new attempt
-- after a revert (pendente -> nao_onchain), and sync_status must be able to go
-- to 'divergente' from 'confirmada' (parameter drift, see section 5).
create function enforce_onchain_publish_immutable() returns trigger language plpgsql as $fn$
begin
  if old.contract_address is not null and new.contract_address is distinct from old.contract_address then
    raise exception 'offerings.contract_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.token_address is not null and new.token_address is distinct from old.token_address then
    raise exception 'offerings.token_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.onchain_emissor_wallet is not null and new.onchain_emissor_wallet is distinct from old.onchain_emissor_wallet then
    raise exception 'offerings.onchain_emissor_wallet e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  return new;
end $fn$;

create trigger offerings_onchain_publish_immutable before update on offerings
  for each row execute function enforce_onchain_publish_immutable();

-- RLS: NO change. offerings stays default-deny, with no policy -- access to
-- the new columns goes through the same admin client (service_role) already
-- used in every offering Server Action, scoped by resolveAccount() in the
-- application code. I don't enable auth.uid() here for the same reason already
-- recorded in 0003_auth_link.sql: don't loosen without need -- and because,
-- after decision 3, there's no pre-signature column left whose write would
-- depend on that protection (see section 1.3 of the plan).

commit;
```

(The `raise exception` messages are the ones that went into the real migration, where they
stay in Portuguese: see "Language" in `CLAUDE.md`.)

### 3.2 Why not a separate table

I considered `offering_onchain_publications` (1:1 with `offerings`) instead of loose columns.
I dropped it: Decision 3 already frames this as "the chain is a mirror" of the offering
itself, not a new entity; a separate table would require a `join` on every `/empresa/ofertas`
read and would bring no integrity benefit the `CHECK` above doesn't already provide. It keeps
the pattern already used by the rest of the schema (`share_price_cents`, `category` also came
in as loose columns in later migrations, not as their own tables).

### 3.3 Where `onchain_emissor_wallet` is written (no new RLS policy — the design of section 1.3)

The only possible write, a single time: inside `confirmarPublicacao(offeringId)` (section
4.2), after the server itself reads the transaction receipt via RPC and decodes its
`OfertaCompletaCriada` event:

```sql
update offerings
   set contract_address       = $1   -- event.oferta, read from the receipt by the server
     , token_address          = $2   -- event.token, same
     , onchain_emissor_wallet = $3   -- event.emissor, same -- NEVER from the client
     , sync_status            = 'confirmada'
     , onchain_confirmed_at   = now()
 where id = $4
   and issuer_id = $5                -- accountId from resolveAccount(), never from the client
   and sync_status = 'pendente'      -- write-once: only from a recorded attempt
returning id;
```

There's no step to "designate" the wallet before that — the only input any caller (client
included) provides for this whole flow is `offeringId`; everything else (the three addresses)
comes from an RPC read against the chain, made by the server itself, never from a parameter.
That's what makes the column immune to a leaked `anon key`: there's no call shape that
accepts "say wallet X published this offering" — there's only "confirm what the already-mined
transaction Y really did".

The `WHERE sync_status = 'pendente'` above already stops a second call in practice (the first
one already moved the status to `'confirmada'`), but what guarantees that **no** code, present
or future, can overwrite it is the `offerings_onchain_publish_immutable` trigger (section 3.1)
— it meets your requirement in point 2: running the confirmation twice doesn't overwrite, and
that doesn't depend on any Server Action remembering to check the right condition.

---

## 4. Proposed file structure

```
src/
  app/
    empresa/ofertas/
      actions.ts                    (existing — no change)
      onchain-actions.ts             NEW — this phase's Server Actions (4.2)
      [id]/publicar/
        page.tsx                     NEW — Server Component: validates owner +
                                      eligibility, loads data, redirects if the
                                      offering doesn't exist/doesn't belong to
                                      the signed-in issuer/isn't in an eligible
                                      status
        not-found.tsx                NEW — same pattern as
                                      /negociar/oferta/[slug]/not-found.tsx
  components/
    empresa/
      OfertasPage.tsx                existing — gains the "Publish on-chain"
                                      link/button on the card of status='draft'
                                      offerings (visually replaces the disabled
                                      "Activate" for those offerings)
      publicar/
        PublicarOnChainPage.tsx      NEW — client, orchestrates gates + terms + button
        GateChecklist.tsx            NEW — visual list of the 6 gates + the wallet precondition
        TermoPublicacao.tsx          NEW — terms text (section 7) + checkbox
        SyncStatusBadge.tsx          NEW — nao_onchain/pendente/confirmada/divergente badge,
                                      also reusable on the "My offerings" card
    ui/
      DemoBanner.tsx                 NEW, optional (see 2.6 and sub-steps) — extracts the
                                      pattern already repeated in 6 places; used by the publish screen
  lib/
    web3/
      orquestrador.ts                NEW — pairs NEXT_PUBLIC_ORQUESTRADOR_ADDRESS with the new
                                      ABI, the same role as contracts.ts but for a single contract
      abis/
        ofertaOrquestrador.ts        NEW — minimal ABI (~15 entries, see 2.8)
      hooks/
        useEmissorAutorizado.ts      NEW — gate 4 read (emissoresAutorizados)
        usePublicarOfertaOnChain.ts  NEW — write hook (signs + persists + confirms)
      errors.ts                      existing — CUSTOM_ERROR_MESSAGES gains the 10 new entries
    supabase/
      onchain-reconciliation.ts      NEW — verificarConsistencia(offeringId), server-only,
                                      reuses publicClient() from eventsCore.ts (see 4.2/5/6);
                                      the parameter comparison (metaMaxima/precoPorCota/
                                      metaMinima/prazo) used both here and inside
                                      confirmarPublicacao() lives only in this file, imported
                                      by onchain-actions.ts — never duplicated
supabase/migrations/
  0015_offering_onchain_publish.sql  NEW (see section 3)
.env.example                         gains NEXT_PUBLIC_ORQUESTRADOR_ADDRESS (see 2.7)
```

### 4.1 Dedicated route vs. a section on the same page

Decision 2 asks for two distinct **screens**. `/empresa/ofertas` is already a whole page to
create/list; I propose `/empresa/ofertas/[id]/publicar` as its own route (not a modal nor an
expandable section inside the same component) — each `draft` offering card in the list gains
a "Publish on-chain →" link that leads there. That also gives a stable URL to come back to
after signing (useful in the "user closes the tab" case — they reopen the same URL and see the
`pendente` state again, without having to rebuild context).

### 4.2 New Server Actions (`onchain-actions.ts`)

Proposed signature (behavior, not code):

- `carregarElegibilidade(offeringId)`: **read-only, nothing is written here.** Validates
  `resolveAccount()` (`role==='issuer'`), fetches the offering
  (`.eq("id", offeringId).eq("issuer_id", accountId)`, 404 if not found), validates
  `status === 'draft'`, reads the issuer's own `issuers.wallet_address`. Returns
  `{ walletVinculada, sync_status, ...other on-chain fields already written }` for the screen
  to build the `GateChecklist` — if `walletVinculada` is `null`, the UI sends the user to
  `/perfil` before showing any gate. Called when entering the screen (`page.tsx`, a Server
  Component) and again by the client at every gate 5 check (a live comparison, never a cached
  value stored on an offering).
- `registrarTentativa(offeringId, txHash, prazoUnixSeconds)`: called by the client **as soon
  as** the wallet returns the hash (before waiting for confirmation). `prazoUnixSeconds` is
  computed on the client **immediately before** building the `criarOfertaCompleta` call
  (`Math.floor(Date.now()/1000) + windowDays*86400`, where `windowDays` comes from the
  original draft's `closes_at - opens_at`) — the very same value used as the transaction's
  `prazo` argument, never recomputed afterwards. `UPDATE offerings SET tx_hash=$1,
  chain_id=11155111, sync_status='pendente', opens_at=now(), closes_at=to_timestamp($2)
  WHERE id=$3 AND issuer_id=$4 AND sync_status='nao_onchain'` — atomic, whoever gets there
  first in a two-click race wins; the second call gets 0 rows and the UI treats it as "there's
  already an attempt in progress, wait for the confirmation". **Why touch
  `opens_at`/`closes_at` here**: without it, `closes_at` would keep the value computed when
  the draft was created (which may have sat for days before being published — the same
  problem `activateOffering()` already solves today for the mock flow, lines 186-195 of
  `src/app/empresa/ofertas/actions.ts`), and section 5's `divergente` comparison would never
  match even with nothing having really "diverged".
- `confirmarPublicacao(offeringId)`: **never trusts anything from the client besides
  `offeringId`.** Reads `tx_hash` from the row itself, calls
  `publicClient().getTransactionReceipt({ hash })` on the server, checks `status ===
  'success'` **and** that the receipt is from a call to the expected `OfertaOrquestrador`
  address (`NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` — a defense against a corrupted `tx_hash`
  pointing to some other transaction), decodes the `OfertaCompletaCriada` log from the
  receipt itself (`decodeEventLog`). Before writing it as `confirmada`, it does the SAME
  parameter check `verificarConsistencia` (below) does later — reads
  `metaMaxima()`/`precoPorCota()`/`prazo()` from the just-obtained `contract_address` (via the
  existing `ofertaCaptacaoAbi`) and compares them against the row's own
  `hard_cap_cents`/`share_price_cents`/`closes_at` **as `registrarTentativa()` left them** —
  they must match exactly, since they're the same numbers that became the transaction's
  arguments. If they match: writes `contract_address` (event `.oferta`), `token_address`
  (event `.token`), `onchain_emissor_wallet` (event `.emissor`),
  `sync_status='confirmada'`, `onchain_confirmed_at=now()` (see the exact `UPDATE` in section
  3.3). If the receipt doesn't exist yet (still mining), it returns "keep waiting", without
  writing anything. If `status === 'reverted'`, it sets `sync_status` back to
  `'nao_onchain'`, writes `onchain_last_error` with the translated message (the same
  `describeOnChainError`) and clears `tx_hash` (allowing a new attempt). If the receipt exists
  but **doesn't** correspond to a successful `criarOfertaCompleta` call to the expected
  orchestrator, OR if the parameters don't match (it shouldn't happen in the normal flow, but
  it would be a real race — someone editing the offering between signing and confirmation):
  it marks `sync_status='divergente'` — requires manual intervention (see the state machine,
  section 5).
  *(Later finding: comparing against the orchestrator address via `receipt.to` turned out to
  be wrong — MetaMask can rewrite the transaction as EIP-7702. The implementation validates
  by the log emitted by the contract instead; see `CLAUDE.md`, "EIP-7702".)*
- `verificarConsistencia(offeringId)`: **new, covers point 3 of your last decision** — the
  on-chain offering is immutable, the Supabase row isn't. Only runs on offerings already at
  `sync_status='confirmada'`. Reads live, from the already-written `contract_address`,
  `metaMaxima()`/`precoPorCota()`/`prazo()` (plus `metaMinima()`, which I add for symmetry —
  tell me if you'd rather drop it) and compares them against the **current** values of
  `hard_cap_cents`/`share_price_cents`/`target_min_cents`/`closes_at` in the Supabase row
  (converting R$ cents to `MockBRL`'s 18-decimal scale: `valor_wei = centavos * 10^16`). If
  **any** of them no longer matches, it writes `sync_status='divergente'` and
  `onchain_last_error` with exactly what diverges (e.g. `"Supabase hard_cap_cents
  (R$620.000,00) doesn't match on-chain metaMaxima (R$600.000,00)"`) — it never fixes either
  side on its own, it only flags (the original Decision 3: "the reader compares and shows the
  divergence"). Called whenever the detail screen of a `confirmada` offering is opened (one
  multicall read, cheap) — it does **not** run automatically over the whole
  `/empresa/ofertas` list (that would mean N RPC calls per page load; the card in the list only
  shows the last known `sync_status`).
- `confirmarPublicacao` and `verificarConsistencia` also run — for the "closed the tab" case
  — again when `page.tsx` loads, depending on the offering's current `sync_status`
  (`pendente` → try to confirm; `confirmada` → check consistency), without requiring a click.

---

## 5. `sync_status` state machine

```
                     ┌─────────────┐
        (never        │ nao_onchain │◄────────────────────┐
     tried to publish) └──────┬──────┘                     │
                               │ registrarTentativa()        │ confirmarPublicacao()
                               │ (tx signed, hash obtained)   │   finds a receipt with
                               ▼                              │   status='reverted'
                        ┌─────────────┐                       │   (tx mined, but failed)
                        │  pendente   │───────────────────────┘
                        └──────┬──────┘
                               │ confirmarPublicacao()
                               │ finds a receipt with status='success' and
                               │ a decodable OfertaCompletaCriada
                               ▼
                        ┌─────────────┐        the receipt exists but doesn't match a
                        │ confirmada  │───┐    successful criarOfertaCompleta call to the
                        └─────────────┘   │    expected orchestrator, OR the parameters don't
                               ▲          │    match right at the first confirmation (rare race)
                               │          │
                               │          │ verificarConsistencia(), at any time afterwards:
                               │          │ Supabase's hard_cap_cents/share_price_cents/
                               │          │ target_min_cents/closes_at NO LONGER match the
                               │          │ on-chain metaMaxima/precoPorCota/metaMinima/prazo
                               │          ▼
                               │  ┌─────────────┐
                    (no         └─▶│ divergente  │
                     automatic     └─────────────┘
                     transition
                     leaves here —
                     requires a manual
                     fix, outside
                     this phase)
```

A note on the change after decision 3: since there's no pre-registered `emissor_wallet` to
compare against anymore (section 1.3), `divergente` no longer means "the wallet wasn't the
expected one" — who can call `criarOfertaCompleta` is already limited by gate 4
(`emissoresAutorizados`) and gate 5 (wallet == `issuers.wallet_address` at signing time), so
ownership is no longer a cause of `divergente`. By your decision (point 3), `divergente`
stays — and mainly — covering **parameter drift**: the on-chain offering (`metaMaxima`,
`precoPorCota`, `metaMinima`, `prazo`) is immutable once created, but the `offerings` row
isn't — nothing in the schema prevents a manual `UPDATE` of `hard_cap_cents`/
`share_price_cents`/`target_min_cents`/`closes_at` after publication (no UI does that today,
but the database doesn't forbid it). `divergente` is reachable from two places: (a)
`confirmarPublicacao()`, if the parameters already don't match at the first confirmation —
it would only happen in a genuine race, since the values compared are the same ones that
became the transaction's arguments; (b) `verificarConsistencia()`, at any time afterwards, if
Supabase has changed since the confirmation — this is the main case your decision asked not to
miss.

Transitions and what triggers each one:

| From → To | Triggered by | Effect on the database |
|---|---|---|
| `nao_onchain → pendente` | `registrarTentativa()`, right after the wallet returns the hash | writes `tx_hash`, `chain_id`, `sync_status='pendente'`, freezes `opens_at`/`closes_at` at the real deadline sent to the chain |
| `pendente → confirmada` | `confirmarPublicacao()`, `success` receipt, event decoded, parameters matching | writes `contract_address`, `token_address`, `onchain_emissor_wallet`, `onchain_confirmed_at`, `sync_status='confirmada'` |
| `pendente → nao_onchain` | `confirmarPublicacao()`, `reverted` receipt | clears `tx_hash`, writes `onchain_last_error`, `sync_status='nao_onchain'` (allows a new attempt) |
| `pendente → divergente` | `confirmarPublicacao()`, the receipt doesn't decode as expected, or the parameters already don't match at the first check | writes `onchain_last_error`, `sync_status='divergente'`, **keeps** `tx_hash` (evidence) |
| `confirmada → divergente` | `verificarConsistencia()`, some Supabase parameter no longer matches the immutable on-chain value | writes `onchain_last_error` with the detail of what diverges, `sync_status='divergente'` — **never** touches `contract_address`/`token_address`/`onchain_emissor_wallet` (protected by the section 3.1 trigger anyway) |
| `divergente → *` | **no automatic one** | manual resolution (direct SQL by someone at Niara, or a future tool in `/socios` — out of this phase's scope) |
| `confirmada → *` (except `divergente`) | **none** | no "republish"/"edit" after confirmation |

---

## 6. Handling of each failure mode

| Scenario | Where it's caught | Behavior |
|---|---|---|
| The user rejects in MetaMask | `describeOnChainError` already handles it (`UserRejectedRequestError`/code 4001) | Message "You canceled the signature in the wallet." No write to Supabase (it never left `nao_onchain`). |
| The transaction reverts on-chain | `confirmarPublicacao()` reads the receipt, `status='reverted'` | See the state machine: back to `nao_onchain`, the real translated error written and shown, allows trying again. |
| The transaction "disappears" (never mined, or mined only much later) | `pendente` stays pending — no automatic timeout in this phase | The screen shows "waiting for confirmation" with an Etherscan link (the `tx_hash` is already public via URL); the issuer can come back whenever they want and the reconciliation runs again. I don't handle "abandoned" automatically — deciding that would require an arbitrary timeout policy; it stays as a possible future improvement, it doesn't block this phase. |
| The RPC goes down midway | `describeOnChainError` already handles it (`HttpRequestError`/`TimeoutError`/`RpcRequestError`) | If it went down **before** getting the hash: no write, message "couldn't reach the RPC". If it went down **after** getting the hash (only failing while waiting for confirmation): the hash was already persisted by `registrarTentativa()` before the wait — the reconciliation on the next page load solves it by itself, without depending on the same RPC working again in the same session. |
| The user closes the tab right after signing | Covered by the design, not a special case | `registrarTentativa()` has already run (it writes before waiting for confirmation) — when `/empresa/ofertas/[id]/publicar` is reopened, the Server Component calls `confirmarPublicacao()` automatically and resolves to `confirmada`/`nao_onchain`/`divergente` according to the chain's real state. |
| The Supabase row changes after confirmation (manual edit, a future bug in an edit UI) | `verificarConsistencia()`, called whenever the detail screen of a `confirmada` offering opens | `sync_status` becomes `divergente`, `onchain_last_error` records exactly which field diverges and both values (Supabase vs. chain) — neither is fixed automatically, resolution is manual (see section 5). |

---

## 7. Demo terms text

Shown as a mandatory-reading block with a checkbox (gate 6), visual style inherited from the
banner pattern (section 2.6) but expanded, inside `TermoPublicacao.tsx`. (The text was
proposed in Portuguese; it's translated below. The shipped text lives in both dictionaries.)

> **Before publishing, read carefully**
>
> You're about to sign a real transaction on the **Sepolia** test network, using your own
> wallet and paying your own gas in test ETH. Unlike the wallet connection in Profile (which
> only reads your address and balance), **this action writes permanent data to a public
> blockchain** — Niara doesn't sign for you and can't undo it later.
>
> Before continuing, confirm that you understand that:
>
> 1. **It's a test network, with no real value.** Sepolia ETH and the `MockBRL` used in this
>    demo have no backing nor any financial value. No real money changes hands here.
> 2. **The record is public and permanent.** Your company's name and this offering's terms
>    (target, deadline, value per share) will be recorded forever on a public blockchain,
>    visible to anyone on Etherscan — even after you delete your Niara PMEs account. Your
>    CNPJ is **not** written as text — only a hash (`bytes32`) of it, which can't be reversed
>    into the original number from the chain.
> 3. **You pay your own gas.** The transaction costs test ETH from your wallet — Niara doesn't
>    cover, refund or sponsor that fee.
> 4. **This is not a public offering of securities.** Niara PMEs is not a platform authorized
>    by the Brazilian Securities Commission (CVM). Nothing here constitutes a real investment
>    offering, and the on-chain record doesn't replace the corporate books of Law 6,404/76
>    nor registration with a notary.
> 5. **Unlike an investor on this platform, this is the first time you, as an issuer, sign a
>    transaction here.** Once published, your offering may receive real test investments
>    from other wallets — review the terms carefully before confirming.
>
> ☐ I've read and understood the points above, and I want to proceed with publishing on
> Sepolia.

(Point 5 already reflects the correction from finding 1.4 — it doesn't claim to be "the
site's first signature", only the first on the issuer's side, which is true.)

---

## 8. Custom error → message mapping

New entries for `CUSTOM_ERROR_MESSAGES` in `src/lib/web3/errors.ts` (same file, same
dictionary — no name collides with the already-mapped `OfertaCaptacao` errors). (The messages were
proposed in Portuguese and are translated below; today they live in both dictionaries, under
`chainErrors.evm.custom`, and several were rewritten after the incident noted at the end of
this section.)

| Solidity error | Proposed message |
|---|---|
| `ZeroAddress()` | "Invalid contract configuration — let Niara know." (shouldn't be reachable by the issuer; it would only show up from an address misconfigured on the platform side) |
| `EmissorNaoAutorizado(address emissor)` | "Your wallet isn't authorized to publish offerings yet — talk to Niara to get access." |
| `OfertaAnteriorAindaAberta(address oferta)` | "You already have an open offering on Sepolia — close it before publishing a new one." |
| `PrecoInvalido()` | "The value per share can't be zero." |
| `PrazoInvalido(uint256 prazo)` | "The offering deadline must be in the future." |
| `PrazoExcedeLimite(uint256 prazo, uint256 limite)` | "The offering deadline exceeds CVM Resolution 88's 180-day limit." |
| `MetaMaximaExcedeTeto(uint256 metaMaxima, uint256 teto)` | "The offering amount exceeds the R$15 million cap per offering." |
| `LoteAdicionalExcedeLimite(uint256 metaMaxima, uint256 metaMinima)` | "The additional lot exceeds 25% of the original offering." |
| `PrecoNaoDivideMetaMaxima(uint256 metaMaxima, uint256 precoPorCota)` | "The offering amount must be an exact multiple of the value per share." |
| `TaxaExcedeMaximo(uint256 taxaBps, uint256 maximo)` | "Invalid platform fee configuration — let Niara know." (a platform parameter, not the issuer's) |

Note: since the offering's values have already passed Supabase's `CHECK`s before reaching
`draft` (section 2.4), the first seven limit/arithmetic errors **shouldn't be reachable in
practice** — if one of them really shows up, it signals a divergence between the limits
mirrored in Postgres and the contract's real limits (e.g. rounding). Mapped anyway,
honestly, instead of a "generic error" — the same philosophy as the rest of the project (a raw
"Execution reverted" is unacceptable, but an error "that shouldn't happen" also deserves a
real sentence, not a false alarm of a UI bug).
*(Later finding: they were reachable — an old test offering with a 500,000% additional lot
was published on purpose and reverted with `LoteAdicionalExcedeLimite`; see `CLAUDE.md`,
"a revert for a Res. 88 violation", for the pre-validation gate added afterwards.)*

---

## 9. Test plan

### 9.1 Without touching Sepolia

- Minimal ABI (2.8): compare field by field against the JSON in
  `niara-contracts-PMEs/out/OfertaOrquestrador.sol/OfertaOrquestrador.json` (function names,
  parameter types, error names) — a static check, no network.
- Migration (3.1): apply locally (`supabase db reset`/local CLI), test each `CHECK` in
  isolation (try inserting `sync_status='pendente'` without `tx_hash`, must fail; try
  `sync_status='confirmada'` without `contract_address`, must fail; an address/hash in the
  wrong format, must fail) — **and test the immutability trigger** (3.1): write
  `contract_address` once, try a second `UPDATE` changing the value, must fail with
  `check_violation`; confirm that an `UPDATE` that only changes `sync_status`/
  `onchain_last_error` (the `confirmada → divergente` transition) is still allowed.
- `carregarElegibilidade()`: an integration test against local Supabase — confirms a 404 for
  another `issuer_id`'s offering, confirms rejection if `status != 'draft'`, confirms it
  returns `walletVinculada: null` when `issuers.wallet_address` is empty (without writing
  anything — it's read-only).
- `registrarTentativa()`: confirms the two-click race (a second call with `sync_status`
  already `'pendente'` updates nothing); confirms that `opens_at`/`closes_at` are written
  exactly from the `prazoUnixSeconds` received, not recomputed again on the server.
- `confirmarPublicacao()`: with a **simulated** receipt (a mock of `publicClient`, no real
  RPC) — four cases: `success` with a decodable `OfertaCompletaCriada` and matching
  parameters → `confirmada`, with `onchain_emissor_wallet` written exactly equal to the
  simulated event's `emissor` (never a value predefined in the test); `reverted` → back to
  `nao_onchain`; a receipt that doesn't decode as the expected event → `divergente`; a
  `success` receipt but with simulated `metaMaxima`/`precoPorCota`/`prazo` **different** from
  what the Supabase row has at that moment → `divergente` (the parameter check inside
  `confirmarPublicacao`, not only in `verificarConsistencia`). That covers the whole logic
  without spending test ETH even once.
- `verificarConsistencia()`: with simulated on-chain reads — matching parameters → changes
  nothing (stays `confirmada`); any single parameter (test all four, one at a time)
  diverging → `sync_status='divergente'` with `onchain_last_error` citing the right field;
  confirm that **no** call of this function ever attempts an `UPDATE` of
  `contract_address`/`token_address`/`onchain_emissor_wallet` (it wouldn't need to, since the
  migration trigger would block it anyway — but it's worth testing that the code doesn't even
  try).
- Live gate 5: confirm the comparison always uses the current read of
  `issuers.wallet_address` (change the value between two `carregarElegibilidade()` calls and
  see the gate recompute, with no value cached on the offering).
- The UI of the 6 gates + the wallet precondition: render `GateChecklist` with every
  combination of false/true gates (no MetaMask, wrong network, zero balance, not authorized,
  wrong wallet, terms not accepted) — a pure component test, no chain.
- Reading the reference `PSILVA` offering (sub-step 1, below): since the token/offering
  already exist and are **immutable** (they won't be closed again just for this test), the
  read can be validated at any time, comparing with the values already documented in
  `DEMO_SEPOLIA.md` (name "PSILVA", `emissorWallet = 0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6`,
  minimum target R$500,000/maximum R$600,000, share R$1,000, 90-day deadline).

### 9.2 Only an end-to-end test with wallet `0x47d9de93…` verifies

- The full real signing cycle: MetaMask opens, the issuer signs, gas leaves their wallet,
  `OfertaCompletaCriada` is emitted, the receipt is read back by the server, `sync_status`
  becomes `confirmada` with the right addresses.
- **A prerequisite to check first**: `0x47d9de93…` can only create a new offering if its
  last one is **not** at `estado() == Aberta` in the contract (the
  `OfertaAnteriorAindaAberta` gate — it's not a frontend bug if that reverts, it's the "one
  open offering at a time" rule working). Check via `cast call` before the test — if the
  reference offering (or any later offering created with that wallet) is still open, the
  end-to-end test needs a different wallet (also already authorized in
  `emissoresAutorizados`) or to wait for that offering to be closed.
- Also only a real test verifies: MetaMask's exact behavior estimating gas for
  `criarOfertaCompleta` (4 internal sub-calls) — the contracts repository's
  `PLANO_OFERTA_ORQUESTRADOR.md` already recommends pinning a generous explicit `gasLimit`
  (~1.2M) instead of trusting the automatic estimate 100%; it's worth confirming that's also
  needed when calling via wagmi's `useWriteContract` (not only via `cast`).
- And the "close the tab after signing" case in practice: really close the browser between
  the sign click and the confirmation, reopen the URL later, confirm the automatic
  reconciliation solves it by itself.

---

## 10. Split into separately implementable sub-steps

An order designed to validate reads before writes, and each sub-step is independently
testable/reviewable before moving to the next:

1. **Read-only, no migration, no heavy new UI.** `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` in
   `.env.local`; minimal ABI (2.8); `useEmissorAutorizado()`; a temporary diagnostic card (or
   a dev-only page) that reads `emissoresAutorizados(0x47d9de93…)` (must return `true`) and the
   `PSILVA` offering's public data via the **existing** `OfertaCaptacao`/`ParticipacaoToken`
   ABIs — no write at all, no migration. Acceptance criterion: the values read match the ones
   documented in `DEMO_SEPOLIA.md`.
2. **Schema.** Migration `0015` (section 3), applied and tested locally (9.1) — no new UI
   uses the columns yet.
3. **Eligibility without a signature.** The `/empresa/ofertas/[id]/publicar` route +
   `carregarElegibilidade()` + `GateChecklist` showing the 6 gates (gate 5 already comparing
   live against `issuers.wallet_address`, with no new column in use for that yet — only the
   reconciliation read columns of migration 2) and the linked-wallet precondition, really
   computed — the final sign button stays **hidden or disabled** in this sub-step. Validates
   the whole eligibility logic without spending gas.
4. **Terms + enabled button.** `TermoPublicacao`, `usePublicarOfertaOnChain`,
   `registrarTentativa` (already with the `opens_at`/`closes_at` freeze),
   `confirmarPublicacao` (already with the built-in parameter check), `SyncStatusBadge`. Ends
   with the end-to-end test of section 9.2, using `0x47d9de93…` (or another already
   authorized wallet).
5. **Continuous reconciliation.** `verificarConsistencia()` (sections 4.2/5) called on the
   detail screen of any already `confirmada` offering; a `divergente` badge visible both there
   and on the list card. Only makes sense after sub-step 4 exists (it needs at least one real
   `confirmada` offering to exercise).
6. **Optional, off the critical path.** Extract a shared `<DemoBanner/>` (2.6); automate the
   ABI extraction (2.8) instead of copying by hand; harden `saveWallet()` with a signature
   challenge (2.3.1) — none of them blocks the rest.

Each sub-step above is, as I read it, an independent commit (or a small group of commits) —
none of them leaves the system in a worse state than today if it stops there (sub-step 1
writes nothing; sub-step 2 is additive and unused so far; sub-step 3 signs nothing; sub-step 4
introduces the ability to really sign; 5 only observes what has already been published, it
never writes to the trigger-protected fields).

---

## Decisions consolidated in this revision (none pending)

1. **Approval = `emissoresAutorizados` on-chain** (section 1.1), explicitly recorded as the
   **record** of a KYB decision made outside the system, not the decision itself — a future
   KYB process would feed that act, never replace it.
2. **`offerings.status` untouched** (section 1.2) — the on-chain publication lives only in
   orthogonal columns.
3. **Ownership without a pre-registered column** (section 1.3): gate 5 compares live against
   `issuers.wallet_address`; `onchain_emissor_wallet` is written a single time, only as an
   audit fact inside `confirmarPublicacao()`, and locked by a database trigger (section 3.1)
   — not only by an application guard. `saveWallet()` doesn't verify ownership (reported in
   section 2.3.1); that doesn't allow forging a signature (the real private key is still
   needed), only hijacking an unclaimed address — recorded as separate hardening, it doesn't
   block this phase.
4. **`divergente` covers parameter drift** (section 5): the on-chain `metaMaxima`/
   `precoPorCota`/`metaMinima`/`prazo` are immutable; Supabase's `hard_cap_cents`/
   `share_price_cents`/`target_min_cents`/`closes_at` aren't. `verificarConsistencia()`
   compares both sides whenever a `confirmada` offering is revisited, and marks `divergente`
   without fixing either automatically. `opens_at`/`closes_at` are frozen at the real deadline
   sent to the chain at `registrarTentativa()` time, so the comparison has a stable baseline.
5. **Column name**: `onchain_emissor_wallet`.

## Sub-steps to unlock Step 1

Picking up section 10 again (now with 6 sub-steps, after incorporating the continuous
reconciliation of point 4 above):

1. Read-only (gate 4 + `PSILVA`'s public data), no migration, no write.
2. Migration `0015` (schema + immutability trigger), no new UI in use yet.
3. Eligibility without a signature (the `/publicar` route, 6 gates + wallet precondition,
   final button hidden/disabled).
4. Terms + enabled button (real signature, `registrarTentativa`/`confirmarPublicacao` with
   the deadline freeze and the parameter check) — ends with the end-to-end test of section
   9.2.
5. Continuous reconciliation (`verificarConsistencia`, `divergente` badge).
6. Optional/off the critical path: a shared `<DemoBanner/>`, automated ABI extraction,
   `saveWallet()` hardening.

Each one is independently reviewable and doesn't leave the system worse than today if it
stops there — once Step 1 is unlocked, I start with sub-step 1.
