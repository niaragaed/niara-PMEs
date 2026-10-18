// Addresses of the real contracts on Sepolia used by the on-chain integration (see
// CLAUDE.md, the "/investir/onchain screen" section). Never hard-code a contract address
// inside a React component — always go through here, the same centralization pattern already used
// for the project's other environment variables.
//
// Supports SEVERAL simultaneous offerings (`NEXT_PUBLIC_OFERTAS_ONCHAIN`) — designed for an
// in-person demo (e.g. an event booth) where the presenter switches offerings for each visitor
// without needing a new deploy (`NEXT_PUBLIC_*` env vars are baked into the build on Vercel — just
// switching the value doesn't republish the site). Each offering is created a single time by an
// admin script outside the frontend (niara-contracts-PMEs/script/DemoNiaraPMEsOnChain.s.sol) —
// this project never creates on-chain offerings dynamically. `MockBRL` is shared by all of these
// legacy offerings (same infrastructure, see that script); self-service offerings use their own —
// always resolved from `OfertaCaptacao.moeda()` (see contracts.ts).

const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export type OnChainOfferingAddresses = {
  token: `0x${string}`;
  offering: `0x${string}`;
};

export type OnChainAddresses = {
  mockBrl: `0x${string}`;
  offerings: OnChainOfferingAddresses[];
};

function readAddress(value: string | undefined): `0x${string}` | null {
  if (!value || !HEX_ADDRESS_PATTERN.test(value)) return null;
  return value as `0x${string}`;
}

// Format: "token1:offering1;token2:offering2;..." — simple delimiters on purpose, to
// avoid JSON escaping problems inside an environment variable value.
function parseOfferings(value: string | undefined): OnChainOfferingAddresses[] {
  if (!value) return [];

  return value
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [tokenRaw, offeringRaw] = pair.split(":").map((part) => part?.trim());
      return { token: readAddress(tokenRaw), offering: readAddress(offeringRaw) };
    })
    .filter((pair): pair is OnChainOfferingAddresses => Boolean(pair.token && pair.offering));
}

/**
 * Reads the `MockBRL` address and the list of offerings from the `NEXT_PUBLIC_*` environment
 * variables. Returns `null` (never throws) when `MockBRL` is missing/malformed or the offering list
 * is empty — the UI treats that case as "contract without a configured address" instead of
 * breaking the render.
 */
export function getOnChainAddresses(): OnChainAddresses | null {
  const mockBrl = readAddress(process.env.NEXT_PUBLIC_MOCKBRL_ADDRESS);
  const offerings = parseOfferings(process.env.NEXT_PUBLIC_OFERTAS_ONCHAIN);

  if (!mockBrl || offerings.length === 0) return null;

  return { mockBrl, offerings };
}
