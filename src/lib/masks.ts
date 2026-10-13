// Máscaras e validações de formato para a tela /perfil. Validação aqui é só
// de formato/comprimento (ex.: CPF com 11 dígitos) — não checa dígitos
// verificadores, já que é o suficiente para uma tela de demonstração sem
// backend real.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCPF(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export type PersonType = "pf" | "pj";

export function maskDocument(value: string, type: PersonType): string {
  return type === "pf" ? maskCPF(value) : maskCNPJ(value);
}

// Máscara de EXIBIÇÃO PÚBLICA do CNPJ (página pública da oferta) — oculta
// filial + dígitos verificadores de verdade (não só os 2 últimos), só a raiz
// (8 primeiros dígitos, identifica a empresa) fica visível. Espera 14
// dígitos (chamar só quando issuers.publish_cnpj = true e tax_id já foi lido
// do banco); fora disso retorna "" para nunca vazar um valor parcial.
export function maskCnpjPublic(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return "";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/****-**`;
}

export function maskCEP(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskBirthDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d{1,4})$/, "$1/$2");
}

export function isValidCPF(value: string): boolean {
  return onlyDigits(value).length === 11;
}

export function isValidCNPJ(value: string): boolean {
  return onlyDigits(value).length === 14;
}

export function isValidDocument(value: string, type: PersonType): boolean {
  return type === "pf" ? isValidCPF(value) : isValidCNPJ(value);
}

export function isValidCEP(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export function isValidPhone(value: string): boolean {
  const length = onlyDigits(value).length;
  return length === 10 || length === 11;
}

export function isValidBirthDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  if (year < 1900) return false;
  return new Date(year, month - 1, day) <= new Date();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
