import type { Metadata } from "next";
import { OnChainInvestPage } from "@/components/investir-onchain/OnChainInvestPage";
import { ptBr } from "@/lib/i18n/pt-br";

export const metadata: Metadata = {
  title: `${ptBr.investirOnChain.meta.title} · Niara PMEs`,
  description: ptBr.investirOnChain.meta.description,
  robots: { index: false, follow: false },
};

// Diferente de /investir (Supabase, exige login como investidor — ver src/app/investir/page.tsx),
// esta rota não depende de conta na plataforma: é dirigida inteiramente pela carteira MetaMask
// conectada, contra a oferta real em Sepolia (ver CLAUDE.md, "Investimento real em Sepolia").
// Decisão deliberada — qualquer carteira pode demonstrar o fluxo completo sem precisar de
// cadastro/login na Niara PMEs.
export default function Page() {
  return <OnChainInvestPage />;
}
