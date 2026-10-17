# Niara PMEs

Site and product of the Niara platform for small and medium-sized enterprises
(SMEs, *PMEs* in Portuguese): fundraising and splitting company capital through
tokenization.

Current stage: an institutional site with a **real backend (Supabase)** for the
fundraising cycle (sign-up, sign-in, offering, investment) and **real investment
on the Sepolia testnet and on Solana Devnet** (`/investir/onchain`, transactions
actually signed with MetaMask or Phantom against the contracts deployed from
`niara-contracts-PMEs` and the `niara-pmes-solana` program). This includes the
`/negociar` showcase, where the 10 real offerings in the SME Token category appear
with the identity of fictitious demo companies (name, photo, logo): the
transaction is real, the company behind it is not. The other `/negociar`
categories keep a simulated order ticket, and the portfolio dashboard
(`/ativos`) is still 100% mock. There is also an internal dashboard restricted to
the partners (`/socios`, email allowlist) that combines real on-chain data
with Supabase demo data, always in separate sections.

The interface is available in **Portuguese and English** (language switcher in
the header). See [`CLAUDE.md`](./CLAUDE.md) for the stack, architecture, design
system and the project's full rules.

## Development

Requires Node 24 (npm 11), pinned in `.nvmrc` and `package.json` (`nvm use` picks it up).

```bash
npm ci
cp .env.example .env.local   # fill in your credentials (see .env.example)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint      # ESLint
npx tsc --noEmit  # type check
npm run build     # production build
npm run seed:demo # issuer account + active offering + investor account ready for a demo
```
