"use server";

// Server Actions da tela /perfil — leitura e edição dos dados REAIS de
// investors/issuers do usuário logado, e leitura (resumo, não-CRUD) das
// ofertas reais do issuer logado. REGRA DE HONESTIDADE: isto LÊ e GRAVA no
// banco de verdade (diferente do que resta simulado em /perfil — ver
// InvestorProfileSection). user_id/accountId nunca vêm do cliente: sempre
// resolveAccount() (sessão no servidor). zod só valida formato; quem valida
// regra de negócio (teto SEP de R$40M) é o banco — a action tenta a operação
// e traduz o erro do Postgres, nunca replica o CHECK em JS (mesmo padrão de
// src/app/cadastro/actions.ts).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidCEP, isValidCNPJ, isValidCPF, isValidDataNascimento, isValidTelefone, onlyDigits } from "@/lib/masks";
import { MONEY_FORMAT, centsToReais, reaisToCents } from "@/lib/money";
import {
  getIssuerLogoVersion,
  ISSUER_LOGO_BUCKET,
  ISSUER_LOGO_EXT_BY_TYPE,
  ISSUER_LOGO_MAX_BYTES,
  isIssuerLogoMimeType,
  issuerLogoUrl,
} from "@/lib/storage/issuer-logo";

type SharedFields = {
  email: string;
  taxId: string;
  phone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  walletAddress: string | null;
};

export type LoadedProfile =
  | (SharedFields & {
      role: "investor";
      fullName: string;
      birthDate: string; // DD/MM/AAAA, "" se ainda não preenchido
    })
  | (SharedFields & {
      role: "issuer";
      legalName: string;
      tradeName: string;
      annualRevenueReais: string; // "5.000.000,00", "" se ainda não preenchido
      sector: string; // dado PÚBLICO — aparece na página da oferta (0008)
      businessSummary: string; // idem
      publishCnpj: boolean; // opt-in — CNPJ (mascarado) na página pública da oferta (0009)
      logoUrl: string | null; // dado PÚBLICO — aparece na página da oferta (0010)
    });

export type UpdateProfileState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

function isoToBrDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function brDateToIso(value: string): string {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export async function loadProfile(): Promise<LoadedProfile> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (!role || !accountId) {
    redirect("/cadastro");
  }

  const admin = createAdminClient();
  const email = user.email ?? "";

  if (role === "investor") {
    const { data, error } = await admin
      .from("investors")
      .select(
        "full_name, tax_id, birth_date, phone, wallet_address, addr_cep, addr_street, addr_number, addr_complement, addr_neighborhood, addr_city, addr_state",
      )
      .eq("id", accountId)
      .single();

    if (error || !data) {
      console.error("loadProfile: falha ao ler investor", error);
      redirect("/entrar");
    }

    return {
      role: "investor",
      email,
      fullName: data.full_name ?? "",
      taxId: data.tax_id ?? "",
      birthDate: isoToBrDate(data.birth_date),
      phone: data.phone ?? "",
      walletAddress: data.wallet_address,
      cep: data.addr_cep ?? "",
      logradouro: data.addr_street ?? "",
      numero: data.addr_number ?? "",
      complemento: data.addr_complement ?? "",
      bairro: data.addr_neighborhood ?? "",
      cidade: data.addr_city ?? "",
      estado: data.addr_state ?? "",
    };
  }

  const { data, error } = await admin
    .from("issuers")
    .select(
      "legal_name, trade_name, tax_id, annual_revenue_cents, sector, business_summary, publish_cnpj, phone, wallet_address, logo_path, addr_cep, addr_street, addr_number, addr_complement, addr_neighborhood, addr_city, addr_state",
    )
    .eq("id", accountId)
    .single();

  if (error || !data) {
    console.error("loadProfile: falha ao ler issuer", error);
    redirect("/entrar");
  }

  const logoUrl = data.logo_path
    ? issuerLogoUrl(data.logo_path, await getIssuerLogoVersion(admin, data.logo_path))
    : null;

  return {
    role: "issuer",
    email,
    legalName: data.legal_name ?? "",
    tradeName: data.trade_name ?? "",
    taxId: data.tax_id ?? "",
    annualRevenueReais:
      data.annual_revenue_cents === null ? "" : centsToReais(BigInt(data.annual_revenue_cents)),
    sector: data.sector ?? "",
    businessSummary: data.business_summary ?? "",
    publishCnpj: data.publish_cnpj ?? false,
    logoUrl,
    phone: data.phone ?? "",
    walletAddress: data.wallet_address,
    cep: data.addr_cep ?? "",
    logradouro: data.addr_street ?? "",
    numero: data.addr_number ?? "",
    complemento: data.addr_complement ?? "",
    bairro: data.addr_neighborhood ?? "",
    cidade: data.addr_city ?? "",
    estado: data.addr_state ?? "",
  };
}

