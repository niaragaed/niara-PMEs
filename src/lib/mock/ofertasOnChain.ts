// ORDEM EXATA das 10 ofertas reais em Sepolia — a POSIÇÃO de cada slug nesta lista é o índice
// usado em NEXT_PUBLIC_OFERTAS_ONCHAIN (ver src/lib/web3/addresses.ts). Nunca reordenar esta
// lista sem também reordenar aquela variável de ambiente (e vice-versa) — não há verificação
// automática entre os dois lados, só esta lista como ponto único de verdade no frontend. Cada
// slug precisa existir em `OFERTAS` (src/lib/mock/ofertas.ts) com `categoria === "pmes"`.
export const ONCHAIN_PMES_SLUGS_EM_ORDEM: readonly string[] = [
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
  const index = ONCHAIN_PMES_SLUGS_EM_ORDEM.indexOf(slug);
  return index === -1 ? null : index;
}

if (process.env.NODE_ENV !== "production") {
  const semDuplicatas = new Set(ONCHAIN_PMES_SLUGS_EM_ORDEM).size === ONCHAIN_PMES_SLUGS_EM_ORDEM.length;
  if (!semDuplicatas) {
    throw new Error("ONCHAIN_PMES_SLUGS_EM_ORDEM tem slugs duplicados — cada posição deve ser única.");
  }
  if (ONCHAIN_PMES_SLUGS_EM_ORDEM.length !== 10) {
    throw new Error(
      `ONCHAIN_PMES_SLUGS_EM_ORDEM deveria ter 10 entradas (uma por oferta real em Sepolia), tem ${ONCHAIN_PMES_SLUGS_EM_ORDEM.length}.`,
    );
  }

  // A checagem contra OFERTAS (categoria === "pmes" para cada slug) fica em ofertas.ts, não
  // aqui — importar OFERTAS neste módulo criaria um ciclo (ofertas.ts usa
  // getOnChainIndexBySlug indiretamente via a UI, não precisa deste arquivo para se validar).
}
