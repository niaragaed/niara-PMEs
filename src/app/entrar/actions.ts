"use server";

// Post-sign-in detour checked before the standard investor/issuer flow: partner accounts
// (created directly in the Supabase dashboard, with no row in investors/issuers) would fall into
// /perfil's "complete registration" if only resolveAccount() decided the destination. Doesn't
// change resolveAccount() or its logic -- it only decides, before it, whether this sign-in should
// go to /socios instead of the investor/issuer flow. See src/lib/auth/resolvePartner.ts.
import { resolvePartner } from "@/lib/auth/resolvePartner";

export async function resolvePostLoginDestination(): Promise<"/socios" | "/perfil"> {
  const { authorized } = await resolvePartner();
  return authorized ? "/socios" : "/perfil";
}
