// Seed de dados de demonstração para pitch/due diligence técnica — cria
// uma conta emissor + uma oferta ativa + uma conta investidor prontas
// para logar e demonstrar o ciclo de captação (reservar → KYC → pagar →
// fechar) sem digitar cadastro na hora. Ver
// C:\Users\felip\.claude\plans\velvet-cuddling-hinton.md para o raciocínio
// completo por trás de cada escolha abaixo.
//
// Roda fora do Next porque os Server Actions reais (createAccount,
// createOffering etc.) assumem uma requisição HTTP autenticada
// (resolveAccount() lê cookies via getUser()), que não existe aqui — este
// script usa o mesmo createAdminClient() dos Server Actions e o admin API
// do Supabase Auth direto, gravando as linhas de domínio manualmente.
//
// REGRA DE HONESTIDADE: só roda com NIARA_ENV=demo, e toda linha criada
// grava is_demo=true — mesma marca que o resto do app já usa para dado
// fictício (ver src/app/investir/actions.ts, src/app/empresa/ofertas/actions.ts).
//
// Idempotente por CONTA (lookup por email/user_id antes de criar — rodar
// de novo não duplica as duas contas nem troca as credenciais), mas NÃO
// por OFERTA — cada execução cria uma oferta ativa nova para o emissor
// demo, mesmo que uma oferta anterior já tenha sido fechada num ensaio
// anterior. Não existe hoje um jeito de "resetar" uma oferta que já mudou
// de estado sem mexer no histórico de aportes (settle_offering só aceita
// oferta 'active'), e forçar isso iria contra o desenho de livro-razão do
// schema — a escolha é sempre partir de uma oferta nova e limpa.
//
// Uso: npm run seed:demo (lê .env.local; precisa de
// NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY apontando pro
// projeto Supabase certo).

import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { reaisToCents } from "@/lib/money";

// Não reaproveita createAdminClient() de src/lib/supabase/admin.ts aqui —
// esse módulo importa "server-only", que sob Node puro (fora do bundler do
// Next) lança incondicionalmente (`throw new Error(...)` em
// node_modules/server-only/index.js, verificado rodando este script: o
// no-op só vale para bundle de browser via campo "browser" do
// package.json, não para execução Node normal). A lógica em si é a mesma
// duas linhas de lá — duplicada aqui de propósito, não por descuido.
function createAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

if (process.env.NIARA_ENV !== "demo") {
  console.error(
    `seed-demo: recusando rodar — NIARA_ENV precisa ser "demo" (está: ${JSON.stringify(
      process.env.NIARA_ENV,
    )}). Isso evita gravar dado fictício num ambiente que não devia.`,
  );
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("seed-demo: faltam NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY — confira o .env.local.");
  process.exit(1);
}

const DEMO_ISSUER_EMAIL = "demo.empresa@niara-pmes.com";
const DEMO_INVESTOR_EMAIL = "demo.investidor@niara-pmes.com";

function centsOrThrow(reais: string, label: string): bigint {
  const cents = reaisToCents(reais);
  if (cents === null) throw new Error(`seed-demo: valor inválido para ${label}: ${reais}`);
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
  // supabase-js não tem getUserByEmail no admin API — lista e procura
  // localmente. Só duas contas de demo, uma página já basta.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw new Error(`seed-demo: falha ao listar usuários: ${listError.message}`);

  const existing = list.users.find((user) => user.email === email);
  if (existing) return existing;

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`seed-demo: falha ao criar usuário ${email}: ${error?.message}`);
  return data.user;
}

async function main() {
  const admin = createAdminClient();
  const password = demoPassword();

  // --- Emissor ---------------------------------------------------------
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
        // Fictício, distinto do CNPJ de "Padaria Bela Vista" usado no
        // catálogo 100% mock de /ativos e /negociar — de propósito, para
        // nunca haver colisão entre uma oferta REAL do banco e uma
        // oferta fictícia mostrada ao lado dela.
        tax_id: "11.222.333/0001-44",
        annual_revenue_cents: centsOrThrow("2.400.000,00", "faturamento do emissor demo").toString(),
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
    if (error || !issuer) throw new Error(`seed-demo: falha ao criar issuer: ${error?.message}`);
    issuerId = issuer.id;
  }

  // --- Oferta ativa (sempre nova, ver comentário de topo) ---------------
  const baseCapCents = centsOrThrow("500.000,00", "cap base da oferta demo");
  const hardCapCents = centsOrThrow("600.000,00", "hard cap da oferta demo"); // +20% do base, dentro do teto de 25%
  const targetMinCents = centsOrThrow("300.000,00", "meta mínima da oferta demo");
  const sharePriceCents = centsOrThrow("100,00", "valor por cota da oferta demo"); // 500.000,00 / 100,00 = 5.000 cotas

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
  if (offeringError || !offering) throw new Error(`seed-demo: falha ao criar oferta: ${offeringError?.message}`);

  // --- Investidor --------------------------------------------------------
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
        // Investidor qualificado (sem teto de R$20k/ano) de propósito —
        // um valor redondo escolhido ao vivo no pitch não pode esbarrar
        // no teto de varejo e travar a demonstração sem aviso prévio.
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
    if (error || !investor) throw new Error(`seed-demo: falha ao criar investor: ${error?.message}`);
    investorId = investor.id;
  }

  console.log("");
  console.log("seed-demo: pronto.");
  console.log("");
  console.log(`  Emissor     ${DEMO_ISSUER_EMAIL} / ${password}  (issuer id: ${issuerId})`);
  console.log(`  Investidor  ${DEMO_INVESTOR_EMAIL} / ${password}  (investor id: ${investorId})`);
  console.log(`  Oferta ativa: ${offering.id}`);
  console.log("");
  console.log("  KYC do investidor fica 'pending' de propósito — aprove ao vivo em /investir");
  console.log("  ('Fazer KYC (demonstração)') na hora de confirmar o pagamento do pitch.");
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
