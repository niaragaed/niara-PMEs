import type { Metadata } from "next";
import { OnChainInvestPage, type ServerSolanaOption } from "@/components/investir-onchain/OnChainInvestPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { resolvePartner } from "@/lib/auth/resolveSocio";
import { loadConfirmedOnChainOfferings } from "@/lib/web3/confirmedOfferings";
import { solanaConnection, listSolanaOfferings } from "@/lib/solana/program";

export const metadata: Metadata = {
  title: `${ptBr.investOnChain.meta.title} · Niara PMEs`,
  description: ptBr.investOnChain.meta.description,
  robots: { index: false, follow: false },
};

// Lido a cada requisição: a lista de ofertas da Solana vem do próprio programa (getProgramAccounts),
// não de uma env var — uma oferta nova publicada pelo emissor aparece sem redeploy.
export const dynamic = "force-dynamic";

/**
 * Ofertas do programa niara-pmes-solana (devnet), lidas no servidor. Nunca quebra a página: RPC
 * fora do ar ou programa ainda não publicado nesta rede = lista vazia, e o seletor mostra só as
 * ofertas da Sepolia. Abertas primeiro, depois as mais recentes.
 */
async function loadSolanaOfferings(): Promise<ServerSolanaOption[]> {
  try {
    const offerings = await listSolanaOfferings(solanaConnection());
    return offerings
      .map((o) => ({ address: o.address, company: o.company, open: o.state === "Aberta", opening: o.opening }))
      .sort((a, b) => Number(b.open) - Number(a.open) || b.opening - a.opening);
  } catch (error) {
    console.error("investir/onchain: falha ao listar ofertas da Solana", error);
    return [];
  }
}

// Diferente de /investir (Supabase, exige login como investidor — ver src/app/investir/page.tsx),
// esta rota não depende de conta na plataforma: é dirigida inteiramente pela carteira conectada
// (MetaMask na Sepolia, Phantom na Solana Devnet). Decisão deliberada — qualquer carteira pode
// demonstrar o fluxo completo sem precisar de cadastro/login na Niara PMEs. `isSocio` só decide se
// os botões "Encerrar oferta"/"Liberar recursos" ficam habilitados nesta interface — não afeta o
// resto da página. `?rede=solana` abre direto na primeira oferta da Solana.
export default async function Page({ searchParams }: { searchParams: Promise<{ rede?: string }> }) {
  const { rede: network } = await searchParams;
  const [{ autorizado: isPartner }, confirmedOfferings, solanaOfferings] = await Promise.all([
    resolvePartner(),
    loadConfirmedOnChainOfferings(),
    loadSolanaOfferings(),
  ]);
  return (
    <OnChainInvestPage
      isPartner={isPartner}
      confirmedOfferings={confirmedOfferings}
      solanaOfferings={solanaOfferings}
      preferSolana={network === "solana"}
    />
  );
}
