"use server";

// Server Actions for the /perfil screen — reading and editing the signed-in user's REAL
// investors/issuers data, and reading (summary, not CRUD) the signed-in issuer's real offerings.
// HONESTY RULE: this actually READS and WRITES the database (unlike what's still simulated in
// /perfil — see InvestorProfileSection). user_id/accountId never come from the client: always
// resolveAccount() (session on the server). zod only checks format; the business rule (the R$40M
// SEP cap) is checked by the database — the action attempts the operation and translates the
// Postgres error, it never replicates the CHECK in JS (same pattern as
// src/app/cadastro/actions.ts).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";
import { resolveAccount, type AccountRole } from "@/lib/auth/resolveInvestor";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { centsToReais, reaisToCents } from "@/lib/money";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { firstFieldErrors, investorFields, issuerFields } from "@/lib/registration-schemas";
import {
  getIssuerLogoVersion,
  ISSUER_LOGO_BUCKET,
  ISSUER_LOGO_EXT_BY_TYPE,
  ISSUER_LOGO_MAX_BYTES,
  isIssuerLogoMimeType,
  issuerLogoUrl,
} from "@/lib/storage/issuer-logo";
import {
  getIssuerBannerVersion,
  ISSUER_BANNER_BUCKET,
  ISSUER_BANNER_EXT_BY_TYPE,
  ISSUER_BANNER_MAX_BYTES,
  isIssuerBannerMimeType,
  issuerBannerUrl,
} from "@/lib/storage/issuer-banner";

type SharedFields = {
  email: string;
  taxId: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  walletAddress: string | null;
  /** Linked Solana wallet (migration 0017) — separate from the EVM one. */
  solanaWalletAddress: string | null;
};

export type LoadedProfile =
  | (SharedFields & {
      role: "investor";
      fullName: string;
      birthDate: string; // DD/MM/YYYY, "" if not filled in yet
    })
  | (SharedFields & {
      role: "issuer";
      legalName: string;
      tradeName: string;
      annualRevenueReais: string; // "5.000.000,00", "" if not filled in yet
      sector: string; // PUBLIC data — shown on the offering page (0008)
      businessSummary: string; // same
      publishCnpj: boolean; // opt-in — (masked) CNPJ on the public offering page (0009)
      logoUrl: string | null; // PUBLIC data — shown on the offering page (0010)
      bannerUrl: string | null; // PUBLIC data — the offering cover (0011)
    });

export type UpdateProfileState =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<string, string>> };

function isoToBrDate(value: string | null): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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
        "full_name, tax_id, birth_date, phone, wallet_address, solana_wallet_address, addr_cep, addr_street, addr_number, addr_complement, addr_neighborhood, addr_city, addr_state",
      )
      .eq("id", accountId)
      .single();

    if (error || !data) {
      console.error("loadProfile: failed to read investor", error);
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
      solanaWalletAddress: data.solana_wallet_address ?? null,
      cep: data.addr_cep ?? "",
      street: data.addr_street ?? "",
      number: data.addr_number ?? "",
      complement: data.addr_complement ?? "",
      district: data.addr_neighborhood ?? "",
      city: data.addr_city ?? "",
      state: data.addr_state ?? "",
    };
  }

  const { data, error } = await admin
    .from("issuers")
    .select(
      "legal_name, trade_name, tax_id, annual_revenue_cents, sector, business_summary, publish_cnpj, phone, wallet_address, solana_wallet_address, logo_path, banner_path, addr_cep, addr_street, addr_number, addr_complement, addr_neighborhood, addr_city, addr_state",
    )
    .eq("id", accountId)
    .single();

  if (error || !data) {
    console.error("loadProfile: failed to read issuer", error);
    redirect("/entrar");
  }

  const logoUrl = data.logo_path
    ? issuerLogoUrl(data.logo_path, await getIssuerLogoVersion(admin, data.logo_path))
    : null;
  const bannerUrl = data.banner_path
    ? issuerBannerUrl(data.banner_path, await getIssuerBannerVersion(admin, data.banner_path))
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
    bannerUrl,
    phone: data.phone ?? "",
    walletAddress: data.wallet_address,
    solanaWalletAddress: data.solana_wallet_address ?? null,
    cep: data.addr_cep ?? "",
    street: data.addr_street ?? "",
    number: data.addr_number ?? "",
    complement: data.addr_complement ?? "",
    district: data.addr_neighborhood ?? "",
    city: data.addr_city ?? "",
    state: data.addr_state ?? "",
  };
}

export type OfferingSummary = {
  id: string;
  status: "draft" | "active" | "funded" | "failed" | "settled" | "cancelled";
  base_cap_cents: number;
  target_min_cents: number;
  created_at: string;
  sync_status: "nao_onchain" | "pendente" | "confirmada" | "divergente";
};

// Summary (not CRUD) of the signed-in issuer's REAL offerings, for the "My offerings" section of
// /perfil — creation/activation/closing remain only in /empresa/ofertas. accountId always comes
// from resolveAccount() (session on the server), never from a parameter sent by the client — each
// company can only see its own offerings.
export async function loadMyOfferingsSummary(): Promise<OfferingSummary[]> {
  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("offerings")
    .select("id, status, base_cap_cents, target_min_cents, created_at, sync_status")
    .eq("issuer_id", accountId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("loadMyOfferingsSummary: failed to read offerings", error);
    return [];
  }

  return data;
}

