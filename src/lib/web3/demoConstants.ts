// Mirrors 1:1 the fixed constants of script/DemoNiaraPMEsOnChain.s.sol (sister repo
// niara-contracts-PMEs) — the 10 real offerings on Sepolia are all created with these same
// parameters (confirmed via `cast call` before writing this file, see CLAUDE.md, "10 backup
// offerings for the Startup Summit"). Single source of truth: never duplicate these numbers in
// another file. If the script changes, update them here by hand — there's no automatic sync
// between the two repositories.
//
// The unit is always mBRL (MockBRL) — a test currency with no backing, never label it "R$" in
// the UI (see src/lib/mock/ofertasOnChain.ts and PmesOnChainCard.tsx, which consume these constants).
export const ONCHAIN_SMES_MIN_TARGET_MBRL = 100;
export const ONCHAIN_SMES_MAX_TARGET_MBRL = 200;
export const ONCHAIN_SMES_PRICE_PER_SHARE_MBRL = 10;
export const ONCHAIN_SMES_CAP_PER_INVESTOR_MBRL = 200;
export const ONCHAIN_SMES_AUTHORIZED_SHARES = 20;
// Each offering's exact deadline is always read on-chain (useOnChainOfferingTerms().deadline) —
// never from this value, which is only an approximate reference for static copy that needs to
// mention "~180 days" without an on-chain read.
export const ONCHAIN_SMES_DEADLINE_DAYS = 180;
