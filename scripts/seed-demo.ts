// Seeds demo data for a pitch/technical due diligence — creates an issuer account + an active
// offering + an investor account ready to sign in and demonstrate the fundraising cycle
// (reserve → KYC → pay → close) without typing a registration on the spot. See
// C:\Users\felip\.claude\plans\velvet-cuddling-hinton.md for the full reasoning behind each choice
// below.
//
// Runs outside Next because the real Server Actions (createAccount, createOffering etc.) assume an
// authenticated HTTP request (resolveAccount() reads cookies via getUser()), which doesn't exist
// here — this script uses the same admin client as the Server Actions and the Supabase Auth admin
// API directly, writing the domain rows by hand.
//
// HONESTY RULE: it only runs with NIARA_ENV=demo, and every row created stores is_demo=true — the
// same mark the rest of the app already uses for fictitious data (see src/app/investir/actions.ts,
// src/app/empresa/ofertas/actions.ts). The demo company's data below is stored in Portuguese, as
// a Brazilian issuer would type it.
//
// Idempotent per ACCOUNT (lookup by email/user_id before creating — running it again doesn't
// duplicate the two accounts nor change the credentials), but NOT per OFFERING — each run creates a
// new active offering for the demo issuer, even if a previous offering was already closed in an
// earlier rehearsal. There's currently no way to "reset" an offering that has already changed state
// without touching the investment history (settle_offering only accepts an 'active' offering), and
// forcing that would go against the schema's ledger design — the choice is always to start from a
// new, clean offering.
//
// Usage: npm run seed:demo (reads .env.local; needs NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY pointing at the right Supabase project).

import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { reaisToCents } from "@/lib/money";

// Doesn't reuse createAdminClient() from src/lib/supabase/admin.ts here — that module imports
// "server-only", which under plain Node (outside Next's bundler) throws unconditionally
// (`throw new Error(...)` in node_modules/server-only/index.js, checked by running this script: the
// no-op only applies to a browser bundle via the package.json "browser" field, not to a normal Node
// run). The logic itself is the same two lines from there — duplicated here on purpose, not by
// oversight.
function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

if (process.env.NIARA_ENV !== "demo") {
  console.error(
    `seed-demo: refusing to run — NIARA_ENV must be "demo" (it is: ${JSON.stringify(
      process.env.NIARA_ENV,
    )}). Isso evita gravar dado fictício num ambiente que não devia.`,
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("seed-demo: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing — check .env.local.");
  process.exit(1);
}

const DEMO_ISSUER_EMAIL = "demo.empresa@niara-pmes.com";
const DEMO_INVESTOR_EMAIL = "demo.investidor@niara-pmes.com";

function centsOrThrow(reais: string, label: string): bigint {
  const cents = reaisToCents(reais);
  if (cents === null) throw new Error(`seed-demo: invalid value for ${label}: ${reais}`);
  return cents;
}

function demoPassword(): string {
  return process.env.NIARA_DEMO_PASSWORD ?? randomBytes(9).toString("base64url");
}

async function getOrCreateAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
): Promise<User> {
  // supabase-js has no getUserByEmail in the admin API — it lists and searches
  // locally. Only two demo accounts, one page is enough.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(`seed-demo: failed to list users: ${listError.message}`);

  const existing = list.users.find((user) => user.email === email);
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`seed-demo: failed to create user ${email}: ${error?.message}`);
  return data.user;
}