function issuerUpdateSchema(e: Dictionary["serverErrors"]) {
  return z.object({
    ...issuerFields(e),
    sector: z.string().trim(),
    businessSummary: z.string().trim(),
    publishCnpj: z.boolean(),
  });
}

function translateDbError(error: PostgrestError, e: Dictionary["serverErrors"]): UpdateProfileState {
  if (error.code === "23514" && error.message.includes("issuer_is_sep")) {
    return {
      status: "error",
      message: e.company.sepCap,
      fieldErrors: { annualRevenueReais: e.company.sepCapField },
    };
  }
  console.error("updateProfile: unexpected database error", error);
  return { status: "error", message: e.profileSaveFailed };
}

export async function updateProfile(dataInput: unknown): Promise<UpdateProfileState> {
  const e = (await getDictionary()).serverErrors;
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
    const parsed = z.object(investorFields(e)).safeParse(dataInput);
    if (!parsed.success) {
      return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
    }

    const { error } = await admin
      .from("investors")
      .update({
        full_name: parsed.data.fullName,
        tax_id: parsed.data.taxId,
        birth_date: parsed.data.birthDate,
        phone: parsed.data.phone,
        addr_cep: parsed.data.cep,
        addr_street: parsed.data.street,
        addr_number: parsed.data.number,
        addr_complement: parsed.data.complement || null,
        addr_neighborhood: parsed.data.district,
        addr_city: parsed.data.city,
        addr_state: parsed.data.state,
      })
      .eq("id", accountId);

    if (error) {
      return translateDbError(error, e);
    }
  } else {
    const parsed = issuerUpdateSchema(e).safeParse(dataInput);
    if (!parsed.success) {
      return { status: "error", message: e.fixFields, fieldErrors: firstFieldErrors(parsed.error) };
    }

    const annualRevenueCents = reaisToCents(parsed.data.annualRevenueReais);
    if (annualRevenueCents === null) {
      return { status: "error", message: e.fixFields, fieldErrors: { annualRevenueReais: e.moneyFormat } };
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
        addr_street: parsed.data.street,
        addr_number: parsed.data.number,
        addr_complement: parsed.data.complement || null,
        addr_neighborhood: parsed.data.district,
        addr_city: parsed.data.city,
        addr_state: parsed.data.state,
      })
      .eq("id", accountId);

    if (error) {
      return translateDbError(error, e);
    }
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

// Wallet link (0006/0007) — only the address FORMAT is checked here (zod); uniqueness is the
// database UNIQUE's job (per table, nullable-safe), translated back in translateWalletDbError. The
// ROW written is always the one resolved by resolveAccount() (session on the server); the address
// itself comes from the client (wagmi/MetaMask), but never the target account.
const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((value) => value.toLowerCase());

function translateWalletDbError(error: PostgrestError, e: Dictionary["serverErrors"]): UpdateProfileState {
  if (error.code === "23505") {
    return { status: "error", message: e.wallet.alreadyLinked };
  }
  console.error("saveWallet: unexpected database error", error);
  return { status: "error", message: e.wallet.saveFailed };
}

export async function saveWallet(addressInput: unknown): Promise<UpdateProfileState> {
  const e = (await getDictionary()).serverErrors;
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
    return { status: "error", message: e.wallet.invalidAddress };
  }

  const admin = createAdminClient();
  const table = role === "investor" ? "investors" : "issuers";
  const { error } = await admin.from(table).update({ wallet_address: parsed.data }).eq("id", accountId);

  if (error) {
    return translateWalletDbError(error, e);
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

export async function unlinkWallet(): Promise<UpdateProfileState> {
  const e = (await getDictionary()).serverErrors;
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
    console.error("unlinkWallet: unexpected database error", error);
    return { status: "error", message: e.wallet.unlinkFailed };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

// Company logo (0010 + scope 4c) — unlike everything else still simulated in /perfil, this uploads
// a real file to the public 'issuer-logos' bucket and stores the path in issuers.logo_path. Only
// role='issuer' can call it; accountId always from resolveAccount() (session on the server), never
// from an id sent by the client — each company only writes to its own folder
// (`${accountId}/logo.<ext>`). Type/size are validated HERE, not only in the browser input
// (LogoUpload.tsx) — that check is just a UX courtesy.
export type UploadLogoState = { status: "success"; logoUrl: string } | { status: "error"; message: string };

export async function uploadIssuerLogo(formData: FormData): Promise<UploadLogoState> {
  const e = (await getDictionary()).serverErrors;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.uploadLogo };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: e.upload.selectImage };
  }
  if (!isIssuerLogoMimeType(file.type)) {
    return { status: "error", message: e.upload.invalidFormat };
  }
  if (file.size > ISSUER_LOGO_MAX_BYTES) {
    return { status: "error", message: e.upload.maxSize(2) };
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
    console.error("uploadIssuerLogo: upload failed", uploadError);
    return { status: "error", message: e.upload.logoUploadFailed };
  }

  const { error: dbError } = await admin.from("issuers").update({ logo_path: path }).eq("id", accountId);
  if (dbError) {
    console.error("uploadIssuerLogo: failed to store logo_path", dbError);
    return { status: "error", message: e.upload.logoSaveFailed };
  }

  // The extension can change between uploads (e.g. png -> jpg): the upsert only overwrites when
  // the path is identical, so a different previous path becomes an orphan file in the bucket if
  // it isn't cleaned up here.
  if (previousPath && previousPath !== path) {
    const { error: removeOldError } = await admin.storage.from(ISSUER_LOGO_BUCKET).remove([previousPath]);
    if (removeOldError) {
      console.error("uploadIssuerLogo: failed to remove the previous logo", removeOldError);
    }
  }

  const version = await getIssuerLogoVersion(admin, path);
  revalidatePath("/perfil");
  return { status: "success", logoUrl: issuerLogoUrl(path, version)! };
}

