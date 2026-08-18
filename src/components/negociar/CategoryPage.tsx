import Link from "next/link";
import { CategoryChip } from "./CategoryChip";
import { ShowcaseCard } from "./ShowcaseCard";
import { PmesOnChainCard } from "./PmesOnChainCard";
import { RealOfferCard } from "./RealOfferCard";
import { ptBr } from "@/lib/i18n/pt-br";
import type { TokenCategory } from "@/lib/mock/ativos";
import { getOfertasByCategoria } from "@/lib/mock/ofertas";
import { getOnChainIndexBySlug } from "@/lib/mock/ofertasOnChain";
import { getOfertaAssetPaths } from "@/lib/negociar/ofertaAssets";
import { resolveAccount } from "@/lib/auth/resolveInvestor";
import { loadActiveOfferingsByCategory } from "@/lib/investments";

// Template reutilizado pelas 5 rotas de categoria (/negociar/token-pmes,
// token-agro, token-imobiliario, token-auto, titulos-de-divida) — muda só
// o ícone/acento/conteúdo, via `categoria`.
//
// REGRA DE OURO: visitante anônimo (sem sessão) vê exatamente a tela de
// sempre — só os exemplos fictícios, nenhuma query ao banco. As ofertas
// REAIS desta categoria só são buscadas quando resolveAccount() confirma
// role === "investor"; sem isso, ofertasReais fica [] e a seção nem
// renderiza. Este componente segue sendo público (nenhum redirect) —
// diferente de /investir, que exige login para a rota inteira.
//
// Um issuer logado NÃO entra no ramo acima (role !== "investor"), mas vê a
// PRÓPRIA oferta ativa nesta categoria (ofertasProprias), filtrada no banco
// por issuer_id = accountId (loadActiveOfferingsByCategory) — nunca ofertas
// de outras empresas. As duas listas (ofertasReais/ofertasProprias) nunca
// têm conteúdo ao mesmo tempo, já que role é ou "investor" ou "issuer".
export async function CategoryPage({ categoria }: { categoria: TokenCategory }) {
  const t = ptBr.negociar.categorias[categoria];
  const tt = ptBr.negociar.categoriaTemplate;
  const ofertas = getOfertasByCategoria(categoria);

  const { role, accountId } = await resolveAccount();
  const ofertasReais = role === "investor" ? await loadActiveOfferingsByCategory(categoria) : [];
  const ofertasProprias =
    role === "issuer" && accountId ? await loadActiveOfferingsByCategory(categoria, accountId) : [];

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

        {ofertasReais.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-on-military">{tt.ofertasReaisTitle}</h2>
            <p className="mt-1 text-xs text-on-military-muted">{tt.ofertasReaisNota}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ofertasReais.map((oferta) => (
                <RealOfferCard key={oferta.id} oferta={oferta} />
              ))}
            </div>
          </div>
        )}

        {ofertasProprias.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-on-military">{tt.suaOfertaTitle}</h2>
            <p className="mt-1 text-xs text-on-military-muted">{tt.suaOfertaNota}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ofertasProprias.map((oferta) => (
                <RealOfferCard key={oferta.id} oferta={oferta} isOwner />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-semibold text-on-military">
            {categoria === "pmes" ? tt.vitrineTitlePmesOnChain : tt.vitrineTitle}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoria === "pmes"
              ? ofertas.map((oferta) => {
                  const onChainIndex = getOnChainIndexBySlug(oferta.slug);
                  if (onChainIndex === null) return null;
                  const assets = getOfertaAssetPaths(oferta.slug);
                  return (
                    <PmesOnChainCard
                      key={oferta.slug}
                      oferta={oferta}
                      bannerUrl={assets.bannerUrl}
                      logoUrl={assets.logoUrl}
                    />
                  );
                })
              : ofertas.map((oferta) => <ShowcaseCard key={oferta.slug} oferta={oferta} />)}
          </div>
        </div>

        <p className="mt-10 text-xs text-on-military-muted">{tt.notaRodape}</p>
      </div>
    </main>
  );
}