export type OfferingSummary = {
  id: string;
  status: "draft" | "active" | "funded" | "failed" | "settled" | "cancelled";
  base_cap_cents: number;
  target_min_cents: number;
  created_at: string;
};

// Resumo (não-CRUD) das ofertas REAIS do issuer logado, para a seção "Minhas
// ofertas" de /perfil — o cadastro/ativação/fechamento continuam só em
// /empresa/ofertas. accountId vem sempre de resolveAccount() (sessão no
// servidor), nunca de um parâmetro vindo do cliente — cada empresa só pode
// ver as próprias ofertas.
export async function loadMyOfferingsSummary(): Promise<OfferingSummary[]> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offerings")
    .select("id, status, base_cap_cents, target_min_cents, created_at")
    .eq("issuer_id", accountId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("loadMyOfferingsSummary: falha ao ler offerings", error);
    return [];
  }

  return data;
}

const addressSchema = {
  phone: z.string().refine((value) => isValidTelefone(value), "Telefone inválido.").transform(onlyDigits),
  cep: z.string().refine((value) => isValidCEP(value), "CEP inválido.").transform(onlyDigits),
  logradouro: z.string().trim().min(1, "Informe a rua."),
  numero: z.string().trim().min(1, "Informe o número."),
  complemento: z.string().trim(),
  bairro: z.string().trim().min(1, "Informe o bairro."),
  cidade: z.string().trim().min(1, "Informe a cidade."),
  estado: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "Selecione o estado.")
    .transform((value) => value.toUpperCase()),
};

const investorUpdateSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome completo."),
  taxId: z.string().refine((value) => isValidCPF(value), "CPF inválido — informe os 11 dígitos.").transform(onlyDigits),
  birthDate: z
    .string()
    .refine((value) => isValidDataNascimento(value), "Data de nascimento inválida.")
    .transform(brDateToIso),
  ...addressSchema,
});

const issuerUpdateSchema = z.object({
  legalName: z.string().trim().min(1, "Informe a razão social."),
  tradeName: z.string().trim(),
  taxId: z.string().refine((value) => isValidCNPJ(value), "CNPJ inválido — informe os 14 dígitos.").transform(onlyDigits),
  annualRevenueReais: z
    .string()
    .trim()
    .min(1, "Informe a receita bruta anual.")
    .regex(MONEY_FORMAT, "Use o formato 5.000.000,00 (só números, ponto de milhar e vírgula decimal)."),
  sector: z.string().trim(),
  businessSummary: z.string().trim(),
  publishCnpj: z.boolean(),
  ...addressSchema,
});

function firstFieldErrors(error: z.ZodError): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in result)) {
      result[field] = issue.message;
    }
  }
  return result;
}

function translateDbError(error: PostgrestError): UpdateProfileState {
  if (error.code === "23514" && error.message.includes("issuer_is_sep")) {
    return {
      status: "error",
      message: "Receita bruta acima do limite de R$40 milhões da SEP (Resolução CVM 88).",
      fieldErrors: { annualRevenueReais: "Acima do limite de R$40 milhões." },
    };
  }
  console.error("updateProfile: erro inesperado do banco", error);
  return {
    status: "error",
    message: "Não foi possível salvar seus dados. Tente novamente em instantes.",
  };
}