export async function removeIssuerLogo(): Promise<UpdateProfileState> {
  const e = (await getDictionary()).serverErrors;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.removeLogo };
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("issuers").select("logo_path").eq("id", accountId).single();
  const path = current?.logo_path ?? null;

  if (path) {
    const { error: removeError } = await admin.storage.from(ISSUER_LOGO_BUCKET).remove([path]);
    if (removeError) {
      console.error("removeIssuerLogo: failed to remove the file from the bucket", removeError);
    }
  }

  const { error } = await admin.from("issuers").update({ logo_path: null }).eq("id", accountId);
  if (error) {
    console.error("removeIssuerLogo: unexpected database error", error);
    return { status: "error", message: e.upload.logoRemoveFailed };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}

// Offering cover banner (0011) — same pattern as uploadIssuerLogo/removeIssuerLogo above, with its
// own public bucket ('issuer-banners'). Only role='issuer' can call it; accountId always from
// resolveAccount() (session on the server). Type/size validated HERE, not only in the browser
// input (BannerUpload.tsx) — that check is just a UX courtesy.
export type UploadBannerState = { status: "success"; bannerUrl: string } | { status: "error"; message: string };

export async function uploadIssuerBanner(formData: FormData): Promise<UploadBannerState> {
  const e = (await getDictionary()).serverErrors;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.uploadBanner };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: e.upload.selectImage };
  }
  if (!isIssuerBannerMimeType(file.type)) {
    return { status: "error", message: e.upload.invalidFormat };
  }
  if (file.size > ISSUER_BANNER_MAX_BYTES) {
    return { status: "error", message: e.upload.maxSize(3) };
  }

  const admin = createAdminClient();
  const path = `${accountId}/banner.${ISSUER_BANNER_EXT_BY_TYPE[file.type]}`;

  const { data: current } = await admin.from("issuers").select("banner_path").eq("id", accountId).single();
  const previousPath = current?.banner_path ?? null;

  const { error: uploadError } = await admin.storage.from(ISSUER_BANNER_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) {
    console.error("uploadIssuerBanner: upload failed", uploadError);
    return { status: "error", message: e.upload.bannerUploadFailed };
  }

  const { error: dbError } = await admin.from("issuers").update({ banner_path: path }).eq("id", accountId);
  if (dbError) {
    console.error("uploadIssuerBanner: failed to store banner_path", dbError);
    return { status: "error", message: e.upload.bannerSaveFailed };
  }

  // Same gotcha as uploadIssuerLogo: the extension can change between uploads (e.g. png -> jpg),
  // and the upsert only overwrites when the path is identical — without this cleanup the previous
  // file is left orphaned in the bucket.
  if (previousPath && previousPath !== path) {
    const { error: removeOldError } = await admin.storage.from(ISSUER_BANNER_BUCKET).remove([previousPath]);
    if (removeOldError) {
      console.error("uploadIssuerBanner: failed to remove the previous banner", removeOldError);
    }
  }

  const version = await getIssuerBannerVersion(admin, path);
  revalidatePath("/perfil");
  return { status: "success", bannerUrl: issuerBannerUrl(path, version)! };
}

export async function removeIssuerBanner(): Promise<UpdateProfileState> {
  const e = (await getDictionary()).serverErrors;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const { role, accountId } = await resolveAccount();
  if (role !== "issuer" || !accountId) {
    return { status: "error", message: e.issuersOnly.removeBanner };
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("issuers").select("banner_path").eq("id", accountId).single();
  const path = current?.banner_path ?? null;

  if (path) {
    const { error: removeError } = await admin.storage.from(ISSUER_BANNER_BUCKET).remove([path]);
    if (removeError) {
      console.error("removeIssuerBanner: failed to remove the file from the bucket", removeError);
    }
  }

  const { error } = await admin.from("issuers").update({ banner_path: null }).eq("id", accountId);
  if (error) {
    console.error("removeIssuerBanner: unexpected database error", error);
    return { status: "error", message: e.upload.bannerRemoveFailed };
  }

  revalidatePath("/perfil");
  return { status: "success" };
}
