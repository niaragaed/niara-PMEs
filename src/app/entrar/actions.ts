"use server";

// Desvio pós-login checado antes do fluxo padrão de investidor/emissor: contas de sócio
// (criadas direto no painel do Supabase, sem linha em investors/issuers) cairiam no
// "completar cadastro" de /perfil se só resolveAccount() decidisse o destino. Não altera
// resolveAccount() nem sua lógica -- só decide, antes dele, se este login deveria ir para
// /socios em vez do fluxo de investidor/emissor. Ver src/lib/auth/resolveSocio.ts.
import { resolvePartner } from "@/lib/auth/resolveSocio";

export async function resolvePostLoginDestination(): Promise<"/socios" | "/perfil"> {
  const { authorized } = await resolvePartner();
  return authorized ? "/socios" : "/perfil";
}
