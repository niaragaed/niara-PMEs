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
