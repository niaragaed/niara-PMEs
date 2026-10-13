"use client";

// Único cartão REAL dentro de /ativos (o resto da tela é 100% mock, ver AtivosPage.tsx) — sua
// posição de verdade na oferta de demonstração em Sepolia, lida direto do contrato on-chain via
// os mesmos hooks de src/lib/web3/hooks/useOfertaOnChain.ts usados em /investir/onchain. Nunca
// entra nos cálculos de computeTotals/PortfolioSummary nem nas linhas de PositionsTable — mock e
// real ficam sempre em superfícies separadas, nunca somados juntos.
//
// Visualmente distinto de propósito (anel + selo sólido salmão), mesmo padrão já usado em
// RealOfferCard.tsx (src/components/negociar/) para diferenciar oferta real de fictícia — aqui
// adaptado ao cartão escuro (bg-panel) já usado no resto de /ativos, em vez do cartão branco de
// /negociar.
//
// Simplificação deliberada: quando várias ofertas estão configuradas ao mesmo tempo
// (NEXT_PUBLIC_OFERTAS_ONCHAIN, ver src/lib/web3/addresses.ts — demo presencial com várias
// ofertas de reserva), este cartão sempre mostra a posição na PRIMEIRA da lista (índice 0,
// padrão dos hooks) — não tenta adivinhar "qual oferta o usuário está demonstrando agora".
// Quem quiser ver/trocar a oferta específica usa o seletor dentro de /investir/onchain.
import Link from "next/link";
import { useConnection } from "wagmi";
import { sepolia } from "wagmi/chains";
import { BadgeCheck } from "lucide-react";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { useMyOnChainPosition, useOnChainOfferingTerms } from "@/lib/web3/hooks/useOfertaOnChain";
import { getOnChainAddresses } from "@/lib/web3/addresses";
import { formatToken } from "@/lib/web3/format";
import { pt } from "@/lib/i18n/pt-br";

export function RealPositionCard() {
  const t = pt.assets.realPosition;
  const connection = useConnection();
  const isOnSepolia = connection.chainId === sepolia.id;

  // Continua sempre a primeira oferta da lista LEGADA (env var) — mesma simplificação
  // deliberada de antes da Fase 4, sub-etapa 5.2: este cartão nunca tentou "adivinhar" qual
  // oferta mostrar, e não é o lugar de decidir isso entre legado/self-service.
  const addresses = getOnChainAddresses()?.offerings[0] ?? null;
  const terms = useOnChainOfferingTerms(addresses);
  const position = useMyOnChainPosition(addresses);

  // Sem os 3 endereços configurados, o cartão simplesmente não aparece — não há posição real
  // para mostrar (mesma regra de "nunca quebra" de OnChainInvestPage.tsx).
  if (!terms.configured) return null;

  return (
    <div className="rounded-lg bg-panel p-5 ring-2 ring-salmon sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.badge}
        </span>
        <Link
          href="/investir/onchain"
          className="text-xs font-semibold text-salmon underline underline-offset-2 hover:text-salmon-600"
        >
          {t.link}
        </Link>
      </div>

      <p className="mt-3 text-xs text-on-military-muted">{t.explanation}</p>

      {!connection.isConnected ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-on-military-muted">{t.connectPrompt}</p>
          <ConnectWallet />
        </div>
      ) : !isOnSepolia ? (
        <p className="mt-4 text-sm text-on-military">{t.wrongNetwork}</p>
      ) : position.invested === BigInt(0) ? (
        <p className="mt-4 text-sm text-on-military-muted">{t.noPosition}</p>
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-on-military-muted">{t.invested}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {formatToken(position.invested, terms.mockBrlDecimals, terms.mockBrlSymbol)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.shares}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {formatToken(
                position.participationTokenBalance,
                terms.participationTokenDecimals,
                terms.participationTokenSymbol,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-on-military-muted">{t.stateLabel}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-on-military">
              {terms.state ? pt.investOnChain.terms.states[terms.state] : "—"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