export async function updateProfile(dataInput: unknown): Promise<UpdateProfileState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId }: { role: AccountRole | null; accountId: string | null } = await resolveAccount();
  if (!role || !accountId) {
    redirect("/cadastro");
  }

  const admin = createAdminClient();

  if (role === "investor") {
    const parsed = investorUpdateSchema.safeParse(dataInput);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: firstFieldErrors(parsed.error),
      };
    }

    const { error } = await admin
      .from("investors")
      .update({
        full_name: parsed.data.fullName,
        tax_id: parsed.data.taxId,
        birth_date: parsed.data.birthDate,
        phone: parsed.data.phone,
        addr_cep: parsed.data.cep,
        addr_street: parsed.data.logradouro,
        addr_number: parsed.data.numero,
        addr_complement: parsed.data.complemento || null,
        addr_neighborhood: parsed.data.bairro,
        addr_city: parsed.data.cidade,
        addr_state: parsed.data.estado,
      })
      .eq("id", accountId);

    if (error) {
      return translateDbError(error);
    }
  } else {
    const parsed = issuerUpdateSchema.safeParse(dataInput);
    if (!parsed.success) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: firstFieldErrors(parsed.error),
      };
    }

    const annualRevenueCents = reaisToCents(parsed.data.annualRevenueReais);
    if (annualRevenueCents === null) {
      return {
        status: "error",
        message: "Corrija os campos destacados.",
        fieldErrors: { annualRevenueReais: "Use o formato 5.000.000,00." },
      };
    }

    const { error } = await admin
      .from("issuers")
      .update({
        legal_name: parsed.data.legalName,
        trade_name: parsed.data.tradeName || null,
        tax_id: parsed.data.taxId,
        annual_revenue_cents: annualRevenueCents.toString(),
        sector: parsed.data.sector || null,
        business_summary: parsed.data.businessSummary || null,
        publish_cnpj: parsed.data.publishCnpj,
        phone: parsed.data.phone,
        addr_cep: parsed.data.cep,
        addr_street: parsed.data.logradouro,
        addr_number: parsed.data.numero,
        addr_complement: parsed.data.complemento || null,
        addr_neighborhood: parsed.data.bairro,
        addr_city: parsed.data.cidade,
        addr_state: parsed.data.estado,
      })
      .eq("id", accountId);

    if (error) {
      return translateDbError(error);
    }
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

// Vínculo de carteira (0006/0007) — só o FORMATO do endereço é validado aqui
// (zod); a unicidade é responsabilidade do UNIQUE do banco (per-tabela,
// nullable-safe), traduzido de volta em translateWalletDbError. A LINHA
// gravada é sempre a resolvida por resolveAccount() (sessão no servidor);
// o endereço em si vem do cliente (wagmi/MetaMask), mas nunca a conta-alvo.
const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Endereço de carteira inválido.")
  .transform((value) => value.toLowerCase());

function translateWalletDbError(error: PostgrestError): UpdateProfileState {
  if (error.code === "23505") {
    return {
      status: "error",
      message: "Esta carteira já está vinculada a outra conta.",
    };
  }
  console.error("saveWallet: erro inesperado do banco", error);
  return {
    status: "error",
    message: "Não foi possível salvar a carteira. Tente novamente em instantes.",
  };
}

