"use server";

// Server Action de KYC do investidor — usada só pela tela /investir para
// destravar a confirmação de pagamento (o trigger enforce_investment_transition,
// ver supabase/migrations/0001_core.sql, barra reserved->paid sem kyc_status =
// 'approved'). REGRA DE HONESTIDADE: o provedor de KYC é MOCK (src/lib/mocks.ts,
// resolvido via src/lib/adapters.ts) — grava exatamente o status que o adapter
// devolveu, nunca 'approved' fixo no código, para que trocar o adapter no futuro
// não exija tocar aqui.
import { revalidatePath } from "next/cache";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { kyc } from "@/lib/adapters";
import { createAdminClient } from "@/lib/supabase/admin";

// investors.kyc_status (supabase/migrations/0001_core.sql) só aceita estes
// três valores — mais estreito que o KycStatus da porta (que também tem
// 'in_review', sem equivalente na coluna). Se o adapter algum dia devolver
// 'in_review', o update abaixo falha por check_violation e cai no branch de
// erro, então uma resposta "success" só pode carregar um destes três.
type InvestorKycStatus = "pending" | "approved" | "rejected";

export type SubmitKycState =
  | { status: "success"; kycStatus: InvestorKycStatus }
  | { status: "error"; message: string };

export async function submitKyc(): Promise<SubmitKycState> {
  const { role, accountId } = await resolveAccount();
  if (role !== "investor" || !accountId) {
    return { status: "error", message: "Apenas investidores cadastrados podem enviar o KYC." };
  }

  const admin = createAdminClient();

  const { data: investor, error: fetchError } = await admin
    .from("investors")
    .select("tax_id")
    .eq("id", accountId)
    .single();

  if (fetchError || !investor) {
    console.error("investir: erro ao buscar investidor para KYC", fetchError);
    return { status: "error", message: "Não foi possível enviar o KYC. Tente novamente em instantes." };
  }

  const result = await kyc.submit({ usuarioId: accountId, documento: investor.tax_id as string });

  const { error: updateError } = await admin
    .from("investors")
    .update({ kyc_status: result.status })
    .eq("id", accountId);

  if (updateError) {
    console.error("investir: erro ao gravar kyc_status", updateError);
    return { status: "error", message: "Não foi possível concluir o KYC. Tente novamente em instantes." };
  }

  revalidatePath("/investir");
  return { status: "success", kycStatus: result.status as InvestorKycStatus };
}
