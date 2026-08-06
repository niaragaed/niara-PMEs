// Conversão exata de reais (string, formato pt-BR) para centavos (bigint) —
// nunca passa por float. String parseada e escalada por 100 via BigInt.
// Compartilhado entre a Server Action de onboarding (receita bruta, ver
// src/app/cadastro/actions.ts) e a de ofertas (valor/meta, ver
// src/app/empresa/ofertas/actions.ts).

// Formato aceito: "5.000.000,00" ou "5000000,00" ou "5000000" (ponto de
// milhar opcional, vírgula decimal opcional com 1-2 casas).
export const MONEY_FORMAT = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;

export function reaisToCents(value: string): bigint | null {
  if (!MONEY_FORMAT.test(value)) return null;
  const [integerPart, decimalPart = ""] = value.replace(/\./g, "").split(",");
  const centsPart = (decimalPart + "00").slice(0, 2);
  try {
    return BigInt(integerPart) * BigInt(100) + BigInt(centsPart);
  } catch {
    return null;
  }
}

// Inverso exato de reaisToCents — BigInt inteiro, nunca divisão em float
// (evita erro de arredondamento, ex.: 500000000n -> "5.000.000,00", nunca
// "4999999,99").
export function centsToReais(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absCents = negative ? -cents : cents;
  const integerPart = (absCents / BigInt(100)).toString();
  const centsPart = (absCents % BigInt(100)).toString().padStart(2, "0");
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${withThousands},${centsPart}`;
}
