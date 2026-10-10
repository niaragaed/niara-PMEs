import Link from "next/link";
import { ptBr } from "@/lib/i18n/pt-br";

/**
 * Seletor de rede da publicação — só aparece enquanto a oferta não tem nenhuma tentativa
 * registrada (`sync_status='nao_onchain'`). É navegação simples (`?rede=solana`), sem estado: a
 * rede só passa a valer de verdade quando registrarTentativa/registrarTentativaSolana gravam a
 * tentativa, e a partir daí a página segue a rede da linha (migration 0017).
 */
export function EscolhaRedePublicacao({ offeringId, atual }: { offeringId: string; atual: "sepolia" | "solana" }) {
  const t = ptBr.solana.publicar.escolhaRede;
  const base = `/empresa/ofertas/${offeringId}/publicar`;
  const opcoes = [
    { id: "sepolia" as const, href: base, label: t.sepolia },
    { id: "solana" as const, href: `${base}?rede=solana`, label: t.solana },
  ];
  return (
    <div className="border-b border-panel-border bg-military px-4 pt-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-sm font-semibold text-on-military">{t.titulo}</h2>
        <p className="mt-1 text-xs text-on-military-muted">{t.texto}</p>
        <nav aria-label={t.titulo} className="mt-4 flex gap-2 pb-4">
          {opcoes.map((o) => (
            <Link
              key={o.id}
              href={o.href}
              aria-current={atual === o.id ? "page" : undefined}
              className={
                atual === o.id
                  ? "rounded-md bg-salmon px-4 py-2 text-sm font-semibold text-on-salmon"
                  : "rounded-md border border-panel-border px-4 py-2 text-sm text-on-military hover:border-salmon"
              }
            >
              {o.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
