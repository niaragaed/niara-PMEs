// The EXACT ORDER of the 10 real offerings on Sepolia — the POSITION of each slug in this list is
// the index used in NEXT_PUBLIC_OFERTAS_ONCHAIN (see src/lib/web3/addresses.ts). Never reorder this
// list without also reordering that environment variable (and vice versa) — there's no automatic
// check between the two sides, only this list as the single source of truth on the frontend. Each
// slug must exist in `OFFERINGS` (src/lib/mock/ofertas.ts) with `category === "pmes"`.
export const ONCHAIN_SMES_SLUGS_IN_ORDER: readonly string[] = [
  "pme-padaria-bela-vista",
  "pme-clinica-vitalis",
  "pme-barbearia-corte-estilo",
  "pme-petshop-amigo-fiel",
  "pme-academia-vigor-fitness",
  "pme-marcenaria-raizes",
  "pme-cafeteria-grao-arte",
  "pme-lavanderia-expressa-clean",
  "pme-escola-idiomas-global-fluente",
  "pme-estetica-bella-pele",
];

export function getOnChainIndexBySlug(slug: string): number | null {
  const index = ONCHAIN_SMES_SLUGS_IN_ORDER.indexOf(slug);
  return index === -1 ? null : index;
}

if (process.env.NODE_ENV !== "production") {
  const withoutDuplicates = new Set(ONCHAIN_SMES_SLUGS_IN_ORDER).size === ONCHAIN_SMES_SLUGS_IN_ORDER.length;
  if (!withoutDuplicates) {
    throw new Error("ONCHAIN_SMES_SLUGS_IN_ORDER has duplicate slugs — each position must be unique.");
  }
  if (ONCHAIN_SMES_SLUGS_IN_ORDER.length !== 10) {
    throw new Error(
      `ONCHAIN_SMES_SLUGS_IN_ORDER should have 10 entries (one per real offering on Sepolia), it has ${ONCHAIN_SMES_SLUGS_IN_ORDER.length}.`,
    );
  }

  // The check against OFFERINGS (category === "pmes" for each slug) lives in ofertas.ts, not
  // here — importing OFFERINGS in this module would create a cycle (ofertas.ts uses
  // getOnChainIndexBySlug indirectly via the UI, it doesn't need this file to validate itself).
}
