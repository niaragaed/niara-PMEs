const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(value: number): string {
  return brlFormatter.format(value);
}

export function formatSignedBRL(value: number): string {
  const formatted = brlFormatter.format(Math.abs(value));
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatSignedPercent(value: number): string {
  const formatted = percentFormatter.format(Math.abs(value));
  return `${value < 0 ? "-" : "+"}${formatted}%`;
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}
