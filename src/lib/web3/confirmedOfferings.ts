import "server-only";

// Leitura pública das ofertas publicadas pelo self-service on-chain (Fase 3,
// /empresa/ofertas/[id]/publicar) e já confirmadas em Sepolia — consumida por /investir/onchain
// (Fase 4, sub-etapa 5.1, ver PLANO_FASE_3_PUBLICACAO_ONCHAIN.md). REGRA DE OURO (mesma de
// src/lib/investments.ts): lista branca explícita, nunca `select('*')` — CNPJ, telefone,
// endereço completo, faturamento e wallet do emissor nunca são buscados aqui.
//
// offerings.status fica sempre 'draft' para estas linhas (decisão da Fase 3 — ver CLAUDE.md,
// "Tela /empresa/ofertas"), então o filtro certo é sync_status='confirmada', não status='active'.
// contract_address/token_address só existem (não-nulos) quando sync_status já é 'confirmada' ou
// 'divergente' — filtrar por 'confirmada' já garante os dois presentes (CHECK
// sync_status_confirmada_tem_enderecos, migration 0015), mas o filtro extra abaixo é defensivo,
// mesmo padrão já usado em onchain-actions.ts.
import { createAdminClient } from "@/lib/supabase/admin";

export type ConfirmedOnChainOffering = {
  id: string;
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  issuerLegalName: string;
  issuerTradeName: string | null;
};

type ConfirmedOfferingIssuerRow = {
  legal_name: string;
  trade_name: string | null;
};

type ConfirmedOfferingRow = {
  id: string;
  contract_address: string | null;
  token_address: string | null;
  issuers: ConfirmedOfferingIssuerRow | ConfirmedOfferingIssuerRow[] | null;
};

// Postgrest embedding (`issuers(...)`) devolve objeto ou array dependendo da versão/config —
// mesma ambiguidade já tratada em investments.ts (firstIssuer), duplicada aqui como helper
// pequeno em vez de importada (mesmo padrão de não abstrair 2 usos só, ver etherscanAddress em
// OfertasPage.tsx).
function firstIssuer(issuers: ConfirmedOfferingRow["issuers"]): ConfirmedOfferingIssuerRow | null {
  if (!issuers) return null;
  return Array.isArray(issuers) ? (issuers[0] ?? null) : issuers;
}

/**
 * Todas as ofertas self-service já confirmadas on-chain, mais recentes primeiro. Retorna lista
 * vazia (nunca lança) se não houver nenhuma ou se a consulta falhar — mesma filosofia de "nunca
 * quebra a página" de getOnChainAddresses()/getEventosOnChain().
 */
export async function loadConfirmedOnChainOfferings(): Promise<ConfirmedOnChainOffering[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("offerings")
    .select("id, contract_address, token_address, issuers(legal_name, trade_name)")
    .eq("sync_status", "confirmada")
    .order("onchain_confirmed_at", { ascending: false });

  if (error || !data) return [];

  const rows = data as unknown as ConfirmedOfferingRow[];

  return rows
    .map((row): ConfirmedOnChainOffering | null => {
      const issuerRow = firstIssuer(row.issuers);
      if (!issuerRow || !row.contract_address || !row.token_address) return null;
      return {
        id: row.id,
        contractAddress: row.contract_address as `0x${string}`,
        tokenAddress: row.token_address as `0x${string}`,
        issuerLegalName: issuerRow.legal_name,
        issuerTradeName: issuerRow.trade_name,
      };
    })
    .filter((offering): offering is ConfirmedOnChainOffering => offering !== null);
}
