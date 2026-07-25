import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { ShowcaseCard } from "./ShowcaseCard";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfertasByCategoria } from "@/lib/mock/ofertas";

// Template reutilizado pelas 5 rotas de categoria (/negociar/token-pmes,
// token-agro, token-imobiliario, token-auto, titulos-de-divida) — muda só
// o ícone/acento/conteúdo, via `categoria`.
export function CategoryPage({ categoria }: { categoria: TokenCategory }) {
  const t = ptBr.negociar.categorias[categoria];
  const tt = ptBr.negociar.categoriaTemplate;
  const ofertas = getOfertasByCategoria(categoria);

  return (
    <main className="flex flex-1 flex-col bg-military">
      <div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
        <span className="font-semibold text-salmon">{ptBr.negociar.demoBanner.label}</span> —{" "}
        {ptBr.negociar.demoBanner.text}
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/negociar/ativos-e-tokens"
          className="text-sm font-medium text-on-military-muted transition-colors hover:text-on-military"
        >
          {tt.voltar}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <CategoryChip categoria={categoria} size="lg" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-military">
              {ptBr.ativos.categorias[categoria]}
            </h1>
            <p className="mt-1 max-w-2xl text-on-military-muted">{t.descricaoCurta}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-surface p-6 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tt.fichaTitle}</h2>
          <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-muted">{tt.lastro}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{t.lastro}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.publico}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.publicoValor}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.enquadramento}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.enquadramentoValor}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{tt.estagio}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{tt.estagioValor}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{tt.casosDeUsoTitle}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {t.casosDeUso.map((caso) => (
              <li key={caso} className="rounded-lg bg-surface p-4 text-sm text-ink shadow-soft">
                {caso}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">{tt.vitrineTitle}</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ofertas.map((oferta) => (
              <ShowcaseCard key={oferta.slug} oferta={oferta} />
            ))}
          </div>
        </div>

        <p className="mt-10 text-xs text-on-military-muted">{tt.notaRodape}</p>
      </div>
    </main>
  );
}