async function main() {
  const admin = createAdminClient();
  const password = demoPassword();

  // --- Issuer -------------------------------------------------------------
  const issuerUser = await getOrCreateAuthUser(admin, DEMO_ISSUER_EMAIL, password);

  const { data: existingIssuer } = await admin
    .from("issuers")
    .select("id")
    .eq("user_id", issuerUser.id)
    .maybeSingle();

  let issuerId: string | undefined = existingIssuer?.id;

  if (!issuerId) {
    const { data: issuer, error } = await admin
      .from("issuers")
      .insert({
        user_id: issuerUser.id,
        legal_name: "Cafeteria Ponto Certo Comércio de Alimentos Ltda.",
        trade_name: "Ponto Certo",
        // Fictitious, distinct from the "Padaria Bela Vista" CNPJ used in the
        // 100% mock catalog of /ativos and /negociar — on purpose, so there's
        // never a collision between a REAL offering in the database and a
        // fictitious offering shown next to it.
        tax_id: "11.222.333/0001-44",
        annual_revenue_cents: centsOrThrow("2.400.000,00", "demo issuer revenue").toString(),
        sector: "Alimentação e bebidas",
        business_summary:
          "Rede de cafeterias de bairro em expansão, buscando capital para abrir duas novas unidades.",
        publish_cnpj: true,
        phone: "11987654321",
        addr_cep: "01310-100",
        addr_street: "Avenida Paulista",
        addr_number: "1000",
        addr_neighborhood: "Bela Vista",
        addr_city: "São Paulo",
        addr_state: "SP",
        is_demo: true,
      })
      .select("id")
      .single();
    if (error || !issuer) throw new Error(`seed-demo: failed to create issuer: ${error?.message}`);
    issuerId = issuer.id;
  }

  // --- Active offering (always new, see the top comment) -----------------
  const baseCapCents = centsOrThrow("500.000,00", "demo offering base cap");
  const hardCapCents = centsOrThrow("600.000,00", "demo offering hard cap"); // +20% do base, dentro do teto de 25%
  const targetMinCents = centsOrThrow("300.000,00", "demo offering minimum target");
  const sharePriceCents = centsOrThrow("100,00", "demo offering value per share"); // 500.000,00 / 100,00 = 5,000 shares

  const opensAt = new Date();
  const closesAt = new Date(opensAt.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 dias, bem dentro do teto de 180

  const { data: offering, error: offeringError } = await admin
    .from("offerings")
    .insert({
      issuer_id: issuerId,
      status: "active",
      category: "pmes",
      base_cap_cents: baseCapCents.toString(),
      hard_cap_cents: hardCapCents.toString(),
      target_min_cents: targetMinCents.toString(),
      share_price_cents: sharePriceCents.toString(),
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
      is_demo: true,
    })
    .select("id")
    .single();
  if (offeringError || !offering) throw new Error(`seed-demo: failed to create offering: ${offeringError?.message}`);

  // --- Investor -----------------------------------------------------------
  const investorUser = await getOrCreateAuthUser(admin, DEMO_INVESTOR_EMAIL, password);

  const { data: existingInvestor } = await admin
    .from("investors")
    .select("id")
    .eq("user_id", investorUser.id)
    .maybeSingle();

  let investorId: string | undefined = existingInvestor?.id;

  if (!investorId) {
    const { data: investor, error } = await admin
      .from("investors")
      .insert({
        user_id: investorUser.id,
        full_name: "Investidor Demonstração",
        tax_id: "123.456.789-00",
        phone: "11912345678",
        // Qualified investor (no R$20k/year cap) on purpose —
        // a round amount picked live during the pitch must not hit
        // the retail cap and block the demo without warning.
        annual_limit_cents: null,
        addr_cep: "04538-132",
        addr_street: "Avenida Brigadeiro Faria Lima",
        addr_number: "2000",
        addr_neighborhood: "Itaim Bibi",
        addr_city: "São Paulo",
        addr_state: "SP",
        is_demo: true,
      })
      .select("id")
      .single();
    if (error || !investor) throw new Error(`seed-demo: failed to create investor: ${error?.message}`);
    investorId = investor.id;
  }

  console.log("");
  console.log("seed-demo: done.");
  console.log("");
  console.log(`  Issuer      ${DEMO_ISSUER_EMAIL} / ${password}  (issuer id: ${issuerId})`);
  console.log(`  Investor    ${DEMO_INVESTOR_EMAIL} / ${password}  (investor id: ${investorId})`);
  console.log(`  Active offering: ${offering.id}`);
  console.log("");
  console.log("  The investor's KYC is left 'pending' on purpose — approve it live at /investir");
  console.log("  ('Do KYC (demo)') when confirming the pitch payment.");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
