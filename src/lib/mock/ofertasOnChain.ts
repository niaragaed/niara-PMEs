// ORDEM EXATA das 10 ofertas reais em Sepolia — a POSIÇÃO de cada slug nesta lista é o índice
// usado em NEXT_PUBLIC_OFERTAS_ONCHAIN (ver src/lib/web3/addresses.ts). Nunca reordenar esta
// lista sem também reordenar aquela variável de ambiente (e vice-versa) — não há verificação
// automática entre os dois lados, só esta lista como ponto único de verdade no frontend. Cada
// slug precisa existir em `OFERTAS` (src/lib/mock/ofertas.ts) com `categoria === "pmes"`.
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

  // A checagem contra OFERTAS (categoria === "pmes" para cada slug) fica em ofertas.ts, não
  // aqui — importar OFERTAS neste módulo criaria um ciclo (ofertas.ts usa
  // getOnChainIndexBySlug indiretamente via a UI, não precisa deste arquivo para se validar).
}
