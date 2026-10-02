import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { OfertaBanner } from "./OfertaBanner";
import { ptBr } from "@/lib/i18n/pt-br";

// Card de vitrine para uma oferta PME self-service (publicada pelo próprio emissor via
// OfertaOrquestrador, ver CLAUDE.md "Tela /empresa/ofertas" → Fase 3) já confirmada on-chain —
// irmã de PmesOnChainCard.tsx (as 10 legadas, empresa fictícia), mas deliberadamente um
// componente separado em vez de generalizar o mesmo card com condicionais: os dados aqui são
// REAIS (preenchidos pelo próprio emissor), então esta card nunca mostra meta/preço/cotas fixos
// de demonstração (ONCHAIN_PMES_* em PmesOnChainCard.tsx só valem para o clone das 10 legadas) —
// os termos reais desta oferta variam e só são confiáveis lidos ao vivo da chain, o que já
// acontece na página de detalhe (RealOnChainInvestPanel). Mostrar aqui obrigaria usar um número
// que pode discordar da chain.
export function SelfServicePmesCard({
  id,
  nome,
  setor,
  bannerUrl,
  logoUrl,
}: {
  id: string;
  nome: string;
  setor: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
}) {
  const t = ptBr.negociar.pmesOnChain;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-soft ring-2 ring-salmon">
      <OfertaBanner bannerUrl={bannerUrl} logoUrl={logoUrl} nomeFantasia={nome} categoria="pmes" size="card" />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-salmon px-3 py-1 text-xs font-semibold text-on-salmon">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t.selo}
        </span>

        <div>
          <h3 className="text-sm font-semibold text-ink">{nome}</h3>
          {setor && <p className="text-xs text-ink-muted">{setor}</p>}
        </div>

        <p className="text-xs font-medium italic text-ink-muted">{t.dadosDoEmissor}</p>

        <Link
          href={`/negociar/oferta/${id}`}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-military px-4 py-2 text-sm font-medium text-on-military transition-colors hover:bg-military-600"
        >
          {t.verOferta}
        </Link>
      </div>
    </div>
  );
}
