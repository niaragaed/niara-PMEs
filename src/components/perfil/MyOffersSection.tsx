import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ptBr } from "@/lib/i18n/pt-br";
import { formatBRL } from "@/lib/format";
import type { OfferingSummary } from "@/app/perfil/actions";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Resumo, não-CRUD: só lê as ofertas REAIS da empresa logada (via
// loadMyOfferingsSummary, filtrado por accountId no servidor) e linka para
// /empresa/ofertas, onde criação/ativação/fechamento acontecem de verdade.
// Só renderizado para issuers (ver PerfilPage) — investidor não tem ofertas.
export function MyOffersSection({ offerings }: { offerings: OfferingSummary[] }) {
  const t = ptBr.perfil.minhasOfertas;

  return (
    <section id="minhas-ofertas" aria-labelledby="minhas-ofertas-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="minhas-ofertas-heading" className="text-xl font-semibold text-on-military">
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-on-military-muted">{t.subtitle}</p>
        </div>
        <Link
          href="/empresa/ofertas"
          className="inline-flex items-center gap-1.5 rounded-full bg-salmon px-4 py-2 text-sm font-medium text-on-salmon hover:bg-salmon-600"
        >
          {t.gerenciarBotao}
        </Link>
      </div>

      <div className="mt-6">
        {offerings.length === 0 ? (
          <p className="rounded-lg border border-panel-border bg-panel p-5 text-sm text-on-military-muted">
            {t.vazio}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {offerings.map((offering) => (
              <li key={offering.id}>
                <Link
                  href="/empresa/ofertas"
                  className="flex items-center gap-4 rounded-lg border border-panel-border bg-panel p-4 transition-colors hover:border-salmon"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-on-military">
                        {formatBRL(offering.base_cap_cents / 100)}
                      </p>
                      <span className="rounded-full border border-panel-border bg-military-600/40 px-3 py-1 text-xs font-medium text-on-military">
                        {ptBr.empresaOfertas.status[offering.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-military-muted">
                      {t.card.criadaEm} {formatDate(offering.created_at)} · {t.card.metaMinima}{" "}
                      {formatBRL(offering.target_min_cents / 100)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-on-military-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
