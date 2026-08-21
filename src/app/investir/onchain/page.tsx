import type { Metadata } from "next";
import { OnChainInvestPage } from "@/components/investir-onchain/OnChainInvestPage";
import { ptBr } from "@/lib/i18n/pt-br";
import { resolveSocio } from "@/lib/auth/resolveSocio";

export const metadata: Metadata = {
  title: `${ptBr.investirOnChain.meta.title} · Niara PMEs`,
  description: ptBr.investirOnChain.meta.description,
  robots: { index: false, follow: false },
};

// Diferente de /investir (Supabase, exige login como investidor — ver src/app/investir/page.tsx),
// esta rota não depende de conta na plataforma: é dirigida inteiramente pela carteira MetaMask
// conectada, contra a oferta real em Sepolia (ver CLAUDE.md, "Investimento real em Sepolia").
// Decisão deliberada — qualquer carteira pode demonstrar o fluxo completo sem precisar de
// cadastro/login na Niara PMEs. `isSocio` só decide se o botão "Encerrar oferta" fica
// habilitado nesta interface (ver RealOnChainInvestPanel.tsx) — não afeta o resto da página,
// que continua acessível sem login nenhum.
export default async function Page() {
  const { autorizado: isSocio } = await resolveSocio();
  return <OnChainInvestPage isSocio={isSocio} />;
}