export async function saveWallet(addressInput: unknown): Promise<UpdateProfileState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId }: { role: AccountRole | null; accountId: string | null } = await resolveAccount();
  if (!role || !accountId) {
    redirect("/cadastro");
  }

  const parsed = walletAddressSchema.safeParse(addressInput);
  if (!parsed.success) {
    return { status: "error", message: "Endereço de carteira inválido." };
  }

  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ wallet_address: parsed.data }).eq("id", accountId);

  if (error) {
    return translateWalletDbError(error);
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

export async function unlinkWallet(): Promise<UpdateProfileState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId }: { role: AccountRole | null; accountId: string | null } = await resolveAccount();
  if (!role || !accountId) {
    redirect("/cadastro");
  }

  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ wallet_address: null }).eq("id", accountId);

  if (error) {
    console.error("unlinkWallet: erro inesperado do banco", error);
    return {
      status: "error",
      message: "Não foi possível desvincular a carteira. Tente novamente em instantes.",
    };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

// Logo da empresa (0010 + escopo 4c) — diferente de tudo mais que resta
// simulado em /perfil, isto sobe um arquivo de verdade para o bucket público
// 'issuer-logos' e grava o caminho em issuers.logo_path. Só role='issuer'
// pode chamar; accountId sempre de resolveAccount() (sessão no servidor),
// nunca de um id vindo do cliente — cada empresa só escreve na própria
// pasta (`${accountId}/logo.<ext>`). Tipo/tamanho são validados AQUI, não só
// no input do navegador (LogoUpload.tsx) — essa validação é só cortesia de UX.
export type UploadLogoState = { status: "success"; logoUrl: string } | { status: "error"; message: string };

export async function uploadIssuerLogo(formData: FormData): Promise<UploadLogoState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas podem enviar logo." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: "Selecione um arquivo de imagem." };
  }
  if (!isIssuerLogoMimeType(file.type)) {
    return { status: "error", message: "Formato inválido — envie um arquivo JPG, PNG ou WebP." };
  }
  if (file.size > ISSUER_LOGO_MAX_BYTES) {
    return { status: "error", message: "A imagem deve ter até 2MB." };
  }

  const admin = createAdminClient();
  const path = `${accountId}/logo.${ISSUER_LOGO_EXT_BY_TYPE[file.type]}`;

  const { data: current } = await admin.from("issuers").select("logo_path").eq("id", accountId).single();
  const previousPath = current?.logo_path ?? null;

  const { error: uploadError } = await admin.storage.from(ISSUER_LOGO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    console.error("uploadIssuerLogo: falha no upload", uploadError);
    return { status: "error", message: "Não foi possível enviar a logo. Tente novamente em instantes." };
  }

  const { error: dbError } = await admin.from("issuers").update({ logo_path: path }).eq("id", accountId);
  if (dbError) {
    console.error("uploadIssuerLogo: falha ao gravar logo_path", dbError);
    return { status: "error", message: "Não foi possível salvar a logo. Tente novamente em instantes." };
  }

  // A extensão pode mudar entre uploads (ex.: png -> jpg): o upsert só
  // sobrescreve quando o caminho é idêntico, então um caminho anterior
  // diferente vira arquivo órfão no bucket se não for limpo aqui.
  if (previousPath && previousPath !== path) {
    const { error: removeOldError } = await admin.storage.from(ISSUER_LOGO_BUCKET).remove([previousPath]);
    if (removeOldError) {
      console.error("uploadIssuerLogo: falha ao remover logo anterior", removeOldError);
    }
  }

  const version = await getIssuerLogoVersion(admin, path);
  revalidatePath("/perfil");
  return { status: "success", logoUrl: issuerLogoUrl(path, version)! };
}

export async function removeIssuerLogo(): Promise<UpdateProfileState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: "Apenas empresas podem remover a logo." };
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("issuers").select("logo_path").eq("id", accountId).single();
  const path = current?.logo_path ?? null;

  if (path) {
    const { error: removeError } = await admin.storage.from(ISSUER_LOGO_BUCKET).remove([path]);
    if (removeError) {
      console.error("removeIssuerLogo: falha ao remover arquivo do bucket", removeError);
    }
  }

  const { error } = await admin.from("issuers").update({ logo_path: null }).eq("id", accountId);
  if (error) {
    console.error("removeIssuerLogo: erro inesperado do banco", error);
    return { status: "error", message: "Não foi possível remover a logo. Tente novamente em instantes." };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}
