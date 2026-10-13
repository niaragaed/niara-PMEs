// Exact conversion of reais (string, pt-BR format) to cents (bigint) —
// never goes through a float. The string is parsed and scaled by 100 via BigInt.
// Shared by the onboarding Server Action (gross revenue, see
// src/app/cadastro/actions.ts) and the offerings one (value/target, see
// src/app/empresa/ofertas/actions.ts). Money inputs keep the pt-BR format in both interface
// languages (it's a BRL amount, and this parser is the source of truth).

// Accepted format: "5.000.000,00" or "5000000,00" or "5000000" (optional thousands
// dot, optional decimal comma with 1-2 places).
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

// The exact inverse of reaisToCents — integer BigInt, never a float division
// (avoids rounding errors, e.g. 500000000n -> "5.000.000,00", never
// "4999999,99").
export function centsToReais(cents: bigint): string {
  const negative = cents < BigInt(0);
  const absCents = negative ? -cents : cents;
  const integerPart = (absCents / BigInt(100)).toString();
  const centsPart = (absCents % BigInt(100)).toString().padStart(2, "0");
  const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${withThousands},${centsPart}`;
}
