"use server";

// The investor's KYC Server Action — used only by the /investir screen to unlock the payment
// confirmation (the enforce_investment_transition trigger, see
// supabase/migrations/0001_core.sql, blocks reserved->paid without kyc_status = 'approved').
// HONESTY RULE: the KYC provider is a MOCK (src/lib/mocks.ts, resolved via src/lib/adapters.ts) —
// it stores exactly the status the adapter returned, never a hard-coded 'approved', so that
// swapping the adapter in the future doesn't require touching this file.
import { revalidatePath } from "next/cache";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { kyc } from "@/lib/adapters";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary } from "@/lib/i18n/server";

// investors.kyc_status (supabase/migrations/0001_core.sql) only accepts these three values —
// narrower than the port's KycStatus (which also has 'in_review', with no equivalent in the
// column). If the adapter ever returns 'in_review', the update below fails with a
// check_violation and falls into the error branch, so a "success" response can only carry one of
// these three.
type InvestorKycStatus = "pending" | "approved" | "rejected";

export type SubmitKycState =
  | { status: "success"; kycStatus: InvestorKycStatus }
  | { status: "error"; message: string };

export async function submitKyc(): Promise<SubmitKycState> {
  const e = (await getDictionary()).serverErrors;
  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: e.investorsOnly.kyc };
  }

  const admin = createAdminClient();

  const { data: investor, error: fetchError } = await admin
    .from("investors")
    .select("tax_id")
    .eq("id", accountId)
    .single();

  if (fetchError || !investor) {
    console.error("invest: failed to fetch the investor for KYC", fetchError);
    return { status: "error", message: e.kyc.submitFailed };
  }

  const result = await kyc.submit({ userId: accountId, document: investor.tax_id as string });

  const { error: updateError } = await admin
    .from("investors")
    .update({ kyc_status: result.status })
    .eq("id", accountId);

  if (updateError) {
    console.error("invest: failed to store kyc_status", updateError);
    return { status: "error", message: e.kyc.completeFailed };
  }

  revalidatePath("/investir");
  return { status: "success", kycStatus: result.status as InvestorKycStatus };
}
